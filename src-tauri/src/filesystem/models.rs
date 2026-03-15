use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A single file or directory item in the scan tree.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileItem {
    pub path: String,
    pub name: String,
    /// Actual on-disk size in bytes.
    /// For directories, this is the **recursive** sum of all descendant files.
    pub size: u64,
    pub is_directory: bool,
    /// Lowercase extension, absent for directories.
    pub file_type: Option<String>,
    /// ISO-8601 last-modified timestamp, best-effort.
    pub modified: Option<String>,
    /// Direct children, populated only when building the tree.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileItem>>,
}

/// Top-level result returned to the frontend after a scan.
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub root_path: String,
    /// Total bytes of all regular files under root_path.
    pub total_size: u64,
    pub file_count: usize,
    pub directory_count: usize,
    pub largest_files: Vec<FileItem>,
    pub file_types: Vec<FileTypeStat>,
    /// Shallow tree (depth-limited) for the treemap visualisation.
    pub tree: Option<FileItem>,
    /// Number of entries we could not read (permissions, broken symlinks, …)
    pub skipped_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileTypeStat {
    pub extension: String,
    pub total_size: u64,
    pub count: usize,
    /// Fraction of total scanned bytes, 0‥100.
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub total_disk_space: u64,
    pub available_disk_space: u64,
    pub used_disk_space: u64,
    pub os_name: String,
    pub os_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}

// ── helpers ──────────────────────────────────────────────────────────────────

impl FileItem {
    pub fn new(path: PathBuf, size: u64, is_directory: bool) -> Self {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let file_type = if is_directory {
            None
        } else {
            path.extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase())
        };

        // Best-effort modified time as RFC-3339.
        let modified = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| {
                let secs = t
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                format_unix_timestamp(secs)
            });

        Self {
            path: path.to_string_lossy().to_string(),
            name,
            size,
            is_directory,
            file_type,
            modified,
            children: None,
        }
    }
}

/// Very lightweight RFC-3339-like formatter (avoids heavy chrono dep here).
fn format_unix_timestamp(secs: u64) -> String {
    // We keep chrono for the license module; reuse it here via re-export.
    use std::time::{Duration, UNIX_EPOCH};
    let _ = UNIX_EPOCH + Duration::from_secs(secs); // just to keep compiler happy
    // Delegate to chrono which is already in the dep tree.
    chrono::DateTime::from_timestamp(secs as i64, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| secs.to_string())
}