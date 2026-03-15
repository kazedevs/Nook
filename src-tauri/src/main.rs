//! Nook – macOS disk-usage utility
//!
//! Desktop layer: Tauri bootstrap + IPC handler registration.

#![cfg_attr(
    all(not(debug_assertions), target_os = "macos"),
    windows_subsystem = "windows"
)]

mod commands;
mod filesystem;
mod license;
mod utils;

use commands::*;

fn main() {
    // Initialise a global Rayon thread pool limited to physical cores so the
    // scanner doesn't thrash the scheduler on machines with many E-cores.
    let threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8); // cap at 8 – beyond this, I/O becomes the bottleneck

    rayon::ThreadPoolBuilder::new()
        .num_threads(threads)
        .thread_name(|i| format!("nook-worker-{}", i))
        .build_global()
        .expect("failed to build Rayon thread pool");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Filesystem
            scan_directory,
            get_directory_size,
            delete_file_or_directory,
            get_system_info,
            reveal_in_finder,
            open_containing_folder,
            // Analysis
            run_analysis,
            delete_paths,
            // Settings & System
            check_for_updates,
            get_user_home,
            get_username,
            // License
            get_current_license_status,
            start_trial,
            activate_license,
            can_access_features,
            get_trial_status,
        ])
        .setup(|_app| {
            crate::license::ensure_trial_started();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nook");
}