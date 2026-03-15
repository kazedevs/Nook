/// commands.rs – Tauri IPC command handlers.
///
/// All commands validate their inputs before delegating to domain modules,
/// so the Rust core never trusts data arriving from the JS bridge.

use crate::filesystem::{
    delete_file_or_directory as fs_delete,
    get_directory_size as fs_dir_size,
    get_system_info as fs_sysinfo,
    models::{ScanResult, SystemInfo},
    scan_directory as fs_scan,
};
use crate::license::{
    activate_license as lic_activate,
    check_license as lic_check,
    get_license_status,
    is_premium_active,
    LicenseCheckResponse,
    LicenseStatus,
};
use crate::utils::is_safe_to_delete;

use serde::{Deserialize, Serialize};
use std::path::Path;

// ── request / response DTOs ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ScanRequest {
    pub path: String,
    /// None = unlimited (the scanner itself caps at a sane default)
    pub max_depth: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
    pub freed_bytes: u64,
}

// ── commands ──────────────────────────────────────────────────────────────────

/// Start a recursive directory scan.
///
/// Validates:
/// - `path` must not be empty.
/// - `path` must be an absolute path (relative paths are a security concern).
/// - `max_depth` is silently clamped to 64 to prevent runaway recursion.
#[tauri::command]
pub async fn scan_directory(request: ScanRequest) -> Result<ScanResult, String> {
    let path = request.path.trim().to_string();

    if path.is_empty() {
        return Err("path must not be empty".into());
    }

    let p = Path::new(&path);
    if p.is_relative() {
        return Err("path must be absolute".into());
    }
    if !p.exists() {
        return Err(format!("path does not exist: {}", path));
    }
    if !p.is_dir() {
        return Err(format!("path is not a directory: {}", path));
    }

    let max_depth = request.max_depth.map(|d| d.min(64));

    fs_scan(&path, max_depth).await
}

/// Return the total byte size of a directory tree.
#[tauri::command]
pub async fn get_directory_size(path: String) -> Result<u64, String> {
    let path = path.trim().to_string();
    if path.is_empty() {
        return Err("path must not be empty".into());
    }
    if !Path::new(&path).exists() {
        return Err(format!("path does not exist: {}", path));
    }
    fs_dir_size(&path).await
}

/// Delete a file or directory, with safety checks and size reporting.
///
/// Premium gate: only available when a valid license is active.
#[tauri::command]
pub async fn delete_file_or_directory(request: DeleteRequest) -> Result<DeleteResponse, String> {
    // Premium gate - commented out for development
    // if !is_premium_active() {
    //     return Err("delete requires a Nook Pro license".into());
    // }

    let path = request.path.trim().to_string();
    if path.is_empty() {
        return Err("path must not be empty".into());
    }

    let p = Path::new(&path);
    if p.is_relative() {
        return Err("path must be absolute".into());
    }
    if !p.exists() {
        return Err(format!("path does not exist: {}", path));
    }
    if !is_safe_to_delete(p) {
        return Err(format!("refusing to delete protected path: {}", path));
    }

    // Measure size *before* deletion so we can report freed bytes.
    let freed = if p.is_dir() {
        fs_dir_size(&path).await.unwrap_or(0)
    } else {
        std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)
    };

    fs_delete(&path).await?;

    Ok(DeleteResponse {
        success: true,
        freed_bytes: freed,
    })
}

/// Return disk / OS information.
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    fs_sysinfo().await
}

// ── license commands ──────────────────────────────────────────────────────────

/// Check whether a key is valid (network call, does NOT persist).
#[tauri::command]
pub async fn check_license(license_key: String) -> Result<LicenseCheckResponse, String> {
    let key = license_key.trim().to_string();
    if key.is_empty() {
        return Ok(LicenseCheckResponse {
            status: LicenseStatus::Inactive,
            email: None,
        });
    }

    let valid = lic_check(&key).await?;
    Ok(LicenseCheckResponse {
        status: if valid {
            LicenseStatus::Active
        } else {
            LicenseStatus::Inactive
        },
        email: None,
    })
}

/// Verify a key with the server and persist it locally.
#[tauri::command]
pub async fn activate_license(license_key: String) -> Result<LicenseCheckResponse, String> {
    let key = license_key.trim().to_string();
    if key.is_empty() {
        return Err("license key must not be empty".into());
    }

    let success = lic_activate(&key).await?;
    Ok(LicenseCheckResponse {
        status: if success {
            LicenseStatus::Active
        } else {
            LicenseStatus::Inactive
        },
        email: None,
    })
}

/// Return the current license status without hitting the network.
/// Used at app startup to gate premium UI.
#[tauri::command]
pub fn get_current_license_status() -> LicenseCheckResponse {
    LicenseCheckResponse {
        status: get_license_status(),
        email: crate::license::get_stored_license().and_then(|l| l.email),
    }
}

/// Reveal a file or directory in Finder.
#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    let path = path.trim().to_string();
    if path.is_empty() {
        return Err("path must not be empty".into());
    }
    
    let p = Path::new(&path);
    if p.is_relative() {
        return Err("path must be absolute".into());
    }
    if !p.exists() {
        return Err(format!("path does not exist: {}", path));
    }

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
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("reveal_in_finder is only supported on macOS".into());
    }

    Ok(())
}

/// Open the containing folder of a file or directory.
#[tauri::command]
pub async fn open_containing_folder(path: String) -> Result<(), String> {
    let path = path.trim().to_string();
    if path.is_empty() {
        return Err("path must not be empty".into());
    }
    
    let p = Path::new(&path);
    if p.is_relative() {
        return Err("path must be absolute".into());
    }
    if !p.exists() {
        return Err(format!("path does not exist: {}", path));
    }

    let containing_folder = p.parent()
        .ok_or_else(|| "Cannot determine containing folder".to_string())?;

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("open")
            .arg(containing_folder)
            .output()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Failed to open folder: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("open_containing_folder is only supported on macOS".into());
    }

    Ok(())
}