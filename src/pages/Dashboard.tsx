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

export function Dashboard() {
  const navigate = useNavigate();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [_lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const {
    scan,
    scanning,
    progress,
    filesFound,
    bytesFound,
    currentPath,
    result: scanResult,
  } = useScanProgress();

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const runScan = async (path: string, _label: string) => {
    setLastScanTime(new Date());
    let resolvedPath = path;
    if (path.startsWith("~")) {
      const userHome = await invoke<string>("get_user_home");
      resolvedPath = path.replace("~", userHome);
    }
    await scan(resolvedPath, 3, true, true);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-4 h-4 rounded-full border-[1.5px] border-[#222] border-t-[#555] animate-spin" />
      </div>
    );

  if (!systemInfo)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <HardDrive className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
        <p className="text-xs text-[#666] font-mono">
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
    <div className="flex flex-col gap-2.5 max-w-[900px] mx-auto px-5">
      {/* Storage */}
      <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
        <p className="text-[9px] tracking-[0.1em] uppercase text-[#666] mb-2.5 font-mono">
          storage
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
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
              className="bg-[#141414] border border-[#1E1E1E] rounded-md px-3 py-2.5"
            >
              <p className="text-[9px] tracking-[0.08em] uppercase text-[#666] mb-1.5 font-mono">
                {s.k}
              </p>
              <p
                className={`text-base font-medium tracking-tight font-mono ${
                  s.warn ? "text-[#854F0B]" : "text-[#E8E6E1]"
                }`}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#161616] rounded-sm h-0.5 overflow-hidden mb-1.5">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical
                ? "bg-[#712B13]"
                : isWarning
                  ? "bg-[#633806]"
                  : "bg-[#2A2A2A]"
            }`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-[#666] tracking-[0.04em] font-mono">
          <span>{formatBytes(systemInfo.used_disk_space)} used</span>
          <span>{formatBytes(systemInfo.available_disk_space)} free</span>
        </div>

        {estimatedFreeable > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-[#1A1A1A] flex items-center justify-between">
            <span className="text-[10px] text-[#666] font-mono">
              est. freeable
            </span>
            <span className="text-xs font-medium text-[#3B6D11] font-mono">
              +{formatBytes(estimatedFreeable)}
            </span>
          </div>
        )}
      </div>

      {/* Warning */}
      {(isWarning || isCritical) && (
        <div className="bg-[#0D0900] border border-[#2A1800] rounded-lg px-3.5 py-2.5 flex items-start gap-[9px]">
          <AlertTriangle
            className="w-[13px] h-[13px] text-[#D4841E] flex-shrink-0 mt-px"
            strokeWidth={1.6}
          />
          <div>
            <p className="text-[11px] text-[#D4841E] mb-0.5 font-mono">
              {isCritical ? "disk is almost full" : "running low on space"}
            </p>
            <p className="text-[10px] text-[#633806] font-mono">
              {formatBytes(systemInfo.available_disk_space)} remaining. scan
              disk to find what to delete.
            </p>
          </div>
        </div>
      )}

      {/* Quick scan */}
      <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
        <p className="text-[9px] tracking-[0.1em] uppercase text-[#666] mb-2.5 font-mono">
          quick scan
        </p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_SCAN_PATHS.map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => runScan(path, label)}
              disabled={scanning}
              className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-md border border-[#1A1A1A] text-[11px] cursor-pointer font-mono transition-all duration-100 p-3 ${
                scanning
                  ? "bg-[#141414] text-[#888] opacity-50"
                  : "bg-transparent text-[#777]"
              }`}
            >
              <div className="text-2xl flex items-center justify-center">
                {scanning ? (
                  <div className="w-6 h-6 rounded-full border-[1.5px] border-[#333] border-t-[#666] animate-spin" />
                ) : (
                  icon
                )}
              </div>
              <div className="text-[11px] text-center leading-[1.2] font-medium">
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
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
          <div className="flex justify-between mb-2">
            <span className="text-[11px] text-[#666] font-mono">
              scanning {currentPath}
            </span>
            <span className="text-[11px] text-[#666] font-mono">
              {progress}%
            </span>
          </div>
          <div className="bg-[#161616] rounded-sm h-0.5 overflow-hidden mb-3">
            <div
              className="h-full bg-[#2A2A2A] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[11px] text-[#666] font-mono">
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

      {/* Last scan */}
      {scanResult && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[9px] tracking-[0.1em] uppercase text-[#666] font-mono">
              last scan
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] text-[#666] font-mono">
                {formatBytes(scanResult.total_size)} ·{" "}
                {scanResult.file_count.toLocaleString()} files
              </span>
              <button
                onClick={() => runScan(scanResult.root_path, "refresh")}
                disabled={scanning}
                className={`bg-transparent border-none text-[#666] cursor-pointer p-0 ${
                  scanning ? "opacity-40" : "opacity-100"
                }`}
              >
                <RefreshCw className="w-[11px] h-[11px]" strokeWidth={1.6} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
            {largestFolder && (
              <div className="bg-[#141414] border border-[#1E1E1E] rounded-md px-3 py-2.5">
                <div className="flex items-center gap-[5px] mb-1.5">
                  <FolderOpen
                    className="w-2.5 h-2.5 text-[#666]"
                    strokeWidth={1.6}
                  />
                  <p className="text-[9px] tracking-[0.08em] uppercase text-[#666] font-mono">
                    largest folder
                  </p>
                </div>
                <p className="text-xs text-[#C8C4BE] whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 font-mono">
                  {largestFolder.name}
                </p>
                <p className="text-[10px] text-[#444] font-mono">
                  {formatBytes(largestFolder.size)}
                </p>
              </div>
            )}
            {largestFile && (
              <div className="bg-[#141414] border border-[#1E1E1E] rounded-md px-3 py-2.5">
                <div className="flex items-center gap-[5px] mb-1.5">
                  <File className="w-2.5 h-2.5 text-[#666]" strokeWidth={1.6} />
                  <p className="text-[9px] tracking-[0.08em] uppercase text-[#666] font-mono">
                    largest file
                  </p>
                </div>
                <p className="text-xs text-[#C8C4BE] whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 font-mono">
                  {largestFile.name}
                </p>
                <p className="text-[10px] text-[#444] font-mono">
                  {formatBytes(largestFile.size)}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/scanner")}
            className="w-full py-[7px] rounded-md border border-[#1E1E1E] bg-transparent text-[10px] text-[#444] font-mono cursor-pointer flex items-center justify-center gap-[5px] tracking-[0.04em]"
          >
            view full results
            <ChevronRight className="w-2.5 h-2.5" strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
          <p className="text-[9px] tracking-[0.1em] uppercase text-[#666] mb-2.5 font-mono">
            possible to free
          </p>
          <div>
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-[7px] ${
                  i < insights.length - 1 ? "border-b border-[#161616]" : ""
                }`}
              >
                <span className="text-[11px] text-[#777] font-mono">
                  {ins.label}
                </span>
                <span className="text-[11px] text-[#AAA] font-mono">
                  {formatBytes(ins.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System */}
      <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
        <p className="text-[9px] tracking-[0.1em] uppercase text-[#666] mb-2.5 font-mono">
          system
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#666] mb-1 font-mono">
              operating system
            </p>
            <p className="text-[11px] text-[#888] font-mono">
              {systemInfo.os_name}
            </p>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#666] mb-1 font-mono">
              version
            </p>
            <p className="text-[11px] text-[#888] font-mono">
              {systemInfo.os_version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
