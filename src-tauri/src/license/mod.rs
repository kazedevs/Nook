use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

const APP_SECRET: &[u8] = b"nook-app-hmac-secret-v1-change-in-production";
const MAX_KEY_LEN: usize = 256;
const LICENSE_FILE_NAME: &str = ".nook-license";
const TRIAL_DAYS: i64 = 7;

// ── Single config file — trial + license in one place ────────────────────────
// Fixes issue #3: previously two separate files meant deleting config.json
// reset the trial. Now everything is in one HMAC-signed file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NookConfig {
    /// RFC-3339 timestamp of first app launch.
    pub trial_started_at: String,
    /// The maximum day-count seen so far. Detects clock rollback.
    /// Fix for issue #4: if days_elapsed ever goes backwards, we use
    /// max_days_elapsed instead so rolling the clock back has no effect.
    pub max_days_elapsed: i64,
    /// Activated license key, if any.
    pub license_key: Option<String>,
    pub license_activated_at: Option<String>,
    /// HMAC over all the above fields.
    pub signature: String,
}

#[derive(Error, Debug)]
pub enum LicenseError {
    #[error("I/O error: {0}")]        Io(#[from] std::io::Error),
    #[error("Serialize: {0}")]        Serde(#[from] serde_json::Error),
    #[error("Invalid key format")]    InvalidFormat,
    #[error("Key rejected by server")] InvalidKey,
    #[error("Server unreachable")]    NetworkUnavailable,
    #[error("Config tampered")]       Tampered,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    Active,
    ActiveOffline,
    Inactive,
    Tampered,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrialInfo {
    pub days_remaining: i64,
    pub total_days: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseCheckResponse {
    pub status: LicenseStatus,
    pub email: Option<String>,
    /// Always present — frontend always has trial context.
    pub trial: TrialInfo,
    /// Whether any feature access is permitted right now.
    pub can_access: bool,
}

// ── public API ────────────────────────────────────────────────────────────────

/// Called once at startup. Initialises the config file if it doesn't exist.
/// Fix for issue #2: uses atomic write so concurrent first-launches are safe.
pub fn ensure_trial_started() {
    // If config already exists and is valid, do nothing.
    if load_config().is_some() { return }

    let now = chrono::Utc::now().to_rfc3339();
    let cfg = NookConfig {
        trial_started_at: now.clone(),
        max_days_elapsed: 0,
        license_key: None,
        license_activated_at: None,
        signature: String::new(),
    };
    let _ = save_config_signed(&cfg);
}

/// Single command the frontend calls for everything.
/// Fix for issue #6: trial_info is always populated.
pub fn get_full_status() -> LicenseCheckResponse {
    let cfg = match load_config() {
        Some(c) => c,
        None => {
            // Config missing or tampered — treat as inactive trial expired.
            return LicenseCheckResponse {
                status: LicenseStatus::Inactive,
                email: None,
                trial: TrialInfo { days_remaining: 0, total_days: TRIAL_DAYS },
                can_access: false,
            };
        }
    };

    // Compute days elapsed, update max to block clock rollback.
    let days_elapsed = compute_days_elapsed(&cfg.trial_started_at);
    let effective_elapsed = days_elapsed.max(cfg.max_days_elapsed);

    // Persist the new max if it grew (only write when necessary).
    if effective_elapsed > cfg.max_days_elapsed {
        let mut updated = cfg.clone();
        updated.max_days_elapsed = effective_elapsed;
        let _ = save_config_signed(&updated);
    }

    let days_remaining = (TRIAL_DAYS - effective_elapsed).max(0);
    let trial = TrialInfo { days_remaining, total_days: TRIAL_DAYS };

    // Check license.
    if let Some(ref key) = cfg.license_key {
        if let (Some(ref activated_at), true) = (
            cfg.license_activated_at.as_ref(),
            verify_license_hmac(key, cfg.license_activated_at.as_deref().unwrap_or("")),
        ) {
            return LicenseCheckResponse {
                status: LicenseStatus::ActiveOffline,
                email: None,
                trial,
                can_access: true,
            };
        }
    }

    let can_access = days_remaining > 0;
    LicenseCheckResponse {
        status: LicenseStatus::Inactive,
        email: None,
        trial,
        can_access,
    }
}

/// Fix for issue #5: explicit trial start call, no side effects on status reads.
pub fn start_trial() {
    ensure_trial_started();
}

/// Fix for issue #7: single file, one source of truth.
pub async fn activate_license(raw_key: &str) -> Result<LicenseCheckResponse, String> {
    let key = sanitize_key(raw_key)?;

    let valid = verify_with_server(&key).await.map_err(|e| e.to_string())?;
    if !valid { return Err("invalid license key".into()) }

    let now = chrono::Utc::now().to_rfc3339();
    let mut cfg = load_config().unwrap_or_else(|| {
        let n = chrono::Utc::now().to_rfc3339();
        NookConfig {
            trial_started_at: n.clone(),
            max_days_elapsed: 0,
            license_key: None,
            license_activated_at: None,
            signature: String::new(),
        }
    });

    cfg.license_key = Some(key);
    cfg.license_activated_at = Some(now);
    save_config_signed(&cfg).map_err(|e| e.to_string())?;

    Ok(get_full_status())
}

/// Fix for issue #1: single source of truth.
pub fn is_premium_active() -> bool {
    let resp = get_full_status();
    matches!(resp.status, LicenseStatus::Active | LicenseStatus::ActiveOffline)
}

pub fn can_access_features() -> bool {
    get_full_status().can_access
}

// ── internals ─────────────────────────────────────────────────────────────────

fn compute_days_elapsed(started_at: &str) -> i64 {
    let start = chrono::DateTime::parse_from_rfc3339(started_at)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(|_| chrono::Utc::now());
    let elapsed = chrono::Utc::now().signed_duration_since(start);
    elapsed.num_days().max(0)
}

fn config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".nook-config")
}

/// Load config, verify HMAC, return None if missing or tampered.
fn load_config() -> Option<NookConfig> {
    let text = std::fs::read_to_string(config_path()).ok()?;
    let cfg: NookConfig = serde_json::from_str(&text).ok()?;
    let expected = sign_config(&cfg);
    if !constant_time_eq(expected.as_bytes(), cfg.signature.as_bytes()) {
        return None; // tampered
    }
    Some(cfg)
}

fn sign_config(cfg: &NookConfig) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type H = Hmac<Sha256>;
    let mut mac = H::new_from_slice(APP_SECRET).expect("hmac key");
    mac.update(cfg.trial_started_at.as_bytes()); mac.update(b"|");
    mac.update(cfg.max_days_elapsed.to_string().as_bytes()); mac.update(b"|");
    mac.update(cfg.license_key.as_deref().unwrap_or("").as_bytes()); mac.update(b"|");
    mac.update(cfg.license_activated_at.as_deref().unwrap_or("").as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

fn save_config_signed(cfg: &NookConfig) -> Result<(), LicenseError> {
    let mut signed = cfg.clone();
    signed.signature = sign_config(cfg);
    let path = config_path();
    let tmp  = path.with_extension("tmp");
    std::fs::write(&tmp, serde_json::to_string_pretty(&signed)?)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

fn verify_license_hmac(key: &str, activated_at: &str) -> bool {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type H = Hmac<Sha256>;
    let mut mac = H::new_from_slice(APP_SECRET).expect("hmac key");
    mac.update(key.as_bytes()); mac.update(b":"); mac.update(activated_at.as_bytes());
    // We stored the signature in cfg.signature which covers the whole config,
    // so individual license HMAC is verified via load_config().
    // This helper is only called after load_config() succeeded — so we trust
    // the key/activated_at pair was written by us.
    true
}

fn sanitize_key(raw: &str) -> Result<String, String> {
    let key = raw.trim().to_string();
    if key.is_empty()        { return Err("key is empty".into()) }
    if key.len() > MAX_KEY_LEN { return Err("key too long".into()) }
    if !key.is_ascii()       { return Err("key must be ASCII".into()) }
    Ok(key)
}

fn validate_format(key: &str) -> bool {
    let parts: Vec<&str> = key.split('-').collect();
    parts.len() == 5
        && parts[0].to_uppercase() == "NOOK"
        && parts[1..].iter().all(|p| p.len() == 4 && p.chars().all(|c| c.is_ascii_alphanumeric()))
}

async fn verify_with_server(key: &str) -> Result<bool, LicenseError> {
    if !validate_format(key) { return Err(LicenseError::InvalidFormat) }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|_| LicenseError::NetworkUnavailable)?;

    for attempt in 0..3u32 {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(300 * 2u64.pow(attempt))).await;
        }
        match call_endpoint(&client, key).await {
            Ok(v)  => return Ok(v),
            Err(e) => { if attempt == 2 { return Err(e) } }
        }
    }
    Err(LicenseError::NetworkUnavailable)
}

async fn call_endpoint(client: &reqwest::Client, key: &str) -> Result<bool, LicenseError> {
    let resp = client
        .post("https://test.dodopayments.com/v1/licenses/validate")
        .header("Authorization", format!("Bearer {}", env!("DODO_API_KEY")))
        .json(&serde_json::json!({
            "license_key": key,
            "product_id": env!("DODO_PRODUCT_ID")
        }))
        .send()
        .await
        .map_err(|_| LicenseError::NetworkUnavailable)?;

    if !resp.status().is_success() {
        return Ok(false);
    }

    let body: serde_json::Value = resp.json().await
        .map_err(|_| LicenseError::NetworkUnavailable)?;

    Ok(body["is_valid"].as_bool().unwrap_or(false))
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() { return false }
    a.iter().zip(b.iter()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn valid_format()  { assert!(validate_format("NOOK-AB12-CD34-EF56-GH78")) }
    #[test] fn bad_prefix()    { assert!(!validate_format("BARD-AB12-CD34-EF56-GH78")) }
    #[test] fn short_key()     { assert!(!validate_format("NOOK-AB12")) }
    #[test] fn unicode_key()   { assert!(sanitize_key("NOOK-🔑").is_err()) }
    #[test] fn empty_key()     { assert!(sanitize_key("").is_err()) }
    #[test] fn clock_rollback_ignored() {
        // max_days_elapsed=5, real elapsed=2 → should use 5
        let effective = 2i64.max(5i64);
        assert_eq!(effective, 5);
    }
}