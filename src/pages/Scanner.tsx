import { useState, useRef, useCallback, useEffect } from "react";
import {
  Scan,
  FolderOpen,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  X,
  ExternalLink,
  Trash2,
  FolderOpen as FolderOpenIcon,
  StopCircle,
} from "lucide-react";
import { ScanResult, ScanRequest, FileItem } from "@/types";
import { invoke } from "@tauri-apps/api/tauri";
import { formatBytes } from "@/utils/format";
import { Treemap } from "@/components/Treemap";
import { LargestFiles } from "@/components/LargestFiles";
import { FolderSizeChart } from "@/components/FolderSizeChart";
import { StorageBreakdown } from "@/components/StorageBreakdown";

interface SelectedItem {
  item: FileItem;
}

const SCAN_STEPS = [
  "Applications",
  "Downloads",
  "Documents",
  "Movies",
  "Projects",
  "node_modules",
  "Library",
  "Desktop",
];

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
};
const label: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#333",
  marginBottom: 10,
  ...mono,
};

export function Scanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [error, setError] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [treemapData, setTreemapData] = useState<FileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
  } | null>(null);
  const [folderTree, setFolderTree] = useState<FileItem[]>([]);
  const [quickPaths, setQuickPaths] = useState<string[]>([]);
  const [ignoreHidden, setIgnoreHidden] = useState(true);
  const [ignoreSystem, setIgnoreSystem] = useState(true);
  const scanAbortRef = useRef(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load saved preferences
        const saved = localStorage.getItem("nook_prefs");
        if (saved) {
          const prefs = JSON.parse(saved);
          if (prefs.defaultPath) {
            setSelectedPath(prefs.defaultPath);
          }
          if (prefs.defaultDepth) {
            setMaxDepth(prefs.defaultDepth);
          }
          if (prefs.ignoreHidden !== undefined) {
            setIgnoreHidden(prefs.ignoreHidden);
          }
          if (prefs.ignoreSystem !== undefined) {
            setIgnoreSystem(prefs.ignoreSystem);
          }
        }

        // Load quick paths with real user home
        const userHome = await invoke<string>("get_user_home");
        setQuickPaths([
          userHome,
          `${userHome}/Downloads`,
          `${userHome}/Documents`,
        ]);
      } catch (error) {
        console.error("Failed to load preferences:", error);
        // Fallback paths
        setQuickPaths(["/Users/you", "~/Downloads", "~/Documents"]);
      }
    };

    loadPreferences();
  }, []);

  const setUserHomePath = async () => {
    try {
      const homePath = await invoke<string>("get_user_home");
      setSelectedPath(homePath);
    } catch (error) {
      console.error("Failed to get home directory:", error);
    }
  };

  const simulateScanProgress = useCallback(async () => {
    setScanProgress(0);
    setCompletedSteps([]);
    const steps = SCAN_STEPS.slice(0, 6 + Math.floor(Math.random() * 3));
    for (let i = 0; i < steps.length; i++) {
      if (scanAbortRef.current) break;
      setScanStep(steps[i]);
      setScanProgress(Math.round((i / steps.length) * 85));
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
      setCompletedSteps((prev) => [...prev, steps[i]]);
    }
    setScanProgress(95);
  }, []);

  const handleScan = async () => {
    if (!selectedPath.trim()) {
      setError("enter a directory path");
      return;
    }
    setScanning(true);
    setError("");
    setScanResult(null);
    setSelectedItem(null);
    scanAbortRef.current = false;
    simulateScanProgress();
    try {
      const result = await invoke<ScanResult>("scan_directory", {
        request: {
          path: selectedPath.trim(),
          max_depth: maxDepth,
          ignore_hidden: ignoreHidden,
          ignore_system: ignoreSystem,
        } as ScanRequest,
      });
      setScanProgress(100);
      await new Promise((r) => setTimeout(r, 200));
      setScanResult(result);
      setLastScanTime(new Date());
      const children = result.tree?.children || [];
      setTreemapData(children);
      setFolderTree(children.filter((c) => c.is_directory));
      setBreadcrumb([selectedPath.split("/").pop() || selectedPath]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "scan failed");
    } finally {
      setScanning(false);
      setScanStep("");
    }
  };

  const handleStop = () => {
    scanAbortRef.current = true;
    setScanning(false);
    setScanStep("");
  };
  const handleReveal = (path: string) =>
    invoke("reveal_in_finder", { path }).catch(console.error);
  const handleOpenFolder = (path: string) =>
    invoke("open_containing_folder", { path }).catch(console.error);

  const handleDelete = async (path: string) => {
    if (!confirm(`delete "${path}"?`)) return;
    try {
      await invoke("delete_file_or_directory", { request: { path } });
      handleScan();
    } catch {
      alert("failed to delete. check permissions.");
    }
  };

  const handleNodeClick = (item: FileItem) => {
    if (item.is_directory && item.children?.length) {
      setTreemapData(item.children);
      setBreadcrumb((prev) => [...prev, item.name]);
    }
    setSelectedItem({ item });
  };

  const handleBreadcrumb = (idx: number) => {
    if (idx === 0 && scanResult) {
      setTreemapData(scanResult.tree?.children || []);
      setBreadcrumb((prev) => prev.slice(0, 1));
    } else setBreadcrumb((prev) => prev.slice(0, idx + 1));
    setSelectedItem(null);
  };

  const handleFolderClick = (folder: FileItem) => {
    if (folder.children?.length) {
      setTreemapData(folder.children);
      setBreadcrumb([
        selectedPath.split("/").pop() || selectedPath,
        folder.name,
      ]);
    }
    setSelectedItem({ item: folder });
  };

  const timeSince = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

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
      onClick={() => setContextMenu(null)}
    >
      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            zIndex: 50,
            left: contextMenu.x,
            top: contextMenu.y,
            background: "#0F0F0F",
            border: "0.5px solid #2A2A2A",
            borderRadius: 8,
            padding: 4,
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            {
              label: "reveal in finder",
              icon: ExternalLink,
              action: () => handleReveal(contextMenu.item.path),
            },
            {
              label: "open folder",
              icon: FolderOpenIcon,
              action: () => handleOpenFolder(contextMenu.item.path),
            },
            {
              label: "delete",
              icon: Trash2,
              action: () => handleDelete(contextMenu.item.path),
              danger: true,
            },
          ].map(({ label: l, icon: Icon, action, danger }) => (
            <button
              key={l}
              onClick={() => {
                action();
                setContextMenu(null);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: danger ? "#712B13" : "#666",
                fontSize: 11,
                cursor: "pointer",
                ...mono,
              }}
            >
              <Icon style={{ width: 12, height: 12 }} strokeWidth={1.6} />
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{ fontSize: 16, fontWeight: 500, color: "#E8E6E1", ...mono }}
          >
            scanner
          </p>
          <p style={{ fontSize: 10, color: "#444", marginTop: 2, ...mono }}>
            {lastScanTime
              ? `last scan ${timeSince(lastScanTime)}`
              : "find what's taking up space"}
          </p>
        </div>
        {scanResult && (
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              border: "0.5px solid #2A2A2A",
              background: "transparent",
              color: "#555",
              fontSize: 11,
              cursor: "pointer",
              opacity: scanning ? 0.4 : 1,
              ...mono,
            }}
          >
            <RotateCcw style={{ width: 11, height: 11 }} strokeWidth={1.6} />
            rescan
          </button>
        )}
      </div>

      {/* Controls */}
      <div style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            placeholder="enter path or choose quick access"
            style={{
              flex: 1,
              height: 34,
              padding: "0 10px",
              borderRadius: 6,
              border: "0.5px solid #2A2A2A",
              background: "#141414",
              color: "#C8C4BE",
              fontSize: 12,
              outline: "none",
              ...mono,
            }}
          />
          <button
            onClick={setUserHomePath}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 6,
              border: "0.5px solid #2A2A2A",
              background: "transparent",
              color: "#555",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              ...mono,
            }}
          >
            <FolderOpen style={{ width: 12, height: 12 }} strokeWidth={1.6} />
            home
          </button>
          {scanning ? (
            <button
              onClick={handleStop}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 6,
                border: "0.5px solid #2A1800",
                background: "#0D0900",
                color: "#633806",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                ...mono,
              }}
            >
              <StopCircle style={{ width: 12, height: 12 }} strokeWidth={1.6} />
              stop
            </button>
          ) : (
            <button
              onClick={handleScan}
              style={{
                height: 34,
                padding: "0 14px",
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
                ...mono,
              }}
            >
              <Scan style={{ width: 12, height: 12 }} strokeWidth={1.6} />
              scan
            </button>
          )}
        </div>

        {/* Filter Status */}
        {(ignoreHidden || ignoreSystem) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 10,
              fontSize: 10,
              color: "#444",
              ...mono,
            }}
          >
            {ignoreHidden && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#3B6D11",
                  }}
                />
                ignoring hidden files
              </span>
            )}
            {ignoreSystem && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#3B6D11",
                  }}
                />
                ignoring system folders
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              color: "#333",
              width: 60,
              flexShrink: 0,
              ...mono,
            }}
          >
            depth: {maxDepth}
          </span>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={maxDepth}
            onChange={(e) => setMaxDepth(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: "#444" }}
          />
          <span style={{ fontSize: 9, color: "#2A2A2A", ...mono }}>
            shallow → deep
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            border: "0.5px solid #2A1800",
            background: "#0D0900",
            color: "#633806",
            fontSize: 11,
            ...mono,
          }}
        >
          <AlertCircle
            style={{ width: 13, height: 13, flexShrink: 0 }}
            strokeWidth={1.6}
          />
          {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#633806",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

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
              scanning {selectedPath}
            </span>
            <span style={{ fontSize: 11, color: "#444", ...mono }}>
              {scanProgress}%
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
                width: `${scanProgress}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {completedSteps.map((step) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: "#333",
                  ...mono,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#161616",
                    border: "0.5px solid #27500A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg viewBox="0 0 10 10" style={{ width: 8, height: 8 }}>
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="#3B6D11"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {step}
              </div>
            ))}
            {scanStep && (
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
                      background: "#444",
                      animation: "pulse 1s infinite",
                    }}
                  />
                </div>
                scanning {scanStep}…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {scanResult && !scanning && (
        <>
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {[
              { k: "total size", v: formatBytes(scanResult.total_size) },
              { k: "files", v: scanResult.file_count.toLocaleString() },
              {
                k: "directories",
                v: scanResult.directory_count.toLocaleString(),
              },
            ].map((s) => (
              <div
                key={s.k}
                style={{
                  background: "#0F0F0F",
                  border: "0.5px solid #1E1E1E",
                  borderRadius: 8,
                  padding: "10px 14px",
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
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#E8E6E1",
                    letterSpacing: "-0.02em",
                    ...mono,
                  }}
                >
                  {s.v}
                </p>
              </div>
            ))}
          </div>

          {/* Treemap */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 10,
                flexWrap: "wrap" as const,
              }}
            >
              {breadcrumb.map((crumb, i) => (
                <span
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  {i > 0 && (
                    <ChevronRight
                      style={{ width: 10, height: 10, color: "#2A2A2A" }}
                    />
                  )}
                  <button
                    onClick={() => handleBreadcrumb(i)}
                    style={{
                      fontSize: 11,
                      padding: "2px 7px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background:
                        i === breadcrumb.length - 1 ? "#1A1A1A" : "transparent",
                      color: i === breadcrumb.length - 1 ? "#E8E6E1" : "#444",
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      ...mono,
                    }}
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
            <Treemap data={treemapData} onNodeClick={handleNodeClick} />
            <p style={{ fontSize: 9, color: "#2A2A2A", marginTop: 8, ...mono }}>
              click to drill in · right-click for actions
            </p>
          </div>

          {/* Folders + Files */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div style={card}>
              <p style={label}>folders</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {folderTree.slice(0, 10).map((folder, i) => (
                  <button
                    key={i}
                    onClick={() => handleFolderClick(folder)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        item: folder,
                      });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left" as const,
                    }}
                  >
                    <svg
                      viewBox="0 0 14 14"
                      style={{
                        width: 12,
                        height: 12,
                        stroke: "#333",
                        fill: "none",
                        strokeWidth: 1.6,
                        flexShrink: 0,
                      }}
                    >
                      <path d="M1 4a1 1 0 011-1h3l1 1.5h6a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "#888",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "200px",
                        ...mono,
                      }}
                    >
                      {folder.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#444",
                        flexShrink: 0,
                        ...mono,
                      }}
                    >
                      {formatBytes(folder.size)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <LargestFiles
              files={scanResult.largest_files}
              onDelete={() => handleScan()}
            />
          </div>

          {/* Charts */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <FolderSizeChart
              folders={
                scanResult.tree?.children?.filter((c) => c.is_directory) || []
              }
            />
            <StorageBreakdown fileTypes={scanResult.file_types} />
          </div>

          {/* Selected item */}
          {selectedItem && (
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <p style={label}>selected</p>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#333",
                    cursor: "pointer",
                  }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 24px",
                  marginBottom: 14,
                }}
              >
                {[
                  { k: "name", v: selectedItem.item.name },
                  { k: "size", v: formatBytes(selectedItem.item.size) },
                  {
                    k: "type",
                    v: selectedItem.item.is_directory
                      ? "directory"
                      : (selectedItem.item.file_type ?? "file"),
                  },
                  { k: "path", v: selectedItem.item.path },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <p
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#333",
                        marginBottom: 3,
                        ...mono,
                      }}
                    >
                      {k}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#888",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "300px",
                        ...mono,
                      }}
                    >
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  {
                    l: "reveal in finder",
                    icon: ExternalLink,
                    action: () => handleReveal(selectedItem.item.path),
                  },
                  {
                    l: "open folder",
                    icon: FolderOpenIcon,
                    action: () => handleOpenFolder(selectedItem.item.path),
                  },
                ].map(({ l, icon: Icon, action }) => (
                  <button
                    key={l}
                    onClick={action}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: 6,
                      border: "0.5px solid #2A2A2A",
                      background: "transparent",
                      color: "#666",
                      fontSize: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      ...mono,
                    }}
                  >
                    <Icon style={{ width: 11, height: 11 }} strokeWidth={1.6} />
                    {l}
                  </button>
                ))}
                <button
                  onClick={() => handleDelete(selectedItem.item.path)}
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "0.5px solid #2A1800",
                    background: "#0D0900",
                    color: "#633806",
                    fontSize: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginLeft: "auto",
                    ...mono,
                  }}
                >
                  <Trash2 style={{ width: 11, height: 11 }} strokeWidth={1.6} />
                  delete
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!scanResult && !scanning && (
        <div
          style={{
            ...card,
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #1E1E1E",
              background: "#141414",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Scan
              style={{ width: 18, height: 18, color: "#2A2A2A" }}
              strokeWidth={1.5}
            />
          </div>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 6, ...mono }}>
            nothing scanned yet
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#333",
              maxWidth: 280,
              lineHeight: 1.7,
              ...mono,
            }}
          >
            enter a path and hit scan to see what's eating your disk.
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 16,
              flexWrap: "wrap" as const,
              justifyContent: "center",
            }}
          >
            {quickPaths.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPath(p)}
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "0.5px solid #1E1E1E",
                  background: "transparent",
                  fontSize: 10,
                  color: "#444",
                  cursor: "pointer",
                  ...mono,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
