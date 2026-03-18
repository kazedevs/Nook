import { useState, useEffect } from "react";
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
import { FileItem } from "@/types";
import { invoke } from "@tauri-apps/api/tauri";
import { formatBytes } from "@/utils/format";
import { Treemap } from "@/components/Treemap";
import { LargestFiles } from "@/components/LargestFiles";
import { FolderSizeChart } from "@/components/FolderSizeChart";
import { StorageBreakdown } from "@/components/StorageBreakdown";
import { useScanProgress } from "@/hooks/useScanProgress";

interface SelectedItem {
  item: FileItem;
}

export function Scanner() {
  const [selectedPath, setSelectedPath] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
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
    const loadPreferences = async () => {
      try {
        const saved = localStorage.getItem("nook_prefs");
        if (saved) {
          const prefs = JSON.parse(saved);
          if (prefs.defaultPath) setSelectedPath(prefs.defaultPath);
          if (prefs.defaultDepth) setMaxDepth(prefs.defaultDepth);
          if (prefs.ignoreHidden !== undefined) setIgnoreHidden(prefs.ignoreHidden);
          if (prefs.ignoreSystem !== undefined) setIgnoreSystem(prefs.ignoreSystem);
        }
        const userHome = await invoke<string>("get_user_home");
        setQuickPaths([userHome, `${userHome}/Downloads`, `${userHome}/Documents`]);
      } catch (error) {
        console.error("Failed to load preferences:", error);
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

  const handleScan = async () => {
    if (!selectedPath.trim()) return;
    setSelectedItem(null);
    await scan(selectedPath.trim(), maxDepth, ignoreHidden, ignoreSystem);
    if (scanResult) {
      setLastScanTime(new Date());
      const children = scanResult.tree?.children || [];
      setTreemapData(children);
      setFolderTree(children.filter((c) => c.is_directory));
      setBreadcrumb([selectedPath.split("/").pop() || selectedPath]);
    }
  };

  const handleStop = () => cancel();
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
      setBreadcrumb([selectedPath.split("/").pop() || selectedPath, folder.name]);
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
      className="flex flex-col gap-2.5 max-w-4xl mx-auto px-5"
      onClick={() => setContextMenu(null)}
    >
      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg p-1 min-w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
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
              onClick={() => { action(); setContextMenu(null); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-none border-none bg-transparent cursor-pointer text-xs font-mono ${
                danger ? "text-[#712B13]" : "text-[#666]"
              }`}
            >
              <Icon className="w-3 h-3" strokeWidth={1.6} />
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-[#E8E6E1] font-mono">scanner</p>
          <p className="text-[10px] text-[#666] mt-0.5 font-mono">
            {lastScanTime ? `last scan ${timeSince(lastScanTime)}` : "find what's taking up space"}
          </p>
        </div>
        {scanResult && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex items-center gap-1.5 h-[30px] px-3 rounded border border-[#2A2A2A] bg-transparent text-[#777] text-xs cursor-pointer font-mono ${
              scanning ? "opacity-40" : "opacity-100"
            }`}
          >
            <RotateCcw className="w-[11px] h-[11px]" strokeWidth={1.6} />
            rescan
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg p-3.5 py-4">
        <div className="flex gap-2 mb-2.5">
          <input
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            placeholder="enter path or choose quick access"
            className="flex-1 h-[34px] px-2.5 rounded border border-[#2A2A2A] bg-[#141414] text-[#C8C4BE] text-xs outline-none font-mono"
          />
          <button
            onClick={setUserHomePath}
            className="h-[34px] px-3 rounded border border-[#2A2A2A] bg-transparent text-[#777] text-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 font-mono"
          >
            <FolderOpen className="w-3 h-3" strokeWidth={1.6} />
            home
          </button>
          {scanning ? (
            <button
              onClick={handleStop}
              className="h-[34px] px-3 rounded border border-[#4A2C00] bg-[#1A1200] text-[#A0522D] text-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 font-mono"
            >
              <StopCircle className="w-3 h-3" strokeWidth={1.6} />
              stop
            </button>
          ) : (
            <button
              onClick={handleScan}
              className="h-[34px] px-3.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] text-[#E8E6E1] text-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 font-mono"
            >
              <Scan className="w-3 h-3" strokeWidth={1.6} />
              scan
            </button>
          )}
        </div>

        {/* Filter Status */}
        {(ignoreHidden || ignoreSystem) && (
          <div className="flex gap-3 mb-2.5 text-[10px] text-[#666] font-mono">
            {ignoreHidden && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                ignoring hidden files
              </span>
            )}
            {ignoreSystem && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                ignoring system folders
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[#333] w-15 flex-shrink-0 font-mono">
            depth: {maxDepth}
          </span>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={maxDepth}
            onChange={(e) => setMaxDepth(parseInt(e.target.value))}
            className="flex-1 accent-[#666]"
          />
          <span className="text-[10px] text-[#555] font-mono">shallow → deep</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded border border-[#2A1800] bg-[#0D0900] text-[#633806] text-xs font-mono">
          <AlertCircle className="w-[13px] h-[13px] flex-shrink-0" strokeWidth={1.6} />
          {error}
        </div>
      )}

      {/* Progress */}
      {scanning && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg p-3.5 py-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[#666] font-mono">scanning {selectedPath}</span>
            <span className="text-xs text-[#666] font-mono">{progress}%</span>
          </div>
          <div className="bg-[#161616] rounded h-0.5 overflow-hidden mb-3">
            <div
              className="h-full bg-[#2A2A2A] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-[#666] font-mono">
              <div className="w-3.5 h-3.5 rounded-full border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                <div className="w-[5px] h-[5px] rounded-full bg-[#666] animate-pulse" />
              </div>
              scanning {currentPath}…
            </div>
            <div className="flex justify-between text-[10px] text-[#3B6D11] font-mono">
              <span>{filesFound.toLocaleString()} files</span>
              <span>{formatBytes(bytesFound)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {scanResult && !scanning && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "total size", v: formatBytes(scanResult.total_size) },
              { k: "files", v: scanResult.file_count.toLocaleString() },
              { k: "directories", v: scanResult.directory_count.toLocaleString() },
            ].map((s) => (
              <div
                key={s.k}
                className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-3.5 py-2.5"
              >
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-1.5 font-mono">
                  {s.k}
                </p>
                <p className="text-[15px] font-medium text-[#E8E6E1] tracking-tight font-mono">
                  {s.v}
                </p>
              </div>
            ))}
          </div>

          {/* Treemap */}
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
            <div className="flex items-center gap-1 mb-2.5 flex-wrap">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-[#2A2A2A]" />}
                  <button
                    onClick={() => handleBreadcrumb(i)}
                    className={`text-[11px] px-[7px] py-0.5 rounded cursor-pointer border-none max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap font-mono ${
                      i === breadcrumb.length - 1
                        ? "bg-[#1A1A1A] text-[#E8E6E1]"
                        : "bg-transparent text-[#444]"
                    }`}
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
            <Treemap data={treemapData} onNodeClick={handleNodeClick} />
            <p className="text-[9px] text-[#2A2A2A] mt-2 font-mono">
              click to drill in · right-click for actions
            </p>
          </div>

          {/* Folders + Files */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-2.5 font-mono">
                folders
              </p>
              <div className="flex flex-col gap-px">
                {folderTree.slice(0, 10).map((folder, i) => (
                  <button
                    key={i}
                    onClick={() => handleFolderClick(folder)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                    }}
                    className="flex items-center gap-2 px-2 py-[7px] rounded-md border-none bg-transparent cursor-pointer text-left"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      className="w-3 h-3 flex-shrink-0"
                      style={{ stroke: "#333", fill: "none", strokeWidth: 1.6 }}
                    >
                      <path d="M1 4a1 1 0 011-1h3l1 1.5h6a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="flex-1 text-xs text-[#888] overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] font-mono">
                      {folder.name}
                    </span>
                    <span className="text-[11px] text-[#666] flex-shrink-0 font-mono">
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
          <div className="grid grid-cols-2 gap-2.5">
            <FolderSizeChart
              folders={scanResult.tree?.children?.filter((c) => c.is_directory) || []}
            />
            <StorageBreakdown fileTypes={scanResult.file_types} />
          </div>

          {/* Selected item */}
          {selectedItem && (
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] font-mono">
                  selected
                </p>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-transparent border-none text-[#333] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-3.5">
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
                    <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-[3px] font-mono">
                      {k}
                    </p>
                    <p className="text-xs text-[#888] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px] font-mono">
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
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
                    className="h-7 px-2.5 rounded border border-[#2A2A2A] bg-transparent text-[#666] text-[10px] cursor-pointer flex items-center gap-[5px] font-mono"
                  >
                    <Icon className="w-[11px] h-[11px]" strokeWidth={1.6} />
                    {l}
                  </button>
                ))}
                <button
                  onClick={() => handleDelete(selectedItem.item.path)}
                  className="h-7 px-2.5 rounded border border-[#2A1800] bg-[#0D0900] text-[#633806] text-[10px] cursor-pointer flex items-center gap-[5px] ml-auto font-mono"
                >
                  <Trash2 className="w-[11px] h-[11px]" strokeWidth={1.6} />
                  delete
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!scanResult && !scanning && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-6 py-12 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-[10px] border border-[#1E1E1E] bg-[#141414] flex items-center justify-center mb-3.5">
            <Scan className="w-[18px] h-[18px] text-[#555]" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-[#777] mb-1.5 font-mono">nothing scanned yet</p>
          <p className="text-[11px] text-[#333] max-w-[280px] leading-[1.7] font-mono">
            enter a path and hit scan to see what's eating your disk.
          </p>
          <div className="flex gap-1.5 mt-4 flex-wrap justify-center">
            {quickPaths.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPath(p)}
                className="h-[26px] px-2.5 rounded border border-[#1E1E1E] bg-transparent text-[10px] text-[#666] cursor-pointer font-mono"
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