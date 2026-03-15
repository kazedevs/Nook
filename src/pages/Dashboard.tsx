import { useState, useEffect } from "react"
import { AlertTriangle, HardDrive, Zap, RefreshCw, ChevronRight, FolderOpen, File } from "lucide-react"
import { SystemInfo, ScanResult, ScanRequest } from "@/types"
import { invoke } from "@tauri-apps/api/tauri"
import { formatBytes } from "@/utils/format"
import { useNavigate } from "react-router-dom"

const QUICK_SCAN_PATHS = [
  { label: "Scan disk", path: "/" },
  { label: "Scan Downloads", path: `/Users/${typeof process !== "undefined" ? process.env?.USER ?? "" : ""}/Downloads` },
  { label: "Scan Applications", path: "/Applications" },
]

const DMG_EXTS = ["dmg", "pkg", "iso"]
const VIDEO_EXTS = ["mp4", "mov", "mkv", "avi", "m4v"]
const DEV_DIRS = ["node_modules", ".cache", "DerivedData", "Pods"]

export function Dashboard() {
  const navigate = useNavigate()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanningLabel, setScanningLabel] = useState("")

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch(console.error)
      .finally(() => setLoading(false))

    const saved = localStorage.getItem("nook_last_scan")
    if (saved) {
      try { setScanResult(JSON.parse(saved)) } catch {}
    }
  }, [])

  const runScan = async (path: string, label: string) => {
    setScanning(true)
    setScanningLabel(label)
    try {
      const result = await invoke<ScanResult>("scan_directory", {
        request: { path, max_depth: 3 } as ScanRequest,
      })
      setScanResult(result)
      localStorage.setItem("nook_last_scan", JSON.stringify(result))
    } catch (err) {
      console.error("Scan failed:", err)
    } finally {
      setScanning(false)
      setScanningLabel("")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 rounded-full border-2 border-secondary-200 border-t-secondary-500 animate-spin" />
    </div>
  )

  if (!systemInfo) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <HardDrive className="w-8 h-8 text-secondary-300 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-secondary-500">Failed to load system information.</p>
    </div>
  )

  const usagePct = (systemInfo.used_disk_space / systemInfo.total_disk_space) * 100
  const isCritical = usagePct > 95
  const isWarning = usagePct > 85

  const largestFolder = scanResult?.tree?.children
    ?.filter(c => c.is_directory)
    .sort((a, b) => b.size - a.size)[0]

  const largestFile = scanResult?.largest_files?.[0]

  const dmgSize = scanResult?.file_types
    .filter(t => DMG_EXTS.includes(t.extension))
    .reduce((s, t) => s + t.total_size, 0) ?? 0

  const videoSize = scanResult?.file_types
    .filter(t => VIDEO_EXTS.includes(t.extension))
    .reduce((s, t) => s + t.total_size, 0) ?? 0

  const devSize = scanResult?.largest_files
    ?.filter(f => DEV_DIRS.some(d => f.name === d || f.path.includes(`/${d}`)))
    .reduce((s, f) => s + f.size, 0) ?? 0

  const estimatedFreeable = dmgSize + videoSize + devSize
  const insights = [
    dmgSize > 0 && { label: "Disk images & installers", size: dmgSize },
    videoSize > 0 && { label: "Large video files", size: videoSize },
    devSize > 0 && { label: "Dev caches & node_modules", size: devSize },
  ].filter(Boolean) as { label: string; size: number }[]

  return (
    <div className="space-y-3 max-w-2xl">

      {/* Storage Overview */}
      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-[11px] font-medium text-secondary-400 mb-4">storage overview</p>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: formatBytes(systemInfo.total_disk_space) },
            { label: "Used", value: formatBytes(systemInfo.used_disk_space) },
            { label: "Free", value: formatBytes(systemInfo.available_disk_space), warn: isWarning },
            { label: "Usage", value: `${usagePct.toFixed(1)}%`, warn: isWarning },
          ].map(s => (
            <div key={s.label} className="bg-secondary-50 rounded-lg p-3">
              <p className="text-[10px] text-secondary-400 mb-1">{s.label}</p>
              <p className={`text-sm font-medium ${s.warn ? "text-red-500" : "text-secondary-900"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="w-full bg-secondary-100 rounded-full h-1.5 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${isCritical ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-secondary-400"}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-secondary-400">
          <span>{formatBytes(systemInfo.used_disk_space)} used</span>
          <span>{formatBytes(systemInfo.available_disk_space)} free</span>
        </div>

        {estimatedFreeable > 0 && (
          <div className="mt-4 pt-4 border-t border-secondary-50 flex items-center justify-between">
            <p className="text-[11px] text-secondary-400">Estimated space you can free</p>
            <p className="text-sm font-medium text-green-600">{formatBytes(estimatedFreeable)}</p>
          </div>
        )}
      </div>

      {/* Disk Warning */}
      {(isWarning || isCritical) && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          isCritical
            ? "bg-red-50 border-red-100"
            : "bg-amber-50 border-amber-100"
        }`}>
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCritical ? "text-red-400" : "text-amber-400"}`} strokeWidth={1.8} />
          <div>
            <p className={`text-sm font-medium mb-0.5 ${isCritical ? "text-red-700" : "text-amber-700"}`}>
              {isCritical ? "Disk is almost full" : "Running low on space"}
            </p>
            <p className={`text-xs ${isCritical ? "text-red-500" : "text-amber-600"}`}>
              Only {formatBytes(systemInfo.available_disk_space)} remaining. Scan your disk to find what to delete.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-[11px] font-medium text-secondary-400 mb-3">quick actions</p>
        <div className="space-y-2">
          {QUICK_SCAN_PATHS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => runScan(path, label)}
              disabled={scanning}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-secondary-100 hover:bg-secondary-50 hover:border-secondary-200 transition-colors disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2.5">
                {scanning && scanningLabel === label
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 border-secondary-300 border-t-secondary-600 animate-spin" />
                  : <Zap className="w-3.5 h-3.5 text-secondary-400" strokeWidth={1.8} />
                }
                <span className="text-sm text-secondary-700">{label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-secondary-300 group-hover:text-secondary-400 transition-colors" strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </div>

      {/* Last Scan Summary */}
      {scanResult && (
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-secondary-400">last scan</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-secondary-300">
                {formatBytes(scanResult.total_size)} · {scanResult.file_count.toLocaleString()} files
              </span>
              <button
                onClick={() => scanResult && runScan(scanResult.root_path, "Refresh")}
                disabled={scanning}
                className="text-secondary-300 hover:text-secondary-500 transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {largestFolder && (
              <div className="bg-secondary-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FolderOpen className="w-3 h-3 text-secondary-400" strokeWidth={1.8} />
                  <p className="text-[10px] text-secondary-400">Largest folder</p>
                </div>
                <p className="text-sm font-medium text-secondary-800 truncate">{largestFolder.name}</p>
                <p className="text-xs text-secondary-500">{formatBytes(largestFolder.size)}</p>
              </div>
            )}
            {largestFile && (
              <div className="bg-secondary-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <File className="w-3 h-3 text-secondary-400" strokeWidth={1.8} />
                  <p className="text-[10px] text-secondary-400">Largest file</p>
                </div>
                <p className="text-sm font-medium text-secondary-800 truncate">{largestFile.name}</p>
                <p className="text-xs text-secondary-500">{formatBytes(largestFile.size)}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/scanner")}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-secondary-100 hover:bg-secondary-50 transition-colors text-xs text-secondary-500 hover:text-secondary-700"
          >
            View full scan results
            <ChevronRight className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Quick Insights */}
      {insights.length > 0 && (
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <p className="text-[11px] font-medium text-secondary-400 mb-3">possible space to free</p>
          <div className="space-y-0.5">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-secondary-50 last:border-0">
                <span className="text-sm text-secondary-600">{ins.label}</span>
                <span className="text-sm font-medium text-secondary-800">{formatBytes(ins.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-[11px] font-medium text-secondary-400 mb-3">system information</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-secondary-400 mb-1">Operating system</p>
            <p className="text-sm text-secondary-700">{systemInfo.os_name}</p>
          </div>
          <div>
            <p className="text-[10px] text-secondary-400 mb-1">Version</p>
            <p className="text-sm text-secondary-700">{systemInfo.os_version}</p>
          </div>
        </div>
      </div>

    </div>
  )
}