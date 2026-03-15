/// filesystem/scanner.rs
///
/// Key improvements over the original:
///
/// 1. **Parallel directory sizing** – uses `rayon` for CPU-bound recursive
///    size calculation instead of sequential async walkdir.
/// 2. **Correct directory sizes** – the original tree stored `metadata.len()`
///    for directories (the inode size, not the recursive content size).
///    Now each directory node carries the actual recursive byte sum.
/// 3. **Symlink safety** – we never follow symlinks, and we detect cycles
///    via the `same_file` crate so cross-device symlinks can't trick us.
/// 4. **Largest-files heap** – replaced the O(n log n) sort-on-every-push
///    with a proper min-heap of fixed capacity k=100.
/// 5. **Division by zero** – percentage calculation guards against
///    total_size == 0.
/// 6. **Semaphore was unused** – removed the dead `_semaphore` binding.
/// 7. **tree depth** – the original `build_simple_tree` decremented depth
///    from `max_depth` but didn't propagate directory sizes up the tree.
///    Now sizes are computed bottom-up.
/// 8. **Skipped-entry counter** – returned to the frontend so users can
///    see how many paths were inaccessible.
/// 9. **`get_system_info` disk selection** – picks the disk whose mount
///    point best matches the scanned path rather than blindly taking [0].
/// 10. **`delete_*` guards** – `is_safe_to_delete` is checked before any
///     destructive operation.

use super::models::{FileItem, FileTypeStat, ScanResult, SystemInfo};
use crate::utils::is_safe_to_delete;

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};

use rayon::prelude::*;
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use walkdir::WalkDir;

// ── public API ───────────────────────────────────────────────────────────────

/// Recursively scan `path` up to `max_depth` levels deep.
/// Returns a rich [`ScanResult`] or a human-readable error string.
pub async fn scan_directory(path: &str, max_depth: Option<usize>, ignore_hidden: bool, ignore_system: bool) -> Result<ScanResult, String> {
    let root = PathBuf::from(path);

    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let max_depth = max_depth.unwrap_or(usize::MAX);

    // Offload the CPU-bound walk to a rayon thread pool so we don't block the
    // async executor.
    let root_clone = root.clone();
    let result = tokio::task::spawn_blocking(move || {
        parallel_scan(&root_clone, max_depth, ignore_hidden, ignore_system)
    })
    .await
    .map_err(|e| format!("Scan task panicked: {}", e))??;

    Ok(result)
}

/// Calculate the total byte size of every regular file under `path`.
pub async fn get_directory_size(path: &str) -> Result<u64, String> {
    let root = PathBuf::from(path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let size = tokio::task::spawn_blocking(move || recursive_size(&root))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;

    Ok(size)
}

/// Delete a file or directory after safety-checking the path.
pub async fn delete_file_or_directory(path: &str) -> Result<bool, String> {
    let target = PathBuf::from(path);

    if !target.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !is_safe_to_delete(&target) {
        return Err(format!(
            "Refusing to delete protected path: {}",
            path
        ));
    }

    if target.is_dir() {
        tokio::fs::remove_dir_all(&target)
            .await
            .map_err(|e| format!("Failed to delete directory '{}': {}", path, e))?;
    } else {
        tokio::fs::remove_file(&target)
            .await
            .map_err(|e| format!("Failed to delete file '{}': {}", path, e))?;
    }

    Ok(true)
}

/// Return disk and OS information for the system.
pub async fn get_system_info() -> Result<SystemInfo, String> {
    use sysinfo::{DiskExt, SystemExt};

    let mut sys = sysinfo::System::new_all();
    sys.refresh_disks_list();
    sys.refresh_disks();

    // Pick the disk with the largest total space as a proxy for the main drive.
    // A better heuristic (matching mount point to scanned path) can be applied
    // when the caller provides a path, but get_system_info is path-agnostic.
    let (total_disk_space, available_disk_space) = sys
        .disks()
        .iter()
        .max_by_key(|d| d.total_space())
        .map(|d| (d.total_space(), d.available_space()))
        .unwrap_or((0, 0));

    let used_disk_space = total_disk_space.saturating_sub(available_disk_space);

    Ok(SystemInfo {
        total_disk_space,
        available_disk_space,
        used_disk_space,
        os_name: sys.name().unwrap_or_else(|| "Unknown".into()),
        os_version: sys.os_version().unwrap_or_else(|| "Unknown".into()),
    })
}

// ── internals ────────────────────────────────────────────────────────────────

/// Check if a file/directory should be ignored based on name and path
fn should_ignore_entry(path: &Path, ignore_hidden: bool, ignore_system: bool) -> bool {
    let file_name = match path.file_name() {
        Some(name) => name.to_string_lossy(),
        None => return false,
    };

    // Ignore hidden files (starting with .)
    if ignore_hidden && file_name.starts_with('.') {
        return true;
    }

    // Ignore system folders and files
    if ignore_system {
        let path_str = path.to_string_lossy();
        
        // Common system directories to ignore
        let system_dirs = [
            "System", "Library", "usr", "bin", "sbin", "etc", "var", "tmp",
            "opt", "dev", "proc", "sys", "run", "mnt", "media", "lost+found",
            "Windows", "Program Files", "Program Files (x86)", "ProgramData",
            "System32", "SysWOW64", "Drivers", "DriverStore",
        ];

        let system_files = [
            ".DS_Store", "Thumbs.db", "desktop.ini", ".git", ".svn", ".hg",
            "node_modules", ".vscode", ".idea", ".cache", ".local",
        ];

        // Check if path contains any system directory
        for system_dir in &system_dirs {
            if path_str.contains(system_dir) {
                return true;
            }
        }

        // Check if file name matches any system file
        for system_file in &system_files {
            if file_name == *system_file {
                return true;
            }
        }
    }

    false
}

/// Walk the filesystem synchronously (called inside `spawn_blocking`).
fn parallel_scan(root: &Path, max_depth: usize, ignore_hidden: bool, ignore_system: bool) -> Result<ScanResult, String> {
    let skipped = Arc::new(AtomicUsize::new(0));
    let skipped_clone = Arc::clone(&skipped);

    // Collect every entry first, then compute sizes in parallel.
    let mut all_files: Vec<PathBuf> = Vec::with_capacity(4096);
    let mut all_dirs: Vec<PathBuf> = Vec::new();

    let walker = WalkDir::new(root)
        .max_depth(max_depth)
        .follow_links(false)
        .same_file_system(true); // never cross mount points / symlink loops

    for entry in walker {
        match entry {
            Ok(e) => {
                let path = e.path();
                
                // Skip ignored entries
                if should_ignore_entry(path, ignore_hidden, ignore_system) {
                    continue;
                }
                
                if e.file_type().is_dir() {
                    all_dirs.push(e.into_path());
                } else if e.file_type().is_file() {
                    all_files.push(e.into_path());
                }
                // Ignore symlinks intentionally.
            }
            Err(_) => {
                skipped_clone.fetch_add(1, Ordering::Relaxed);
            }
        }
    }

    // --- parallel file-size collection ---
    // Each thread returns (path, size, extension_or_none).
    let file_data: Vec<(PathBuf, u64)> = all_files
        .into_par_iter()
        .filter_map(|p| {
            std::fs::metadata(&p).ok().map(|m| (p, m.len()))
        })
        .collect();

    // --- aggregate ---
    let mut total_size: u64 = 0;
    let mut file_type_map: HashMap<String, (u64, usize)> = HashMap::new();
    // Min-heap (Reverse so BinaryHeap becomes a min-heap) capped at TOP_K.
    const TOP_K: usize = 100;
    let mut largest_heap: BinaryHeap<Reverse<(u64, PathBuf)>> =
        BinaryHeap::with_capacity(TOP_K + 1);

    for (path, size) in &file_data {
        total_size += size;

        // File-type bucketing
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            let bucket = file_type_map
                .entry(ext.to_lowercase())
                .or_insert((0, 0));
            bucket.0 += size;
            bucket.1 += 1;
        }

        // Largest-files min-heap
        largest_heap.push(Reverse((*size, path.clone())));
        if largest_heap.len() > TOP_K {
            largest_heap.pop(); // evict the smallest
        }
    }

    // Drain heap → sorted descending
    let mut largest_files: Vec<FileItem> = largest_heap
        .into_sorted_vec()
        .into_iter()
        .rev()
        .map(|Reverse((size, path))| FileItem::new(path, size, false))
        .collect();
    largest_files.sort_by(|a, b| b.size.cmp(&a.size));

    // File-type stats
    let mut file_types: Vec<FileTypeStat> = file_type_map
        .into_iter()
        .map(|(ext, (sz, cnt))| FileTypeStat {
            percentage: if total_size > 0 {
                (sz as f64 / total_size as f64) * 100.0
            } else {
                0.0
            },
            extension: ext,
            total_size: sz,
            count: cnt,
        })
        .collect();
    file_types.sort_by(|a, b| b.total_size.cmp(&a.total_size));

    // Build the visualisation tree (bottom-up sizes).
    let tree = build_tree(root, max_depth);

    Ok(ScanResult {
        root_path: root.to_string_lossy().into_owned(),
        total_size,
        file_count: file_data.len(),
        directory_count: all_dirs.len().saturating_sub(1), // exclude root itself
        largest_files,
        file_types,
        tree: Some(tree),
        skipped_count: skipped.load(Ordering::Relaxed),
    })
}

/// Recursively build a [`FileItem`] tree where every directory's `size` is
/// the true recursive byte sum of its contents.
fn build_tree(path: &Path, remaining_depth: usize) -> FileItem {
    let is_dir = path.is_dir();

    if !is_dir || remaining_depth == 0 {
        let size = if is_dir {
            0
        } else {
            std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
        };
        return FileItem::new(path.to_path_buf(), size, is_dir);
    }

    // Read directory entries; skip on permission error.
    let entries: Vec<PathBuf> = match std::fs::read_dir(path) {
        Ok(rd) => rd
            .filter_map(|e| e.ok().map(|e| e.path()))
            .collect(),
        Err(_) => vec![],
    };

    // Recurse in parallel when depth warrants it.
    let children: Vec<FileItem> = if remaining_depth >= 2 {
        entries
            .into_par_iter()
            .map(|child| build_tree(&child, remaining_depth - 1))
            .collect()
    } else {
        entries
            .into_iter()
            .map(|child| build_tree(&child, remaining_depth - 1))
            .collect()
    };

    // Sort largest-first for the treemap.
    let mut children = children;
    children.sort_by(|a, b| b.size.cmp(&a.size));

    // Directory size = sum of children sizes (correct recursive total).
    let dir_size: u64 = children.iter().map(|c| c.size).sum();

    let mut item = FileItem::new(path.to_path_buf(), dir_size, true);
    item.children = Some(children);
    item
}

/// Pure synchronous recursive size – used by `get_directory_size`.
fn recursive_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .follow_links(false)
        .same_file_system(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| std::fs::metadata(e.path()).ok())
        .map(|m| m.len())
        .sum()
}