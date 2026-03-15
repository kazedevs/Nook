/// filesystem/analysis.rs
///
/// Three high-value analysis features:
/// 1. Duplicate file finder — SHA-256 content hashing, grouped by hash
/// 2. Old large files — files above size threshold not accessed in N days  
/// 3. Developer junk — well-known dev cache paths with real size calculation

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use rayon::prelude::*;
use sha2::{Sha256, Digest};
use std::io::Read;

// ── shared types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DuplicateGroup {
    pub hash: String,
    pub size: u64,               // size of ONE file (all are identical)
    pub total_wasted: u64,       // size * (count - 1)
    pub files: Vec<DuplicateFile>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DuplicateFile {
    pub path: String,
    pub name: String,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OldLargeFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub last_accessed_days: u64,
    pub modified: Option<String>,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DevJunkItem {
    pub path: String,
    pub name: String,
    pub kind: String,       // "node_modules" | "xcode" | "docker" | etc.
    pub size: u64,
    pub safe_to_delete: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DevJunkReport {
    pub items: Vec<DevJunkItem>,
    pub total_size: u64,
    pub by_kind: HashMap<String, u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisReport {
    pub duplicate_groups: Vec<DuplicateGroup>,
    pub total_duplicate_waste: u64,
    pub old_large_files: Vec<OldLargeFile>,
    pub total_old_file_size: u64,
    pub dev_junk: DevJunkReport,
    pub total_reclaimable: u64,
}

// ── public API ────────────────────────────────────────────────────────────────

/// Run all three analyses on the given root path.
/// This is the single command the frontend calls.
pub async fn run_full_analysis(
    root: &str,
    min_duplicate_size: u64,     // skip tiny files (default 1MB)
    old_file_days: u64,          // "old" threshold in days (default 180)
    old_file_min_size: u64,      // minimum size for old files (default 50MB)
) -> Result<AnalysisReport, String> {
    let root = PathBuf::from(root);
    if !root.exists() { return Err(format!("path does not exist: {}", root.display())) }

    let root_clone = root.clone();
    let report = tokio::task::spawn_blocking(move || {
        analyse_sync(&root_clone, min_duplicate_size, old_file_days, old_file_min_size)
    })
    .await
    .map_err(|e| format!("analysis panicked: {}", e))??;

    Ok(report)
}

/// Delete a list of paths (used for duplicate cleanup, dev junk cleanup).
/// Each path is safety-checked before deletion.
pub async fn delete_paths(paths: Vec<String>) -> Result<u64, String> {
    let mut freed: u64 = 0;
    for path in &paths {
        let p = Path::new(path);
        if !crate::utils::is_safe_to_delete(p) {
            return Err(format!("refusing to delete protected path: {}", path))
        }
        let size = if p.is_dir() {
            dir_size_sync(p)
        } else {
            std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)
        };
        if p.is_dir() {
            std::fs::remove_dir_all(p).map_err(|e| format!("failed to delete {}: {}", path, e))?;
        } else {
            std::fs::remove_file(p).map_err(|e| format!("failed to delete {}: {}", path, e))?;
        }
        freed += size;
    }
    Ok(freed)
}

// ── sync internals ────────────────────────────────────────────────────────────

fn analyse_sync(
    root: &Path,
    min_dup_size: u64,
    old_days: u64,
    old_min_size: u64,
) -> Result<AnalysisReport, String> {
    // Single walk — collect everything once.
    let mut all_files: Vec<(PathBuf, u64, Option<u64>, Option<u64>)> = Vec::new(); // path, size, accessed_secs, modified_secs
    let mut dev_junk_paths: Vec<PathBuf> = Vec::new();

    let walker = WalkDir::new(root)
        .follow_links(false)
        .same_file_system(true);

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    for entry in walker {
        let entry = match entry { Ok(e) => e, Err(_) => continue };
        let name = entry.file_name().to_string_lossy().to_string();

        // Detect dev junk directories — don't recurse into them.
        if entry.file_type().is_dir() {
            if is_dev_junk_dir(&name, entry.path()) {
                dev_junk_paths.push(entry.into_path());
            }
            continue;
        }

        if !entry.file_type().is_file() { continue }

        let meta = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        let size = meta.len();

        let accessed = meta.accessed().ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        let modified = meta.modified().ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        all_files.push((entry.into_path(), size, accessed, modified));
    }

    // ── 1. Duplicate detection ────────────────────────────────────────────────
    // First pass: group by size (cheap) — only files with same size can be duplicates.
    let mut by_size: HashMap<u64, Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = HashMap::new();
    for f in &all_files {
        if f.1 >= min_dup_size {
            by_size.entry(f.1).or_default().push(f);
        }
    }

    // Second pass: hash only the size-collision groups (expensive — parallelised).
    let size_groups: Vec<Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = by_size
        .into_values()
        .filter(|g| g.len() > 1)
        .collect();

    let duplicate_groups: Vec<DuplicateGroup> = size_groups
        .par_iter()
        .flat_map(|group| {
            // Hash each file in the group.
            let mut by_hash: HashMap<String, Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = HashMap::new();
            for f in group {
                if let Ok(hash) = hash_file(&f.0) {
                    by_hash.entry(hash).or_default().push(f);
                }
            }
            by_hash.into_iter()
                .filter(|(_, files)| files.len() > 1)
                .map(|(hash, files)| {
                    let size = files[0].1;
                    let wasted = size * (files.len() as u64 - 1);
                    let dup_files = files.iter().map(|f| DuplicateFile {
                        path: f.0.to_string_lossy().into(),
                        name: f.0.file_name().unwrap_or_default().to_string_lossy().into(),
                        modified: f.3.map(format_timestamp),
                    }).collect();
                    DuplicateGroup { hash, size, total_wasted: wasted, files: dup_files }
                })
                .collect::<Vec<_>>()
        })
        .collect();

    let mut duplicate_groups = duplicate_groups;
    duplicate_groups.sort_by(|a, b| b.total_wasted.cmp(&a.total_wasted));
    let total_duplicate_waste: u64 = duplicate_groups.iter().map(|g| g.total_wasted).sum();

    // ── 2. Old large files ────────────────────────────────────────────────────
    let old_threshold_secs = old_days * 86400;
    let mut old_large_files: Vec<OldLargeFile> = all_files
        .iter()
        .filter(|(_, size, accessed, modified)| {
            if *size < old_min_size { return false }
            // Use accessed time if available, fall back to modified.
            let last_seen = accessed.or(*modified).unwrap_or(0);
            now_secs.saturating_sub(last_seen) >= old_threshold_secs
        })
        .map(|(path, size, accessed, modified)| {
            let last_seen = accessed.or(*modified).unwrap_or(0);
            let days = now_secs.saturating_sub(last_seen) / 86400;
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            OldLargeFile {
                path: path.to_string_lossy().into(),
                name: path.file_name().unwrap_or_default().to_string_lossy().into(),
                size: *size,
                last_accessed_days: days,
                modified: modified.map(format_timestamp),
                category: categorise_file(&ext),
            }
        })
        .collect();

    old_large_files.sort_by(|a, b| b.size.cmp(&a.size));
    old_large_files.truncate(50);
    let total_old_file_size: u64 = old_large_files.iter().map(|f| f.size).sum();

    // ── 3. Developer junk ─────────────────────────────────────────────────────
    let dev_items: Vec<DevJunkItem> = dev_junk_paths
        .par_iter()
        .map(|path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy().into();
            let kind = dev_junk_kind(path);
            let size = dir_size_sync(path);
            DevJunkItem {
                path: path.to_string_lossy().into(),
                name,
                kind,
                size,
                safe_to_delete: true,
            }
        })
        .collect();

    let mut dev_items = dev_items;
    dev_items.sort_by(|a, b| b.size.cmp(&a.size));

    let mut by_kind: HashMap<String, u64> = HashMap::new();
    for item in &dev_items {
        *by_kind.entry(item.kind.clone()).or_insert(0) += item.size;
    }
    let dev_total: u64 = dev_items.iter().map(|i| i.size).sum();

    let total_reclaimable = total_duplicate_waste + total_old_file_size + dev_total;

    Ok(AnalysisReport {
        duplicate_groups,
        total_duplicate_waste,
        old_large_files,
        total_old_file_size,
        dev_junk: DevJunkReport { items: dev_items, total_size: dev_total, by_kind },
        total_reclaimable,
    })
}

// ── helpers ───────────────────────────────────────────────────────────────────

/// SHA-256 of the full file content.
/// Uses a 64KB buffer to avoid loading large files into memory.
fn hash_file(path: &Path) -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 { break }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn dir_size_sync(path: &Path) -> u64 {
    WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn is_dev_junk_dir(name: &str, path: &Path) -> bool {
    matches!(name,
        "node_modules" | ".npm" | ".pnpm-store" | ".yarn" | ".cache" |
        "DerivedData" | "Archives" | "iOS DeviceSupport" |
        "__pycache__" | ".pytest_cache" | ".mypy_cache" |
        "target" | ".cargo" |
        ".gradle" | "build" |
        ".terraform"
    ) || path.to_string_lossy().contains("com.apple.dt.Xcode")
      || path.to_string_lossy().contains("Library/Caches/")
}

fn dev_junk_kind(path: &Path) -> String {
    let s = path.to_string_lossy();
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
    if name == "node_modules"                     { return "node_modules".into() }
    if name == ".npm" || name == ".pnpm-store" || name == ".yarn" { return "package_manager".into() }
    if name == "deriveddata" || s.contains("Xcode") { return "xcode".into() }
    if name == "__pycache__" || name == ".pytest_cache" { return "python".into() }
    if name == "target" || name == ".cargo"       { return "rust".into() }
    if name == ".gradle" || name == "build"       { return "gradle".into() }
    if s.contains("Library/Caches")               { return "system_cache".into() }
    "other".into()
}

fn categorise_file(ext: &str) -> String {
    match ext {
        "dmg" | "pkg" | "iso" | "img"            => "Installer".into(),
        "mp4" | "mov" | "mkv" | "avi" | "m4v"   => "Video".into(),
        "zip" | "tar" | "gz" | "rar" | "7z"      => "Archive".into(),
        "pdf" | "doc" | "docx"                    => "Document".into(),
        "jpg" | "jpeg" | "png" | "heic"           => "Image".into(),
        _                                         => "File".into(),
    }
}

fn format_timestamp(secs: u64) -> String {
    chrono::DateTime::from_timestamp(secs as i64, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| secs.to_string())
}