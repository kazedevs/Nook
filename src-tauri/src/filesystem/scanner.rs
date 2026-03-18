use super::models::{FileItem, FileTypeStat, ScanResult, SystemInfo};
use crate::utils::is_safe_to_delete;
use crate::commands::ScanProgressEvent;

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc,
    },
};
use tauri::{AppHandle, Manager};
use rayon::prelude::*;
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use walkdir::{DirEntry, WalkDir};

// ── directory names that should be skipped entirely (not recursed into) ──────
// These are matched ONLY against the entry's own name, never the full path,
// so /Users/kaze/my-node-project/src/index.ts is never accidentally excluded.
const SKIP_DIR_NAMES: &[&str] = &[
    // JS / Node
    "node_modules",
    ".npm",
    ".pnpm-store",
    ".yarn",
    // Rust
    ".cargo",
    // Python
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "venv",
    ".venv",
    // Xcode / Apple
    "DerivedData",
    "iOS DeviceSupport",
    // Version control (we count the dir itself but don't recurse — it's noise)
    ".git",
    // IDE
    ".idea",
    ".vscode",
    // Android / Gradle
    ".gradle",
    // Terraform
    ".terraform",
];

// Hidden directory NAMES that are likely pure caches / config noise.
// We skip recursing into these when ignore_hidden is true.
// We do NOT skip hidden FILES — a 4GB .dmg sitting in ~ should appear.
const SKIP_HIDDEN_DIR_NAMES: &[&str] = &[
    ".cache",
    ".Trash",
    ".Spotlight-V100",
    ".fseventsd",
    ".DocumentRevisions-V100",
    ".TemporaryItems",
];

fn should_skip_dir(entry: &DirEntry, ignore_hidden: bool, ignore_system: bool) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    let name = entry.file_name().to_string_lossy();

    // Always skip known dev-junk directories by exact name match.
    if SKIP_DIR_NAMES.iter().any(|&s| name == s) {
        return true;
    }

    // When ignore_hidden: skip known hidden cache directories (not all dotfiles).
    if ignore_hidden && name.starts_with('.') {
        if SKIP_HIDDEN_DIR_NAMES.iter().any(|&s| name == s) {
            return true;
        }
    }

    // When ignore_system: skip OS-protected paths.
    if ignore_system && !is_safe_to_delete(entry.path()) {
        return true;
    }

    false
}

// ── public API ────────────────────────────────────────────────────────────────

pub async fn scan_directory(
    path: &str,
    max_depth: Option<usize>,
    ignore_hidden: bool,
    ignore_system: bool,
    app: Option<AppHandle>,
    cancel: Option<Arc<AtomicBool>>,
) -> Result<ScanResult, String> {
    let root = PathBuf::from(path);
    if !root.exists() { return Err(format!("path does not exist: {}", path)) }
    if !root.is_dir()  { return Err(format!("not a directory: {}", path)) }

    let max_depth  = max_depth.unwrap_or(usize::MAX).min(64);
    let root_clone = root.clone();
    let cancel     = cancel.unwrap_or_else(|| Arc::new(AtomicBool::new(false)));

    let result = tokio::task::spawn_blocking(move || {
        scan_sync(&root_clone, max_depth, ignore_hidden, ignore_system, app, cancel)
    })
    .await
    .map_err(|e| format!("scan panicked: {}", e))??;

    Ok(result)
}

// ── core sync scan (runs in spawn_blocking) ───────────────────────────────────

fn scan_sync(
    root: &Path,
    max_depth: usize,
    ignore_hidden: bool,
    ignore_system: bool,
    app: Option<AppHandle>,
    cancel: Arc<AtomicBool>,
) -> Result<ScanResult, String> {
    let skipped = Arc::new(AtomicUsize::new(0));

    // ── Phase 1: Walk ─────────────────────────────────────────────────────────
    // entries: (path, size_bytes, is_dir)
    // We use WalkDir's filter_entry to prune entire subtrees — this avoids
    // even opening those directories, which is the real performance win.
    let mut entries: Vec<(PathBuf, u64, bool)> = Vec::with_capacity(16_384);
    let mut walk_file_count: usize = 0;
    let mut walk_byte_count: u64   = 0;
    let mut last_emit: usize = 0;

    let walker = WalkDir::new(root)
        .max_depth(max_depth)
        .follow_links(false)
        .same_file_system(true)
        .into_iter()
        .filter_entry(|e| {
            // filter_entry prunes the subtree — children are never visited.
            !should_skip_dir(e, ignore_hidden, ignore_system)
        });

    for result in walker {
        // Honour cancellation every entry.
        if cancel.load(Ordering::Relaxed) {
            return Err("scan cancelled".into());
        }

        let entry = match result {
            Ok(e)  => e,
            Err(_) => { skipped.fetch_add(1, Ordering::Relaxed); continue }
        };

        let meta = match entry.metadata() {
            Ok(m)  => m,
            Err(_) => { skipped.fetch_add(1, Ordering::Relaxed); continue }
        };

        let is_dir = meta.is_dir();
        let size   = if is_dir { 0 } else { meta.len() };

        // Hidden FILES (not dirs) — skip only when ignore_hidden AND the file
        // is truly just a dotfile with no meaningful size. We keep large hidden
        // files (e.g. .DS_Store is tiny and fine to skip, but .android/avd is
        // handled at the dir level already). Simple rule: skip hidden files
        // under 1 MB when ignore_hidden is set.
        if ignore_hidden
            && !is_dir
            && entry.file_name().to_string_lossy().starts_with('.')
            && size < 1_048_576
        {
            continue;
        }

        entries.push((entry.into_path(), size, is_dir));

        if !is_dir {
            walk_file_count += 1;
            walk_byte_count = walk_byte_count.saturating_add(size);
        }

        // Emit progress every 500 entries — cheap, doesn't affect throughput.
        let total = entries.len();
        if total - last_emit >= 500 {
            last_emit = total;
            if let Some(ref handle) = app {
                let pct = progress_estimate(walk_file_count, walk_byte_count);
                let _ = handle.emit_all("scan_progress", ScanProgressEvent {
                    path: root.to_string_lossy().into(),
                    files_found: walk_file_count,
                    dirs_found:  total - walk_file_count,
                    bytes_found: walk_byte_count,
                    pct,
                });
            }
        }
    }

    if cancel.load(Ordering::Relaxed) {
        return Err("scan cancelled".into());
    }

    // ── Phase 2: Parallel aggregation ────────────────────────────────────────
    const TOP_K: usize = 100;

    let file_refs: Vec<&(PathBuf, u64, bool)> = entries
        .iter()
        .filter(|(_, _, d)| !d)
        .collect();

    // Each rayon thread folds into its own (total, type_map, heap) triple,
    // then we merge them — zero lock contention.
    let (total_size, file_type_map, _largest_heap) = file_refs
        .par_iter()
        .fold(
            || (0u64, HashMap::<String, (u64, usize)>::new(), BinaryHeap::<Reverse<(u64, usize)>>::new()),
            |(mut total, mut types, mut heap), (path, size, _)| {
                total += size;

                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let b = types.entry(ext.to_lowercase()).or_insert((0, 0));
                    b.0 += size; b.1 += 1;
                }

                // Store index into `file_refs` instead of cloning PathBuf.
                // We reconstruct the path in the drain step below.
                // NOTE: we can't use the index directly in fold because the
                // closure doesn't have the index. Use size+path pointer as key
                // by storing the raw pointer offset — but that's unsafe.
                // Simplest correct approach: store (size, idx) where idx is
                // the position in file_refs. We need enumerate for that.
                // Switch to par_iter().enumerate() version below.
                heap.push(Reverse((*size, 0usize))); // placeholder, replaced below
                if heap.len() > TOP_K { heap.pop(); }

                (total, types, heap)
            },
        )
        .reduce(
            || (0u64, HashMap::new(), BinaryHeap::new()),
            |(mut t1, mut m1, mut h1), (t2, m2, h2)| {
                t1 += t2;
                for (k, (sz, cnt)) in m2 {
                    let e = m1.entry(k).or_insert((0, 0));
                    e.0 += sz; e.1 += cnt;
                }
                for item in h2 { h1.push(item); if h1.len() > TOP_K { h1.pop(); } }
                (t1, m1, h1)
            },
        );

    // Redo largest files properly with (size, path_idx) to avoid PathBuf clones.
    let mut largest_heap2: BinaryHeap<Reverse<(u64, usize)>> = BinaryHeap::with_capacity(TOP_K + 1);
    for (idx, (_, size, _)) in file_refs.iter().enumerate() {
        largest_heap2.push(Reverse((*size, idx)));
        if largest_heap2.len() > TOP_K { largest_heap2.pop(); }
    }

    let mut largest_files: Vec<FileItem> = largest_heap2
        .into_sorted_vec()
        .into_iter()
        .rev()
        .map(|Reverse((size, idx))| FileItem::new(file_refs[idx].0.clone(), size, false))
        .collect();
    largest_files.sort_by(|a, b| b.size.cmp(&a.size));

    let mut file_types: Vec<FileTypeStat> = file_type_map
        .into_iter()
        .map(|(ext, (sz, cnt))| FileTypeStat {
            percentage: if total_size > 0 { (sz as f64 / total_size as f64) * 100.0 } else { 0.0 },
            extension: ext, total_size: sz, count: cnt,
        })
        .collect();
    file_types.sort_by(|a, b| b.total_size.cmp(&a.total_size));

    let file_count = file_refs.len();
    let dir_count  = entries.iter().filter(|(_, _, d)| *d).count().saturating_sub(1);

    // ── Phase 3: Tree (O(n log n), not O(n²)) ────────────────────────────────
    let tree = build_tree_fast(root, &entries);

    // Final progress emit.
    if let Some(ref handle) = app {
        let _ = handle.emit_all("scan_progress", ScanProgressEvent {
            path: root.to_string_lossy().into(),
            files_found: file_count,
            dirs_found:  dir_count,
            bytes_found: total_size,
            pct: 100,
        });
    }

    Ok(ScanResult {
        root_path: root.to_string_lossy().into_owned(),
        total_size,
        file_count,
        directory_count: dir_count,
        largest_files,
        file_types,
        tree: Some(tree),
        skipped_count: skipped.load(Ordering::Relaxed),
    })
}

// ── O(n log n) tree builder ───────────────────────────────────────────────────
//
// Previous version: O(n²) — for each node, linear scan over all entries.
// This version:
//   1. Build a HashMap<ParentPath, Vec<ChildIdx>> in O(n).
//   2. Build a HashMap<DirPath, u64> of directory sizes in O(n * avg_depth).
//      avg_depth is typically 4–6, so this is effectively O(n).
//   3. Recursively assemble the tree from the maps in O(n).
//
// Total: O(n) amortised, O(n * avg_depth) worst-case — vastly better than O(n²).

fn build_tree_fast(root: &Path, entries: &[(PathBuf, u64, bool)]) -> FileItem {
    // Step 1: dir sizes — propagate each file's size to ALL ancestors.
    // Use a sorted path list so we can process bottom-up without recursion.
    let mut dir_sizes: HashMap<&Path, u64> = HashMap::with_capacity(entries.len() / 4);

    for (path, size, is_dir) in entries {
        if *is_dir || *size == 0 { continue }
        let mut cur: &Path = path;
        loop {
            let Some(parent) = cur.parent() else { break };
            *dir_sizes.entry(parent).or_insert(0) += size;
            if parent == root { break }
            cur = parent;
        }
    }

    // Step 2: children index — HashMap<parent_path, Vec<entry_index>>
    let mut children_of: HashMap<&Path, Vec<usize>> = HashMap::with_capacity(entries.len());
    for (i, (path, _, _)) in entries.iter().enumerate() {
        if path == root { continue }
        if let Some(parent) = path.parent() {
            children_of.entry(parent).or_default().push(i);
        }
    }

    // Step 3: recursive assembly — now O(n) because each entry is visited once.
    assemble_node(root, entries, &dir_sizes, &children_of, 0)
}

fn assemble_node(
    path: &Path,
    entries: &[(PathBuf, u64, bool)],
    dir_sizes: &HashMap<&Path, u64>,
    children_of: &HashMap<&Path, Vec<usize>>,
    depth: usize,
) -> FileItem {
    let is_dir = path.is_dir();

    let size = if is_dir {
        *dir_sizes.get(path).unwrap_or(&0)
    } else {
        entries.iter().find(|(p, _, _)| p == path).map(|(_, s, _)| *s).unwrap_or(0)
    };

    if !is_dir || depth > 6 {
        return FileItem::new(path.to_path_buf(), size, is_dir);
    }

    let empty = vec![];
    let child_indices = children_of.get(path).unwrap_or(&empty);

    let mut children: Vec<FileItem> = child_indices
        .iter()
        .map(|&i| {
            let (child_path, child_size, child_is_dir) = &entries[i];
            if *child_is_dir {
                assemble_node(child_path, entries, dir_sizes, children_of, depth + 1)
            } else {
                FileItem::new(child_path.clone(), *child_size, false)
            }
        })
        .collect();

    children.sort_by(|a, b| b.size.cmp(&a.size));

    let mut item = FileItem::new(path.to_path_buf(), size, true);
    item.children = Some(children);
    item
}

// ── progress estimate ─────────────────────────────────────────────────────────
// Instead of a formula that oscillates, use a sigmoid that starts fast
// and asymptotes to 95 — giving the user a sense of forward progress
// without ever falsely showing 100% before completion.
fn progress_estimate(files_seen: usize, bytes_seen: u64) -> u8 {
    // Heuristic: assume a typical home dir has ~200k files and ~50GB.
    // Scale whichever metric is further along.
    let by_files = (files_seen as f64 / 200_000.0).min(1.0);
    let by_bytes = (bytes_seen as f64 / 50_000_000_000.0_f64).min(1.0);
    let progress = by_files.max(by_bytes);
    // Sigmoid mapped to 0–95%.
    let pct = 95.0 * (1.0 - (-5.0 * progress).exp()) / (1.0 - (-5.0_f64).exp());
    pct.min(95.0) as u8
}

// ── other public functions ────────────────────────────────────────────────────

pub async fn get_directory_size(path: &str) -> Result<u64, String> {
    let root = PathBuf::from(path);
    if !root.exists() { return Err(format!("path does not exist: {}", path)) }
    let size = tokio::task::spawn_blocking(move || {
        WalkDir::new(&root)
            .follow_links(false)
            .same_file_system(true)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len())
            .sum::<u64>()
    })
    .await
    .map_err(|e| format!("task panicked: {}", e))?;
    Ok(size)
}

pub async fn delete_file_or_directory(path: &str) -> Result<bool, String> {
    let target = PathBuf::from(path);
    if !target.exists() { return Err(format!("path does not exist: {}", path)) }
    if !is_safe_to_delete(&target) {
        return Err(format!("refusing to delete protected path: {}", path))
    }
    if target.is_dir() {
        tokio::fs::remove_dir_all(&target).await
            .map_err(|e| format!("failed to delete directory: {}", e))?;
    } else {
        tokio::fs::remove_file(&target).await
            .map_err(|e| format!("failed to delete file: {}", e))?;
    }
    Ok(true)
}

pub async fn get_system_info() -> Result<SystemInfo, String> {
    use sysinfo::{DiskExt, SystemExt};
    let mut sys = sysinfo::System::new_all();
    sys.refresh_disks_list();
    sys.refresh_disks();
    let (total, avail) = sys.disks().iter()
        .max_by_key(|d| d.total_space())
        .map(|d| (d.total_space(), d.available_space()))
        .unwrap_or((0, 0));
    Ok(SystemInfo {
        total_disk_space: total,
        available_disk_space: avail,
        used_disk_space: total.saturating_sub(avail),
        os_name: sys.name().unwrap_or_else(|| "Unknown".into()),
        os_version: sys.os_version().unwrap_or_else(|| "Unknown".into()),
    })
}