/// commands.rs — additions for progress streaming and updated scan signature

use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::filesystem::{
    models::ScanResult,
    scanner::scan_directory as fs_scan,
    analysis::{run_full_analysis as fs_analysis, delete_paths as fs_delete_paths, AnalysisReport},
};

/// License commands — add/replace in commands.rs
use crate::license::{
    get_full_status, activate_license as lic_activate,
    can_access_features as lic_can_access, ensure_trial_started,
    LicenseCheckResponse,
};

/// Single command for all license state — fixes issue #6 (trial_info always populated).
#[tauri::command]
pub fn get_current_license_status() -> LicenseCheckResponse {
    get_full_status()
}

/// Fix for issue #5: explicit trial start, no side effects on reads.
#[tauri::command]
pub fn start_trial() {
    ensure_trial_started();
}

/// Fix for issue #8: returns LicenseCheckResponse not bool.
#[tauri::command]
pub async fn activate_license(license_key: String) -> Result<LicenseCheckResponse, String> {
    let key = license_key.trim().to_string();
    if key.is_empty() { return Err("license key must not be empty".into()) }
    lic_activate(&key).await
}

/// Pure read — no side effects.
#[tauri::command]
pub fn can_access_features() -> bool {
    lic_can_access()
}

/// Deprecated — kept for backwards compat, delegates to get_current_license_status.
#[tauri::command]
pub fn get_trial_status() -> LicenseCheckResponse {
    get_full_status()
}

/// Emitted to the frontend as the analysis progresses.
#[derive(Debug, Serialize, Clone)]
pub struct AnalysisProgressEvent {
    pub stage: String,           // "scanning", "duplicates", "old_files", "dev_junk"
    pub progress: u8,            // 0-100 estimate for current stage
    pub message: String,         // human-readable progress message
    pub files_processed: usize,   // total files processed so far
}

/// Emitted to the frontend as the scan progresses.
/// Frontend listens with: listen("scan_progress", handler)
#[derive(Debug, Serialize, Clone)]
pub struct ScanProgressEvent {
    pub path: String,
    pub files_found: usize,
    pub dirs_found: usize,
    pub bytes_found: u64,
    pub pct: u8,            // 0-100 estimate
}

/// Updated scan command — now accepts ignore_hidden / ignore_system flags
/// that come from the user's saved preferences in Settings.
#[tauri::command]
pub async fn scan_directory(
    request: ScanRequest,
    app: tauri::AppHandle,
) -> Result<ScanResult, String> {
    let path = request.path.trim().to_string();
    if path.is_empty() { return Err("path must not be empty".into()) }
    let p = Path::new(&path);
    if p.is_relative() { return Err("path must be absolute".into()) }
    if !p.exists()     { return Err(format!("path does not exist: {}", path)) }
    if !p.is_dir()     { return Err(format!("not a directory: {}", path)) }

    let max_depth      = Some(request.max_depth);
    let ignore_hidden  = request.ignore_hidden;
    let ignore_system  = request.ignore_system;

    // Emit a start event so the frontend can show the progress bar immediately.
    let _ = app.emit_all("scan_progress", ScanProgressEvent {
        path: path.clone(), files_found: 0, dirs_found: 0, bytes_found: 0, pct: 0,
    });

    let result = fs_scan(&path, max_depth, ignore_hidden, ignore_system, Some(app.clone()), None).await?;

    // Emit completion.
    let _ = app.emit_all("scan_progress", ScanProgressEvent {
        path: path.clone(),
        files_found: result.file_count,
        dirs_found:  result.directory_count,
        bytes_found: result.total_size,
        pct: 100,
    });

    Ok(result)
}

/// Updated ScanRequest DTO — carries the user's scan preferences.
#[derive(Debug, Deserialize)]
pub struct ScanRequest {
    pub path: String,
    pub max_depth: usize,
    pub ignore_hidden: bool,   // from Settings prefs
    pub ignore_system: bool,   // from Settings prefs
}

// Re-export the scanner functions for Tauri with command attributes
#[tauri::command]
pub async fn get_directory_size(path: String) -> Result<u64, String> {
    crate::filesystem::scanner::get_directory_size(&path).await
}

#[tauri::command]
pub async fn delete_file_or_directory(path: String) -> Result<bool, String> {
    crate::filesystem::scanner::delete_file_or_directory(&path).await
}

#[tauri::command]
pub async fn get_system_info() -> Result<crate::filesystem::models::SystemInfo, String> {
    crate::filesystem::scanner::get_system_info().await
}

// Settings and system commands
#[tauri::command]
pub async fn get_user_home() -> Result<String, String> {
    use std::env;
    match env::var("HOME") {
        Ok(home) => Ok(home),
        Err(_) => Err("Could not determine user home directory".into()),
    }
}

#[tauri::command]
pub async fn get_username() -> Result<String, String> {
    use std::env;
    match env::var("USER") {
        Ok(user) => Ok(user),
        Err(_) => match env::var("USERNAME") {
            Ok(user) => Ok(user),
            Err(_) => Err("Could not determine username".into()),
        },
    }
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("open")
            .arg("-R")
            .arg(&path)
            .output()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Failed to reveal in finder: {}", String::from_utf8_lossy(&output.stderr)));
        }
        Ok(())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("reveal_in_finder is only supported on macOS".into())
    }
}

#[tauri::command]
pub async fn open_containing_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("open")
            .arg(&path)
            .output()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Failed to open folder: {}", String::from_utf8_lossy(&output.stderr)));
        }
        Ok(())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("open_containing_folder is only supported on macOS".into())
    }
}

/// Analysis request DTO
#[derive(Debug, Deserialize)]
pub struct AnalysisRequest {
    pub root: String,
    pub min_duplicate_size_mb: Option<u64>,  // default 1
    pub old_file_days: Option<u64>,           // default 180
    pub old_file_min_size_mb: Option<u64>,    // default 50
}

/// Delete paths request DTO
#[derive(Debug, Deserialize)]
pub struct DeletePathsRequest {
    pub paths: Vec<String>,
}

/// Delete paths response DTO
#[derive(Debug, Serialize)]
pub struct DeletePathsResponse {
    pub freed_bytes: u64,
    pub deleted_count: usize,
}

/// Run analysis command - trial/license paywall
#[tauri::command]
pub async fn run_analysis(request: AnalysisRequest, app: tauri::AppHandle) -> Result<AnalysisReport, String> {
    if !crate::license::can_access_features() {
        return Err("analysis requires nook pro".into())
    }

    let root = request.root.trim().to_string();
    if root.is_empty() { return Err("root path must not be empty".into()) }

    // Emit start event
    let _ = app.emit_all("analysis_progress", AnalysisProgressEvent {
        stage: "scanning".into(),
        progress: 0,
        message: "Starting analysis...".into(),
        files_processed: 0,
    });

    fs_analysis(
        &root,
        request.min_duplicate_size_mb.unwrap_or(1) * 1024 * 1024,
        request.old_file_days.unwrap_or(180),
        request.old_file_min_size_mb.unwrap_or(50) * 1024 * 1024,
        Some(app),
    ).await
}

/// Delete paths command - trial/license paywall
#[tauri::command]
pub async fn delete_paths(request: DeletePathsRequest) -> Result<DeletePathsResponse, String> {
    if !crate::license::can_access_features() {
        return Err("delete requires nook pro".into())
    }
    if request.paths.is_empty() { return Err("no paths provided".into()) }

    let count = request.paths.len();
    let freed = fs_delete_paths(request.paths).await?;
    Ok(DeletePathsResponse { freed_bytes: freed, deleted_count: count })
}

// Update commands
#[tauri::command]
pub async fn check_for_updates() -> Result<crate::filesystem::models::UpdateInfo, String> {
    use crate::filesystem::models::UpdateInfo;
    
    let current_version = "0.1.0".to_string();
    
    // Check GitHub releases for updates
    match check_github_releases(&current_version).await {
        Ok(Some(release)) => Ok(UpdateInfo {
            current_version,
            latest_version: release.tag_name.trim_start_matches('v').to_string(),
            update_available: true,
            download_url: release.assets.first().map(|asset| asset.browser_download_url.clone()),
            release_notes: Some(release.body.unwrap_or_default()),
        }),
        Ok(None) => Ok(UpdateInfo {
            current_version: current_version.clone(),
            latest_version: current_version,
            update_available: false,
            download_url: None,
            release_notes: None,
        }),
        Err(e) => {
            eprintln!("Failed to check for updates: {}", e);
            // Return no updates on error to not break the app
            Ok(UpdateInfo {
                current_version: current_version.clone(),
                latest_version: current_version,
                update_available: false,
                download_url: None,
                release_notes: None,
            })
        }
    }
}

#[derive(serde::Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GitHubAsset>,
}

#[derive(serde::Deserialize)]
struct GitHubAsset {
    browser_download_url: String,
}

async fn check_github_releases(current_version: &str) -> Result<Option<GitHubRelease>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::builder()
        .user_agent("nook-updater")
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    
    let response = client
        .get("https://api.github.com/repos/kazedevs/Nook/releases/latest")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Err("Failed to fetch releases".into());
    }
    
    let release: GitHubRelease = response.json().await?;
    
    // Compare versions (simple string comparison for now)
    let latest_version = release.tag_name.trim_start_matches('v');
    if latest_version != current_version {
        Ok(Some(release))
    } else {
        Ok(None)
    }
}
