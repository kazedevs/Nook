import { useLicense } from "@/contexts/LicenseContext"

export function TrialStatus() {
  const { daysRemaining, isTrialActive, isLicensed, loading } = useLicense()

  if (loading) return null

  if (isLicensed) return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "0.5px solid #27500A", color: "#3B6D11", fontFamily: "var(--font-mono)" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B6D11", flexShrink: 0, display: "inline-block" }} />
      pro
    </div>
  )

  if (isTrialActive) {
    const urgent = daysRemaining <= 2
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `0.5px solid ${urgent ? "#633806" : "#1E2A3A"}`, color: urgent ? "#854F0B" : "#185FA5", fontFamily: "var(--font-mono)" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: urgent ? "#854F0B" : "#185FA5", flexShrink: 0, display: "inline-block" }} />
        trial · {daysRemaining}d
      </div>
    )
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "0.5px solid #2A1800", color: "#712B13", fontFamily: "var(--font-mono)" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#712B13", flexShrink: 0, display: "inline-block" }} />
      trial ended
    </div>
  )
}