

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { invoke } from "@tauri-apps/api/tauri"

export interface TrialInfo {
  days_remaining: number
  total_days: number
}

export interface LicenseCheckResponse {
  status: "active" | "active_offline" | "inactive" | "tampered"
  email?: string
  trial: TrialInfo
  can_access: boolean
}

interface LicenseContextValue {
  status: LicenseCheckResponse | null
  loading: boolean
  isLicensed: boolean
  isTrialActive: boolean
  daysRemaining: number
  canAccess: boolean
  showPaywall: boolean
  trialBanner: string | null
  activate: (key: string) => Promise<LicenseCheckResponse>
  refresh: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextValue | null>(null)

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseCheckResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const resp = await invoke<LicenseCheckResponse>("get_current_license_status")
      setStatus(resp)
    } catch (e) {
      console.error("license check failed:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Start trial on mount (idempotent).
    invoke("start_trial").catch(console.error)
    refresh()
  }, [refresh])

  // Fix for issue #8: activate returns LicenseCheckResponse, not bool.
  const activate = useCallback(async (key: string): Promise<LicenseCheckResponse> => {
    const resp = await invoke<LicenseCheckResponse>("activate_license", { licenseKey: key })
    // Fix for issue #13: set state directly from the response — no re-invoke needed.
    setStatus(resp)
    return resp
  }, [])

  const isLicensed    = status?.status === "active" || status?.status === "active_offline"
  const isTrialActive = (status?.trial.days_remaining ?? 0) > 0
  const daysRemaining = status?.trial.days_remaining ?? 0
  const canAccess     = status?.can_access ?? false
  const showPaywall   = !loading && !canAccess

  const trialBanner = isTrialActive && !isLicensed
    ? `trial: ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
    : null

  return (
    <LicenseContext.Provider value={{
      status, loading, isLicensed, isTrialActive,
      daysRemaining, canAccess, showPaywall, trialBanner,
      activate, refresh,
    }}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense() {
  const ctx = useContext(LicenseContext)
  if (!ctx) throw new Error("useLicense must be used inside <LicenseProvider>")
  return ctx
}