import { useState, useEffect } from "react";
import {
  Download,
  FolderOpen,
  Palette,
  Info,
  ExternalLink,
  CreditCard,
  Shield,
  RefreshCw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import { SystemInfo, UpdateInfo } from "@/types";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "20px",
  marginBottom: 12,
};
const lbl: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#333",
  marginBottom: 14,
  ...mono,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "0.5px solid #161616",
};
const rowLast: React.CSSProperties = { ...row, borderBottom: "none" };

const PREFS_KEY = "nook_prefs";

interface Prefs {
  ignoreHidden: boolean;
  ignoreSystem: boolean;
  defaultDepth: number;
  theme: "dark" | "light" | "system";
  autoUpdate: boolean;
  defaultPath: string;
}

const DEFAULT_PREFS: Prefs = {
  ignoreHidden: true,
  ignoreSystem: true,
  defaultDepth: 3,
  theme: "dark",
  autoUpdate: true,
  defaultPath: "",
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 42,
        height: 20,
        borderRadius: 10,
        border: `0.5px solid ${on ? "#27500A" : "#2A2A2A"}`,
        background: on ? "#0A1A08" : "#141414",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: on ? "#3B6D11" : "#2A2A2A",
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

export function Settings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [isLicensed, setIsLicensed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState("");
  const [licenseMsgOk, setLicenseMsgOk] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [activeSection, setActiveSection] = useState<string>("license");

  useEffect(() => {
    // Load persisted prefs
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
    } catch {}

    // Load real system info and user info
    Promise.all([
      invoke<SystemInfo>("get_system_info"),
      invoke<string>("get_user_home"),
    ])
      .then(([info, userHome]) => {
        setSystemInfo(info);
        setPrefs((p) => ({
          ...p,
          defaultPath: p.defaultPath || `${userHome}`,
        }));
      })
      .catch(console.error);

    // Check license
    invoke<boolean>("check_license", { licenseKey: "" })
      .then(setIsLicensed)
      .catch(console.error);
  }, []);

  const save = (updated: Partial<Prefs>) => {
    const next = { ...prefs, ...updated };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setLicenseMsg("enter a license key");
      setLicenseMsgOk(false);
      return;
    }
    setIsActivating(true);
    setLicenseMsg("");
    try {
      const ok = await invoke<boolean>("activate_license", {
        licenseKey: licenseKey.trim(),
      });
      if (ok) {
        setIsLicensed(true);
        setLicenseMsg("license activated.");
        setLicenseMsgOk(true);
        setLicenseKey("");
      } else {
        setLicenseMsg("invalid license key.");
        setLicenseMsgOk(false);
      }
    } catch (err) {
      setLicenseMsg(err instanceof Error ? err.message : "activation failed.");
      setLicenseMsgOk(false);
    } finally {
      setIsActivating(false);
    }
  };

  const setHomePath = async () => {
    try {
      const homePath = await invoke<string>("get_user_home");
      save({ defaultPath: homePath });
    } catch (err) {
      console.error("Failed to get home directory:", err);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMsg("");
    try {
      const updateInfo = await invoke<UpdateInfo>("check_for_updates");
      if (updateInfo.update_available) {
        setUpdateMsg(`update available → ${updateInfo.latest_version}`);
      } else {
        setUpdateMsg(
          `you're on the latest version (${updateInfo.current_version})`,
        );
      }
    } catch (err) {
      setUpdateMsg("failed to check for updates");
      console.error(err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const usedPct = systemInfo
    ? Math.round(
        (systemInfo.used_disk_space / systemInfo.total_disk_space) * 100,
      )
    : null;

  const SECTIONS = [
    { id: "license", label: "license", icon: Shield },
    { id: "scanning", label: "scanning", icon: FolderOpen },
    { id: "appearance", label: "appearance", icon: Palette },
    { id: "updates", label: "updates", icon: Download },
    { id: "about", label: "about", icon: Info },
  ];

  return (
    <div style={{ display: "flex", gap: 24, maxWidth: 920 }}>
      {/* Side nav */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <p style={{ ...lbl, marginBottom: 10, fontSize: 11 }}>settings</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 11px",
                borderRadius: 6,
                border: "none",
                background: activeSection === id ? "#161616" : "transparent",
                color: activeSection === id ? "#E8E6E1" : "#444",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                ...mono,
              }}
            >
              <Icon style={{ width: 14, height: 14 }} strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </div>

        {/* Disk mini widget */}
        {systemInfo && (
          <div
            style={{
              marginTop: 24,
              padding: "12px 14px",
              background: "#0F0F0F",
              border: "0.5px solid #1E1E1E",
              borderRadius: 8,
            }}
          >
            <p style={{ ...lbl, marginBottom: 10, fontSize: 10 }}>disk</p>
            <div
              style={{
                background: "#161616",
                borderRadius: 2,
                height: 4,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: usedPct! > 85 ? "#712B13" : "#2A2A2A",
                  width: `${usedPct}%`,
                  transition: "width 0.4s",
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: "#444", ...mono }}>
              {usedPct}% used
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#2A2A2A",
                marginTop: 3,
                ...mono,
              }}
            >
              {systemInfo.os_name} {systemInfo.os_version}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* LICENSE */}
        {activeSection === "license" && (
          <>
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <p style={lbl}>license status</p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    padding: "3px 10px",
                    borderRadius: 100,
                    border: `0.5px solid ${isLicensed ? "#27500A" : "#2A2A2A"}`,
                    color: isLicensed ? "#3B6D11" : "#444",
                    ...mono,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isLicensed ? "#3B6D11" : "#2A2A2A",
                      flexShrink: 0,
                    }}
                  />
                  {isLicensed ? "pro" : "free"}
                </span>
              </div>

              {isLicensed ? (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#0A1A08",
                    border: "0.5px solid #27500A",
                    borderRadius: 6,
                  }}
                >
                  <p style={{ fontSize: 11, color: "#3B6D11", ...mono }}>
                    premium features active. thanks for supporting nook.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <p style={{ fontSize: 11, color: "#333", ...mono }}>
                    scanning is free. upgrade to unlock file deletion, unlimited
                    depth, and advanced cleanup.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                      placeholder="NOOK-XXXX-XXXX-XXXX-XXXX"
                      style={{
                        flex: 1,
                        height: 32,
                        padding: "0 10px",
                        borderRadius: 6,
                        border: "0.5px solid #2A2A2A",
                        background: "#141414",
                        color: "#C8C4BE",
                        fontSize: 11,
                        outline: "none",
                        ...mono,
                      }}
                    />
                    <button
                      onClick={handleActivate}
                      disabled={isActivating}
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 6,
                        border: "0.5px solid #2A2A2A",
                        background: "#1A1A1A",
                        color: "#E8E6E1",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        opacity: isActivating ? 0.5 : 1,
                        ...mono,
                      }}
                    >
                      {isActivating ? (
                        <>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              border: "1.5px solid #333",
                              borderTopColor: "#666",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                          activating…
                        </>
                      ) : (
                        "activate"
                      )}
                    </button>
                  </div>
                  {licenseMsg && (
                    <p
                      style={{
                        fontSize: 11,
                        color: licenseMsgOk ? "#3B6D11" : "#712B13",
                        ...mono,
                      }}
                    >
                      {licenseMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isLicensed && (
              <div style={card}>
                <p style={lbl}>nook pro — $5 one-time</p>
                {[
                  "delete files and directories",
                  "unlimited scanning depth",
                  "advanced cleanup suggestions",
                  "priority support",
                ].map((f, i, arr) => (
                  <div
                    key={f}
                    style={{ ...(i < arr.length - 1 ? row : rowLast), gap: 10 }}
                  >
                    <span style={{ fontSize: 11, color: "#555", ...mono }}>
                      {f}
                    </span>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "0.5px solid #2A2A2A",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <a
                    href="https://dodo-payments.example.com/buy/nook"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 32,
                      borderRadius: 6,
                      border: "0.5px solid #2A2A2A",
                      background: "#1A1A1A",
                      color: "#E8E6E1",
                      fontSize: 11,
                      textDecoration: "none",
                      ...mono,
                    }}
                  >
                    <CreditCard
                      style={{ width: 12, height: 12 }}
                      strokeWidth={1.6}
                    />
                    buy nook pro
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* SCANNING */}
        {activeSection === "scanning" && (
          <div style={card}>
            <p style={lbl}>scanning preferences</p>

            <div style={row}>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#C8C4BE",
                    marginBottom: 2,
                    ...mono,
                  }}
                >
                  default scan location
                </p>
                <p style={{ fontSize: 10, color: "#444", ...mono }}>
                  {prefs.defaultPath || "not set"}
                </p>
              </div>
              <button
                onClick={setHomePath}
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 5,
                  border: "0.5px solid #2A2A2A",
                  background: "transparent",
                  color: "#555",
                  fontSize: 10,
                  cursor: "pointer",
                  ...mono,
                }}
              >
                set home
              </button>
            </div>

            <div style={row}>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#C8C4BE",
                    marginBottom: 2,
                    ...mono,
                  }}
                >
                  default scan depth
                </p>
                <p style={{ fontSize: 10, color: "#444", ...mono }}>
                  current: {prefs.defaultDepth}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[1, 2, 3, 5, 8].map((d) => (
                  <button
                    key={d}
                    onClick={() => save({ defaultDepth: d })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 5,
                      border: `0.5px solid ${prefs.defaultDepth === d ? "#3B6D11" : "#2A2A2A"}`,
                      background:
                        prefs.defaultDepth === d ? "#0A1A08" : "#141414",
                      color: prefs.defaultDepth === d ? "#3B6D11" : "#555",
                      fontSize: 11,
                      cursor: "pointer",
                      ...mono,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={row}>
              <p style={{ fontSize: 12, color: "#C8C4BE", ...mono }}>
                ignore hidden files
              </p>
              <Toggle
                on={prefs.ignoreHidden}
                onToggle={() => save({ ignoreHidden: !prefs.ignoreHidden })}
              />
            </div>

            <div style={rowLast}>
              <p style={{ fontSize: 12, color: "#C8C4BE", ...mono }}>
                ignore system folders
              </p>
              <Toggle
                on={prefs.ignoreSystem}
                onToggle={() => save({ ignoreSystem: !prefs.ignoreSystem })}
              />
            </div>
          </div>
        )}

        {/* APPEARANCE */}
        {activeSection === "appearance" && (
          <div style={card}>
            <p style={lbl}>appearance</p>
            <div
              style={{
                ...rowLast,
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <p style={{ fontSize: 12, color: "#C8C4BE", ...mono }}>theme</p>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                {(["dark", "light", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => save({ theme: t })}
                    style={{
                      flex: 1,
                      height: 28,
                      borderRadius: 5,
                      border: `0.5px solid ${prefs.theme === t ? "#3B6D11" : "#2A2A2A"}`,
                      background: prefs.theme === t ? "#0A1A08" : "#141414",
                      color: prefs.theme === t ? "#3B6D11" : "#555",
                      fontSize: 11,
                      cursor: "pointer",
                      ...mono,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: "#2A2A2A", ...mono }}>
                {prefs.theme === "dark"
                  ? "always dark — current active theme"
                  : prefs.theme === "light"
                    ? "light mode (not yet supported)"
                    : "follows system appearance"}
              </p>
            </div>
          </div>
        )}

        {/* UPDATES */}
        {activeSection === "updates" && (
          <div style={card}>
            <p style={lbl}>updates</p>

            <div style={row}>
              <p style={{ fontSize: 12, color: "#C8C4BE", ...mono }}>
                auto-check for updates
              </p>
              <Toggle
                on={prefs.autoUpdate}
                onToggle={() => save({ autoUpdate: !prefs.autoUpdate })}
              />
            </div>

            <div style={rowLast}>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#C8C4BE",
                    marginBottom: 2,
                    ...mono,
                  }}
                >
                  installed version
                </p>
                <p style={{ fontSize: 10, color: "#444", ...mono }}>0.1.0</p>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                style={{
                  height: 28,
                  padding: "0 12px",
                  borderRadius: 5,
                  border: "0.5px solid #2A2A2A",
                  background: "transparent",
                  color: "#666",
                  fontSize: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  opacity: checkingUpdate ? 0.5 : 1,
                  ...mono,
                }}
              >
                <RefreshCw
                  style={{
                    width: 11,
                    height: 11,
                    animation: checkingUpdate
                      ? "spin 0.8s linear infinite"
                      : "none",
                  }}
                  strokeWidth={1.6}
                />
                {checkingUpdate ? "checking…" : "check now"}
              </button>
            </div>

            {updateMsg && (
              <p
                style={{
                  fontSize: 10,
                  color: "#3B6D11",
                  marginTop: 10,
                  ...mono,
                }}
              >
                {updateMsg}
              </p>
            )}
          </div>
        )}

        {/* ABOUT */}
        {activeSection === "about" && (
          <div style={card}>
            <p style={lbl}>about nook</p>

            {[
              { k: "version", v: "0.1.0" },
              {
                k: "platform",
                v: systemInfo
                  ? `${systemInfo.os_name} ${systemInfo.os_version}`
                  : "macOS",
              },
              { k: "developer", v: "@fiynraj" },
            ].map(({ k, v }, i, arr) => (
              <div key={k} style={i < arr.length - 1 ? row : rowLast}>
                <span style={{ fontSize: 11, color: "#333", ...mono }}>
                  {k}
                </span>
                <span style={{ fontSize: 11, color: "#666", ...mono }}>
                  {v}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <a
                href="https://nookapp.pro"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  borderRadius: 5,
                  border: "0.5px solid #2A2A2A",
                  background: "transparent",
                  color: "#555",
                  fontSize: 10,
                  textDecoration: "none",
                  ...mono,
                }}
              >
                <ExternalLink
                  style={{ width: 10, height: 10 }}
                  strokeWidth={1.6}
                />
                nookapp.pro
              </a>
              <a
                href="https://x.com/fiynraj"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  borderRadius: 5,
                  border: "0.5px solid #2A2A2A",
                  background: "transparent",
                  color: "#555",
                  fontSize: 10,
                  textDecoration: "none",
                  ...mono,
                }}
              >
                <ExternalLink
                  style={{ width: 10, height: 10 }}
                  strokeWidth={1.6}
                />
                @fiynraj
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
