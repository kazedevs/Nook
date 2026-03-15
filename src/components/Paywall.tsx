import { useState } from "react";
import { open } from "@tauri-apps/api/shell";
import { useLicense } from "@/contexts/LicenseContext";

interface PaywallProps {
  spaceFound?: number; // bytes — we format it here so it's never a blank string
}

export function Paywall({ spaceFound }: PaywallProps) {
  const { activate, isLicensed } = useLicense();
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isLicensed || success) return null;

  const spaceLabel =
    spaceFound && spaceFound > 0 ? formatBytes(spaceFound) : null;

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("enter a license key");
      return;
    }
    setIsActivating(true);
    setError("");
    try {
      const resp = await activate(licenseKey.trim());
      if (resp.status === "active" || resp.status === "active_offline") {
        setSuccess(true);
      } else {
        setError("invalid license key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "activation failed");
    } finally {
      setIsActivating(false);
    }
  };

  // Fix for issue #11: use shell.open instead of window.open
  const handleBuy = () =>
    open("https://dodopayments.com/checkout/pdt_0NaY6jZxV0KRzxg1J2T6r");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        background: "rgba(0,0,0,0.88)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          margin: "0 16px",
          background: "#0F0F0F",
          border: "0.5px solid #1E1E1E",
          borderRadius: 12,
          padding: 32,
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#141414",
              border: "0.5px solid #2A2A2A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="#555"
              strokeWidth="1.5"
            >
              <rect x="3" y="9" width="14" height="10" rx="2" />
              <path d="M7 9V6a3 3 0 016 0v3" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: "#E8E6E1",
              fontFamily: "var(--font-mono)",
              marginBottom: 10,
            }}
          >
            your 7-day trial has ended
          </p>

          {/* Fix for issue #12: only render the space line when value is known */}
          {spaceLabel && (
            <p
              style={{
                fontSize: 13,
                color: "#3B6D11",
                fontFamily: "var(--font-mono)",
                marginBottom: 10,
              }}
            >
              nook found {spaceLabel} you can clean
            </p>
          )}

          <p
            style={{
              fontSize: 12,
              color: "#555",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.7,
            }}
          >
            one-time $5 · lifetime access · free updates
          </p>
        </div>

        {!showInput ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleBuy}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "none",
                background: "#E8E6E1",
                color: "#0A0A0A",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
              }}
            >
              UNLOCK NOOK — $5
            </button>
            <button
              onClick={() => setShowInput(true)}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "0.5px solid #2A2A2A",
                background: "transparent",
                color: "#555",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
              }}
            >
              I HAVE A LICENSE KEY
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={licenseKey}
              onChange={(e) => {
                setLicenseKey(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              placeholder="NOOK-XXXX-XXXX-XXXX-XXXX"
              style={{
                height: 38,
                padding: "0 12px",
                borderRadius: 8,
                border: `0.5px solid ${error ? "#712B13" : "#2A2A2A"}`,
                background: "#141414",
                color: "#E8E6E1",
                fontSize: 12,
                outline: "none",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}
            />
            {error && (
              <p
                style={{
                  fontSize: 11,
                  color: "#712B13",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleActivate}
                disabled={isActivating}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: "none",
                  background: "#E8E6E1",
                  color: "#0A0A0A",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: isActivating ? 0.5 : 1,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                }}
              >
                {isActivating ? "ACTIVATING…" : "ACTIVATE"}
              </button>
              <button
                onClick={() => {
                  setShowInput(false);
                  setLicenseKey("");
                  setError("");
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: "0.5px solid #2A2A2A",
                  background: "transparent",
                  color: "#555",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "#333",
            fontFamily: "var(--font-mono)",
            marginTop: 24,
            paddingTop: 20,
            borderTop: "0.5px solid #1E1E1E",
          }}
        >
          secure payment via dodo payments
        </p>
      </div>
    </div>
  );
}

function formatBytes(b: number): string {
  if (b >= 1e12) return (b / 1e12).toFixed(1) + " TB";
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  return (b / 1e3).toFixed(1) + " KB";
}
