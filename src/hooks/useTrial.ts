import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export interface TrialInfo {
  days_remaining: number;
  total_days: number;
}

export interface LicenseStatus {
  status: "active" | "active_offline" | "inactive" | "tampered";
  email?: string;
  trial: TrialInfo;
  can_access: boolean;
}

export function useTrial() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const status = await invoke<LicenseStatus>("get_current_license_status");
      setLicenseStatus(status);
      setError(null);
    } catch (error) {
      console.error("Failed to check license status:", error);
      setError("License check failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const activateLicense = async (licenseKey: string): Promise<boolean> => {
    try {
      const status = await invoke<LicenseStatus>("activate_license", {
        licenseKey,
      });
      setLicenseStatus(status);
      return status.can_access;
    } catch (error) {
      console.error("Failed to activate license:", error);
      setError("Failed to activate license");
      return false;
    }
  };

  // Derived state
  const daysRemaining = licenseStatus?.trial.days_remaining ?? 0;
  const isTrialActive = (licenseStatus?.trial.days_remaining ?? 0) > 0;
  const isLicensed =
    licenseStatus?.status === "active" ||
    licenseStatus?.status === "active_offline";
  const trialExpired = !isLicensed && !isTrialActive;
  const canAccess = licenseStatus?.can_access ?? false;

  // UX helper for trial banner
  const trialBanner = isTrialActive
    ? `Trial: ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`
    : null;

  return {
    licenseStatus,
    loading,
    error,
    isTrialActive,
    trialExpired,
    daysRemaining,
    isLicensed,
    canAccess,
    trialBanner,
    activateLicense,
    refreshStatus: checkStatus,
  };
}
