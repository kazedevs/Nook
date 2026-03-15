import { useState, useEffect } from "react";
import {
  AlertTriangle,
  HardDrive,
  RefreshCw,
  ChevronRight,
  FolderOpen,
  File,
  Download,
  Monitor,
} from "lucide-react";
import { SystemInfo } from "@/types";
import { invoke } from "@tauri-apps/api/tauri";
import { formatBytes } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { useScanProgress } from "@/hooks/useScanProgress";

const QUICK_SCAN_PATHS = [
  {
    label: "scan disk",
    path: "/",
    icon: <HardDrive className="w-3.5 h-3.5" strokeWidth={1.6} />,
  },
  {
    label: "scan downloads",
    path: "~/Downloads",
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
  color: "#666",
  marginBottom: 10,
  fontFamily: "var(--font-mono, monospace)",
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };

export function Dashboard() {
  const navigate = useNavigate();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const {
    scan,
    cancel,
    scanning,
    progress,
    filesFound,
    bytesFound,
    currentPath,
    result: scanResult,
    error,
  } = useScanProgress();

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
    const saved = localStorage.getItem("nook_last_scan");
    if (saved) {
      try {
        // Removed setScanResult here
      } catch {}
    }
  }, []);

  const runScan = async (path: string, label: string) => {
    setLastScanTime(new Date());

    // Resolve ~ to actual home directory
    let resolvedPath = path;
    if (path.startsWith("~")) {
      const userHome = await invoke<string>("get_user_home");
      resolvedPath = path.replace("~", userHome);
    }

    await scan(resolvedPath, 3, true, true);
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
          style={{ width: 20, height: 20, color: "#666" }}
          strokeWidth={1.5}
        />
        <p style={{ fontSize: 12, color: "#666", ...mono }}>
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
                  color: "#666",
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
            color: "#666",
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
            <span style={{ fontSize: 10, color: "#666", ...mono }}>
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
              color: "#D4841E",
              flexShrink: 0,
              marginTop: 1,
            }}
            strokeWidth={1.6}
          />
          <div>
            <p
              style={{
                fontSize: 11,
                color: "#D4841E",
                marginBottom: 2,
                ...mono,
              }}
            >
              {isCritical ? "disk is almost full" : "running low on space"}
            </p>
            <p style={{ fontSize: 10, color: "#633806", ...mono }}>
              {formatBytes(systemInfo.available_disk_space)} remaining. scan
              disk to find what to delete.
            </p>
          </div>
        </div>
      )}

      {/* Quick scan */}
      <div style={card}>
        <p style={sectionLabel}>quick scan</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {QUICK_SCAN_PATHS.map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => runScan(path, label)}
              disabled={scanning}
              style={{
                width: "100%",
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 6,
                border: "0.5px solid #1A1A1A",
                background: scanning ? "#141414" : "transparent",
                color: scanning ? "#888" : "#777",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "var(--font-mono, monospace)",
                opacity: scanning ? 0.5 : 1,
                transition: "all 0.1s",
                padding: "12px",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {scanning ? (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "1.5px solid #333",
                      borderTopColor: "#666",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  icon
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  textAlign: "center",
                  lineHeight: 1.2,
                  fontWeight: 500,
                }}
              >
                {label.split(" ").map((word, i) => (
                  <div key={i}>{word}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {scanning && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#666", ...mono }}>
              scanning {currentPath}
            </span>
            <span style={{ fontSize: 11, color: "#666", ...mono }}>
              {progress}%
            </span>
          </div>
          <div
            style={{
              background: "#161616",
              borderRadius: 2,
              height: 2,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#2A2A2A",
                width: `${progress}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "#666",
                ...mono,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "0.5px solid #2A2A2A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#666",
                    animation: "pulse 1s infinite",
                  }}
                />
              </div>
              scanning {currentPath}…
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#3B6D11",
                ...mono,
              }}
            >
              <span>{filesFound.toLocaleString()} files</span>
              <span>{formatBytes(bytesFound)}</span>
            </div>
          </div>
        </div>
      )}

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
              <span style={{ fontSize: 9, color: "#666", ...mono }}>
                {formatBytes(scanResult.total_size)} ·{" "}
                {scanResult.file_count.toLocaleString()} files
              </span>
              <button
                onClick={() => runScan(scanResult.root_path, "refresh")}
                disabled={scanning}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
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
                    style={{ width: 10, height: 10, color: "#666" }}
                    strokeWidth={1.6}
                  />
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#666",
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
                    style={{ width: 10, height: 10, color: "#666" }}
                    strokeWidth={1.6}
                  />
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#666",
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
                <span style={{ fontSize: 11, color: "#777", ...mono }}>
                  {ins.label}
                </span>
                <span style={{ fontSize: 11, color: "#AAA", ...mono }}>
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
                color: "#666",
                marginBottom: 4,
                ...mono,
              }}
            >
              operating system
            </p>
            <p style={{ fontSize: 11, color: "#888", ...mono }}>
              {systemInfo.os_name}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#666",
                marginBottom: 4,
                ...mono,
              }}
            >
              version
            </p>
            <p style={{ fontSize: 11, color: "#888", ...mono }}>
              {systemInfo.os_version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
