import { useState, useEffect } from "react";
import {
  AlertTriangle,
  HardDrive,
  Zap,
  RefreshCw,
  ChevronRight,
  FolderOpen,
  File,
  Home,
  Download,
  Monitor,
} from "lucide-react";
import { SystemInfo, ScanResult, ScanRequest } from "@/types";
import { invoke } from "@tauri-apps/api/tauri";
import { formatBytes } from "@/utils/format";
import { useNavigate } from "react-router-dom";

const QUICK_SCAN_PATHS = [
  {
    label: "scan disk",
    path: "/",
    icon: <HardDrive className="w-3.5 h-3.5" strokeWidth={1.6} />,
  },
  {
    label: "scan downloads",
    path: `/Users/${typeof process !== "undefined" ? (process.env?.USER ?? "") : ""}/Downloads`,
    icon: <Download className="w-3.5 h-3.5" strokeWidth={1.6} />,
  },
  {
    label: "scan applications",
    path: "/Applications",
    icon: <Monitor className="w-3.5 h-3.5" strokeWidth={1.6} />,
  },
];

const DMG_EXTS = ["dmg", "pkg", "iso"];
const VIDEO_EXTS = ["mp4", "mov", "mkv", "avi", "m4v"];
const DEV_DIRS = ["node_modules", ".cache", "DerivedData", "Pods"];

const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#333",
  marginBottom: 10,
  fontFamily: "var(--font-mono, monospace)",
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };

export function Dashboard() {
  const navigate = useNavigate();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanningLabel, setScanningLabel] = useState("");

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
    const saved = localStorage.getItem("nook_last_scan");
    if (saved) {
      try {
        setScanResult(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const runScan = async (path: string, label: string) => {
    setScanning(true);
    setScanningLabel(label);
    try {
      const result = await invoke<ScanResult>("scan_directory", {
        request: { path, max_depth: 3 } as ScanRequest,
      });
      setScanResult(result);
      localStorage.setItem("nook_last_scan", JSON.stringify(result));
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
      setScanningLabel("");
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1.5px solid #222",
            borderTopColor: "#555",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  if (!systemInfo)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
          gap: 8,
        }}
      >
        <HardDrive
          style={{ width: 20, height: 20, color: "#333" }}
          strokeWidth={1.5}
        />
        <p style={{ fontSize: 12, color: "#444", ...mono }}>
          failed to load system info
        </p>
      </div>
    );

  const usagePct =
    (systemInfo.used_disk_space / systemInfo.total_disk_space) * 100;
  const isCritical = usagePct > 95;
  const isWarning = usagePct > 85;

  const largestFolder = scanResult?.tree?.children
    ?.filter((c) => c.is_directory)
    .sort((a, b) => b.size - a.size)[0];
  const largestFile = scanResult?.largest_files?.[0];

  const dmgSize =
    scanResult?.file_types
      .filter((t) => DMG_EXTS.includes(t.extension))
      .reduce((s, t) => s + t.total_size, 0) ?? 0;
  const videoSize =
    scanResult?.file_types
      .filter((t) => VIDEO_EXTS.includes(t.extension))
      .reduce((s, t) => s + t.total_size, 0) ?? 0;
  const devSize =
    scanResult?.largest_files
      ?.filter((f) =>
        DEV_DIRS.some((d) => f.name === d || f.path.includes(`/${d}`)),
      )
      .reduce((s, f) => s + f.size, 0) ?? 0;
  const estimatedFreeable = dmgSize + videoSize + devSize;

  const insights = [
    dmgSize > 0 && { label: "disk images & installers", size: dmgSize },
    videoSize > 0 && { label: "large video files", size: videoSize },
    devSize > 0 && { label: "dev caches & node_modules", size: devSize },
  ].filter(Boolean) as { label: string; size: number }[];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 20px",
      }}
    >
      {/* Storage */}
      <div style={card}>
        <p style={sectionLabel}>storage</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { k: "total", v: formatBytes(systemInfo.total_disk_space) },
            { k: "used", v: formatBytes(systemInfo.used_disk_space) },
            {
              k: "free",
              v: formatBytes(systemInfo.available_disk_space),
              warn: isWarning,
            },
            { k: "usage", v: `${usagePct.toFixed(1)}%`, warn: isWarning },
          ].map((s) => (
            <div
              key={s.k}
              style={{
                background: "#141414",
                border: "0.5px solid #1E1E1E",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#333",
                  marginBottom: 5,
                  ...mono,
                }}
              >
                {s.k}
              </p>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: s.warn ? "#854F0B" : "#E8E6E1",
                  ...mono,
                }}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#161616",
            borderRadius: 2,
            height: 2,
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              height: "100%",
              background: isCritical
                ? "#712B13"
                : isWarning
                  ? "#633806"
                  : "#2A2A2A",
              width: `${Math.min(usagePct, 100)}%`,
              transition: "width 0.4s",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#333",
            letterSpacing: "0.04em",
            ...mono,
          }}
        >
          <span>{formatBytes(systemInfo.used_disk_space)} used</span>
          <span>{formatBytes(systemInfo.available_disk_space)} free</span>
        </div>

        {estimatedFreeable > 0 && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "0.5px solid #1A1A1A",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 10, color: "#444", ...mono }}>
              est. freeable
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#3B6D11",
                ...mono,
              }}
            >
              +{formatBytes(estimatedFreeable)}
            </span>
          </div>
        )}
      </div>

      {/* Warning */}
      {(isWarning || isCritical) && (
        <div
          style={{
            background: "#0D0900",
            border: "0.5px solid #2A1800",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
          }}
        >
          <AlertTriangle
            style={{
              width: 13,
              height: 13,
              color: "#633806",
              flexShrink: 0,
              marginTop: 1,
            }}
            strokeWidth={1.6}
          />
          <div>
            <p
              style={{
                fontSize: 11,
                color: "#854F0B",
                marginBottom: 2,
                ...mono,
              }}
            >
              {isCritical ? "disk is almost full" : "running low on space"}
            </p>
            <p style={{ fontSize: 10, color: "#3D2800", ...mono }}>
              {formatBytes(systemInfo.available_disk_space)} remaining. scan
              disk to find what to delete.
            </p>
          </div>
        </div>
      )}

      {/* Quick scan */}
      <div style={card}>
        <p style={sectionLabel}>quick scan</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {QUICK_SCAN_PATHS.map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => runScan(path, label)}
              disabled={scanning}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 10px",
                borderRadius: 6,
                border: "0.5px solid #1A1A1A",
                background: "transparent",
                color: scanning && scanningLabel === label ? "#666" : "#555",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "var(--font-mono, monospace)",
                opacity: scanning ? 0.5 : 1,
                transition: "all 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {scanning && scanningLabel === label ? (
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      border: "1.5px solid #333",
                      borderTopColor: "#666",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  icon
                )}
                {label}
              </div>
              <ChevronRight
                style={{ width: 11, height: 11, color: "#222" }}
                strokeWidth={1.6}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Last scan */}
      {scanResult && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <p style={sectionLabel}>last scan</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 9, color: "#333", ...mono }}>
                {formatBytes(scanResult.total_size)} ·{" "}
                {scanResult.file_count.toLocaleString()} files
              </span>
              <button
                onClick={() => runScan(scanResult.root_path, "refresh")}
                disabled={scanning}
                style={{
                  background: "none",
                  border: "none",
                  color: "#333",
                  cursor: "pointer",
                  padding: 0,
                  opacity: scanning ? 0.4 : 1,
                }}
              >
                <RefreshCw
                  style={{ width: 11, height: 11 }}
                  strokeWidth={1.6}
                />
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {largestFolder && (
              <div
                style={{
                  background: "#141414",
                  border: "0.5px solid #1E1E1E",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 6,
                  }}
                >
                  <FolderOpen
                    style={{ width: 10, height: 10, color: "#333" }}
                    strokeWidth={1.6}
                  />
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#333",
                      ...mono,
                    }}
                  >
                    largest folder
                  </p>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#C8C4BE",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                    ...mono,
                  }}
                >
                  {largestFolder.name}
                </p>
                <p style={{ fontSize: 10, color: "#444", ...mono }}>
                  {formatBytes(largestFolder.size)}
                </p>
              </div>
            )}
            {largestFile && (
              <div
                style={{
                  background: "#141414",
                  border: "0.5px solid #1E1E1E",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 6,
                  }}
                >
                  <File
                    style={{ width: 10, height: 10, color: "#333" }}
                    strokeWidth={1.6}
                  />
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#333",
                      ...mono,
                    }}
                  >
                    largest file
                  </p>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#C8C4BE",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                    ...mono,
                  }}
                >
                  {largestFile.name}
                </p>
                <p style={{ fontSize: 10, color: "#444", ...mono }}>
                  {formatBytes(largestFile.size)}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/scanner")}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: 6,
              border: "0.5px solid #1E1E1E",
              background: "transparent",
              fontSize: 10,
              color: "#444",
              fontFamily: "var(--font-mono, monospace)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              letterSpacing: "0.04em",
            }}
          >
            view full results
            <ChevronRight style={{ width: 10, height: 10 }} strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div style={card}>
          <p style={sectionLabel}>possible to free</p>
          <div>
            {insights.map((ins, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom:
                    i < insights.length - 1 ? "0.5px solid #161616" : "none",
                }}
              >
                <span style={{ fontSize: 11, color: "#555", ...mono }}>
                  {ins.label}
                </span>
                <span style={{ fontSize: 11, color: "#888", ...mono }}>
                  {formatBytes(ins.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System */}
      <div style={card}>
        <p style={sectionLabel}>system</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#333",
                marginBottom: 4,
                ...mono,
              }}
            >
              os
            </p>
            <p style={{ fontSize: 11, color: "#666", ...mono }}>
              {systemInfo.os_name}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#333",
                marginBottom: 4,
                ...mono,
              }}
            >
              version
            </p>
            <p style={{ fontSize: 11, color: "#666", ...mono }}>
              {systemInfo.os_version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS or index.css:
// @keyframes spin { to { transform: rotate(360deg); } }
