/// commands.rs — additions for progress streaming and updated scan signature

use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::filesystem::{
    models::ScanResult,
    scanner::scan_directory as fs_scan,
};

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

    let result = fs_scan(&path, max_depth, ignore_hidden, ignore_system).await?;

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

// License commands (stubs for now)
#[tauri::command]
pub async fn check_license() -> Result<bool, String> {
    Ok(true) // Always valid for now
}

#[tauri::command]
pub async fn activate_license(_license_key: String) -> Result<bool, String> {
    Ok(true) // Always succeeds for now
}

#[tauri::command]
pub async fn get_current_license_status() -> Result<String, String> {
    Ok("active".into()) // Always active for now
}

// Update commands (stubs for now)
#[tauri::command]
pub async fn check_for_updates() -> Result<crate::filesystem::models::UpdateInfo, String> {
    use crate::filesystem::models::UpdateInfo;
    Ok(UpdateInfo {
        current_version: "1.0.0".into(),
        latest_version: "1.0.0".into(),
        update_available: false,
        download_url: None,
        release_notes: None,
    })
}