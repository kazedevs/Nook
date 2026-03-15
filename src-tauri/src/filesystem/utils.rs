/// utils.rs – shared, stateless helpers.

use std::path::Path;

// ── deletion safety ───────────────────────────────────────────────────────────

/// Returns `true` only when it is safe for Nook to delete `path`.
///
/// We deny:
/// - macOS / Unix system roots
/// - The user's home directory itself (but not items *inside* it)
/// - Anything inside `/Volumes` that starts with a system-reserved name
/// - Empty paths or relative paths that could resolve unexpectedly
pub fn is_safe_to_delete(path: &Path) -> bool {
    // Reject relative paths – they could resolve to anything.
    if path.is_relative() {
        return false;
    }

    let path_str = path.to_string_lossy();

    // Never delete the root itself.
    if path_str == "/" {
        return false;
    }

    // System-critical prefixes on macOS / Unix.
    const BLOCKED_PREFIXES: &[&str] = &[
        "/System",
        "/Library",
        "/usr",
        "/bin",
        "/sbin",
        "/etc",
        "/var",
        "/dev",
        "/private",
        "/cores",
        "/opt",       // Homebrew prefix on Apple Silicon
        "/Network",
        "/Volumes/Recovery",
        "/Volumes/VM",
    ];

    for prefix in BLOCKED_PREFIXES {
        // Use starts_with on the string, but also verify it is actually a
        // path-component boundary (avoids matching "/Library" against
        // "/LibraryExtensions" etc.)
        if path_str == *prefix
            || path_str.starts_with(&format!("{}/", prefix))
        {
            return false;
        }
    }

    // Block the user's home directory root itself, but allow children.
    if let Some(home) = dirs::home_dir() {
        if path == home {
            return false;
        }
    }

    true
}

// ── file categorisation ───────────────────────────────────────────────────────

/// Map a lowercase file extension to a human-readable category name.
pub fn get_file_category(extension: &str) -> &'static str {
    match extension {
        // ── Code & development ──
        "js" | "jsx" | "mjs" | "cjs" => "JavaScript",
        "ts" | "tsx" => "TypeScript",
        "py" | "pyc" | "pyd" | "pyo" => "Python",
        "rs" => "Rust",
        "go" => "Go",
        "java" | "class" | "jar" => "Java",
        "cpp" | "cc" | "cxx" | "c" | "h" | "hpp" => "C/C++",
        "swift" => "Swift",
        "kt" | "kts" => "Kotlin",
        "rb" => "Ruby",
        "php" => "PHP",
        "cs" => "C#",
        "lock" | "toml" | "yaml" | "yml" | "json" | "xml" | "ini" | "cfg" | "conf" => "Config",
        "md" | "mdx" | "rst" | "txt" => "Docs / Text",
        "sh" | "bash" | "zsh" | "fish" | "ps1" => "Scripts",

        // ── Images ──
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "tif" | "webp" | "heic" | "heif"
        | "svg" | "ico" | "raw" | "cr2" | "nef" | "dng" => "Images",

        // ── Video ──
        "mp4" | "m4v" | "mov" | "avi" | "mkv" | "wmv" | "flv" | "webm" | "m2ts" => {
            "Videos"
        }

        // ── Audio ──
        "mp3" | "aac" | "wav" | "flac" | "ogg" | "m4a" | "wma" | "opus" | "aiff" => "Audio",

        // ── Documents ──
        "pdf" => "PDFs",
        "doc" | "docx" | "odt" | "rtf" => "Word Docs",
        "xls" | "xlsx" | "ods" | "csv" => "Spreadsheets",
        "ppt" | "pptx" | "odp" => "Presentations",
        "epub" | "mobi" | "azw" | "azw3" => "eBooks",

        // ── Archives ──
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "zst" | "lz4" | "lzma" => {
            "Archives"
        }
        "dmg" | "iso" | "img" => "Disk Images",
        "pkg" | "deb" | "rpm" | "msi" | "exe" | "appimage" => "Installers",

        // ── macOS / System ──
        "app" => "Applications",
        "framework" => "Frameworks",
        "dylib" | "so" | "dll" => "Libraries",
        "dsym" => "Debug Symbols",
        "log" => "Logs",
        "tmp" | "temp" | "bak" | "swp" | "swo" => "Temporary / Backups",
        "cache" => "Caches",

        // ── Fonts ──
        "ttf" | "otf" | "woff" | "woff2" | "eot" => "Fonts",

        _ => "Other",
    }
}

// ── duration formatting ───────────────────────────────────────────────────────

/// Pretty-print a duration in seconds.
/// ```
/// assert_eq!(format_duration(0), "0s");
/// assert_eq!(format_duration(90), "1m 30s");
/// assert_eq!(format_duration(3661), "1h 1m");
/// ```
pub fn format_duration(secs: u64) -> String {
    if secs == 0 {
        "0s".into()
    } else if secs < 60 {
        format!("{}s", secs)
    } else if secs < 3600 {
        format!("{}m {}s", secs / 60, secs % 60)
    } else {
        format!("{}h {}m", secs / 3600, (secs % 3600) / 60)
    }
}

// ── unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn blocks_system_roots() {
        assert!(!is_safe_to_delete(Path::new("/")));
        assert!(!is_safe_to_delete(Path::new("/System")));
        assert!(!is_safe_to_delete(Path::new("/System/Library/CoreServices")));
        assert!(!is_safe_to_delete(Path::new("/usr/local/bin")));
        assert!(!is_safe_to_delete(Path::new("/private/tmp")));
    }

    #[test]
    fn allows_user_data() {
        assert!(is_safe_to_delete(Path::new("/Users/alice/Downloads/big.zip")));
        assert!(is_safe_to_delete(Path::new(
            "/Users/alice/node_modules"
        )));
    }

    #[test]
    fn blocks_relative_paths() {
        assert!(!is_safe_to_delete(Path::new("relative/path")));
        assert!(!is_safe_to_delete(Path::new(".")));
    }

    #[test]
    fn duration_formatting() {
        assert_eq!(format_duration(0), "0s");
        assert_eq!(format_duration(45), "45s");
        assert_eq!(format_duration(90), "1m 30s");
        assert_eq!(format_duration(3661), "1h 1m");
    }

    #[test]
    fn category_known_extensions() {
        assert_eq!(get_file_category("mp4"), "Videos");
        assert_eq!(get_file_category("rs"), "Rust");
        assert_eq!(get_file_category("pdf"), "PDFs");
        assert_eq!(get_file_category("xyz"), "Other");
    }
}