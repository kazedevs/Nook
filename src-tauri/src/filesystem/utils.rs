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


// ── unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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

}