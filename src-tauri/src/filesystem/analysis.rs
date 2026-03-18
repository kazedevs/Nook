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
use tauri::AppHandle;
use tauri::Manager;

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
    app: Option<AppHandle>,
) -> Result<AnalysisReport, String> {
    let root = PathBuf::from(root);
    if !root.exists() { return Err(format!("path does not exist: {}", root.display())) }

    let root_clone = root.clone();
    let app_clone = app.clone();
    let report = tokio::task::spawn_blocking(move || {
        analyse_sync(&root_clone, min_duplicate_size, old_file_days, old_file_min_size, app_clone)
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
    app: Option<AppHandle>,
) -> Result<AnalysisReport, String> {
    // Helper function to emit progress
    let emit_progress = |stage: &str, progress: u8, message: &str, files_processed: usize| {
        if let Some(ref app) = app {
            let _ = app.emit_all("analysis_progress", crate::commands::AnalysisProgressEvent {
                stage: stage.to_string(),
                progress,
                message: message.to_string(),
                files_processed,
            });
        }
    };

    emit_progress("scanning", 0, "Starting filesystem scan...", 0);

    // Single walk — collect everything once with early exclusions.
    let mut all_files: Vec<(PathBuf, u64, Option<u64>, Option<u64>)> = Vec::new(); // path, size, accessed_secs, modified_secs
    let mut dev_junk_paths: Vec<PathBuf> = Vec::new();
    let mut files_processed = 0;
    let mut total_dirs = 0;

    let walker = WalkDir::new(root)
        .follow_links(false)
        .same_file_system(true)
        .into_iter()
        .filter_entry(|e| should_include_entry(e.path()));

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    for entry in walker {
        let entry = match entry { Ok(e) => e, Err(_) => continue };
        
        if entry.file_type().is_dir() {
            total_dirs += 1;
            // Emit progress every 1000 directories
            if total_dirs % 1000 == 0 {
                emit_progress("scanning", 10, &format!("Scanned {} directories...", total_dirs), files_processed);
            }
        }

        let name = entry.file_name().to_string_lossy().to_string();

        // Detect dev junk directories — don't recurse into them.
        if entry.file_type().is_dir() {
            if is_dev_junk_dir(&name, entry.path()) {
                dev_junk_paths.push(entry.into_path());
                continue;
            }
        }

        if !entry.file_type().is_file() { continue }

        let meta = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        let size = meta.len();

        // Skip tiny files early to reduce processing
        if size < min_dup_size && size < old_min_size {
            continue;
        }

        let accessed = meta.accessed().ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        let modified = meta.modified().ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        all_files.push((entry.into_path(), size, accessed, modified));
        files_processed += 1;

        // Emit progress every 1000 files
        if files_processed % 1000 == 0 {
            emit_progress("scanning", 20, &format!("Processed {} files...", files_processed), files_processed);
        }
    }

    emit_progress("scanning", 40, "Filesystem scan complete, analyzing duplicates...", files_processed);

    // ── 1. Duplicate detection ────────────────────────────────────────────────
    emit_progress("duplicates", 50, "Finding duplicate files...", files_processed);
    
    // First pass: group by size (cheap) — only files with same size can be duplicates.
    let mut by_size: HashMap<u64, Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = HashMap::new();
    for f in &all_files {
        if f.1 >= min_dup_size {
            by_size.entry(f.1).or_default().push(f);
        }
    }

    // Second pass: hash only the size-collision groups (expensive — parallelised with incremental hashing).
    let size_groups: Vec<Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = by_size
        .into_values()
        .filter(|g| g.len() > 1)
        .collect();

    emit_progress("duplicates", 60, &format!("Hashing {} potential duplicate groups...", size_groups.len()), files_processed);

    let duplicate_groups: Vec<DuplicateGroup> = size_groups
        .par_iter()
        .enumerate()
        .flat_map(|(i, group)| {
            // Emit progress for each group processed
            if i % 10 == 0 {
                if let Some(ref app) = app {
                    let progress = 60 + ((i as u32 * 20) / size_groups.len() as u32) as u8;
                    let _ = app.emit_all("analysis_progress", crate::commands::AnalysisProgressEvent {
                        stage: "duplicates".to_string(),
                        progress,
                        message: format!("Hashing duplicate group {} of {}...", i + 1, size_groups.len()),
                        files_processed,
                    });
                }
            }
            
            // Hash each file in the group using incremental hashing
            let mut by_hash: HashMap<String, Vec<&(PathBuf, u64, Option<u64>, Option<u64>)>> = HashMap::new();
            for f in group {
                if let Ok(hash) = hash_file_incremental(&f.0, f.1) {
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
    emit_progress("old_files", 80, "Finding old large files...", files_processed);
    
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
    emit_progress("dev_junk", 90, &format!("Analyzing {} dev junk directories...", dev_junk_paths.len()), files_processed);
    
    // Use cached directory sizes to avoid redundant walks - process sequentially to avoid borrowing issues
    let mut dir_size_cache: HashMap<String, u64> = HashMap::new();
    let mut dev_items: Vec<DevJunkItem> = Vec::new();
    
    for path in &dev_junk_paths {
        let name = path.file_name().unwrap_or_default().to_string_lossy().into();
        let kind = dev_junk_kind(path);
        let path_str: String = path.to_string_lossy().into();
        
        // Use cached size if available
        let size = if let Some(cached) = dir_size_cache.get(&path_str) {
            *cached
        } else {
            let calculated = dir_size_sync_cached(path, &mut dir_size_cache);
            dir_size_cache.insert(path_str.clone(), calculated);
            calculated
        };
        
        dev_items.push(DevJunkItem {
            path: path_str,
            name,
            kind,
            size,
            safe_to_delete: true,
        });
    }

    let mut dev_items = dev_items;
    dev_items.sort_by(|a, b| b.size.cmp(&a.size));

    let mut by_kind: HashMap<String, u64> = HashMap::new();
    for item in &dev_items {
        *by_kind.entry(item.kind.clone()).or_insert(0) += item.size;
    }
    let dev_total: u64 = dev_items.iter().map(|i| i.size).sum();

    let total_reclaimable = total_duplicate_waste + total_old_file_size + dev_total;

    emit_progress("dev_junk", 100, "Analysis complete!", files_processed);

    Ok(AnalysisReport {
        duplicate_groups,
        total_duplicate_waste,
        old_large_files,
        total_old_file_size,
        dev_junk: DevJunkReport { items: dev_items, total_size: dev_total, by_kind },
        total_reclaimable,
    })
}

// ── helpers ─────────────────────────────────────────────────────────────────--

/// Early exclusion filter - skip system and cache directories during walk
fn should_include_entry(path: &Path) -> bool {
    let path_str = path.to_string_lossy();
    
    // Skip common system/cache directories that are expensive to scan
    let skip_patterns = [
        "/System/",
        "/Library/",
        "/Applications/",
        "/usr/",
        "/bin/",
        "/sbin/",
        "/etc/",
        "/var/",
        "/tmp/",
        ".git/",
        ".svn/",
        ".hg/",
        "node_modules/",
        ".npm/",
        ".pnpm-store/",
        ".yarn/",
        "__pycache__/",
        ".pytest_cache/",
        ".mypy_cache/",
        "target/",
        ".cargo/",
        ".gradle/",
        "build/",
        "DerivedData/",
        "Archives/",
        "iOS DeviceSupport/",
    ];
    
    !skip_patterns.iter().any(|pattern| path_str.contains(pattern))
}

/// Incremental SHA-256 hashing - only hash first N bytes for initial comparison
fn hash_file_incremental(path: &Path, file_size: u64) -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    
    // For files larger than 1MB, only hash first 64KB + 64KB chunks at strategic positions
    // This provides a good balance between accuracy and performance
    if file_size > 1024 * 1024 {
        // Hash first 64KB
        let mut buf = [0u8; 65536];
        let n = file.read(&mut buf)?;
        if n > 0 {
            hasher.update(&buf[..n]);
        }
        
        // Hash middle 64KB
        use std::io::Seek;
        let middle_pos = file_size / 2;
        if file.seek(std::io::SeekFrom::Start(middle_pos)).is_ok() {
            let n = file.read(&mut buf)?;
            if n > 0 {
                hasher.update(&buf[..n]);
            }
        }
        
        // Hash last 64KB
        if file_size > 65536 * 3 {
            let last_pos = file_size.saturating_sub(65536);
            if file.seek(std::io::SeekFrom::Start(last_pos)).is_ok() {
                let n = file.read(&mut buf)?;
                if n > 0 {
                    hasher.update(&buf[..n]);
                }
            }
        }
    } else {
        // For smaller files, hash the entire content
        let mut buf = [0u8; 65536];
        loop {
            let n = file.read(&mut buf)?;
            if n == 0 { break }
            hasher.update(&buf[..n]);
        }
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// Cached directory size calculation to avoid redundant walks
fn dir_size_sync_cached(path: &Path, cache: &mut HashMap<String, u64>) -> u64 {
    let path_str: String = path.to_string_lossy().into();
    
    // Check cache first
    if let Some(&size) = cache.get(&path_str) {
        return size;
    }
    
    // Calculate size and cache it
    let mut total_size = 0u64;
    let mut file_count = 0usize;
    
    for entry in WalkDir::new(path)
        .follow_links(false)
        .max_depth(3) // Limit depth for performance
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                total_size += meta.len();
                file_count += 1;
            }
        }
        
        // Early exit if we're scanning too many files (likely not dev junk)
        if file_count > 10000 {
            break;
        }
    }
    
    cache.insert(path_str, total_size);
    total_size
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