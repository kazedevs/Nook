import { useState, useRef, useCallback } from "react"
import { Scan, FolderOpen, AlertCircle, ChevronRight, RotateCcw, X, ExternalLink, Trash2, FolderOpen as FolderOpenIcon, StopCircle } from "lucide-react"
import { ScanResult, ScanRequest, FileItem } from "@/types"
import { invoke } from "@tauri-apps/api/tauri"
import { formatBytes } from "@/utils/format"
import { Treemap } from "@/components/Treemap"
import { LargestFiles } from "@/components/LargestFiles"
import { FolderSizeChart } from "@/components/FolderSizeChart"
import { StorageBreakdown } from "@/components/StorageBreakdown"

interface SelectedItem {
  item: FileItem
  modified?: string
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
]

export function Scanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStep, setScanStep] = useState("")
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [selectedPath, setSelectedPath] = useState("")
  const [maxDepth, setMaxDepth] = useState(3)
  const [error, setError] = useState("")
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])
  const [treemapData, setTreemapData] = useState<FileItem[]>([])
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null)
  const [folderTree, setFolderTree] = useState<FileItem[]>([])
  const scanAbortRef = useRef(false)

  const simulateScanProgress = useCallback(async () => {
    setScanProgress(0)
    setCompletedSteps([])
    const steps = SCAN_STEPS.slice(0, 6 + Math.floor(Math.random() * 3))
    for (let i = 0; i < steps.length; i++) {
      if (scanAbortRef.current) break
      setScanStep(steps[i])
      setScanProgress(Math.round((i / steps.length) * 85))
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
      setCompletedSteps(prev => [...prev, steps[i]])
    }
    setScanProgress(95)
  }, [])

  const handleScan = async () => {
    if (!selectedPath.trim()) { setError("Enter a directory path"); return }
    setScanning(true)
    setError("")
    setScanResult(null)
    setSelectedItem(null)
    scanAbortRef.current = false

    simulateScanProgress()

    try {
      const result = await invoke<ScanResult>("scan_directory", {
        request: { path: selectedPath.trim(), max_depth: maxDepth } as ScanRequest,
      })
      setScanProgress(100)
      await new Promise(r => setTimeout(r, 200))
      setScanResult(result)
      setLastScanTime(new Date())
      const children = result.tree?.children || []
      setTreemapData(children)
      setFolderTree(children.filter(c => c.is_directory))
      setBreadcrumb([selectedPath.split("/").pop() || selectedPath])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan directory")
    } finally {
      setScanning(false)
      setScanStep("")
    }
  }

  const handleStop = () => {
    scanAbortRef.current = true
    setScanning(false)
    setScanStep("")
  }

  const handleNodeClick = (item: FileItem) => {
    if (item.is_directory && item.children?.length) {
      setTreemapData(item.children)
      setBreadcrumb(prev => [...prev, item.name])
    }
    setSelectedItem({ item })
  }

  const handleBreadcrumb = (idx: number) => {
    if (idx === 0 && scanResult) {
      setTreemapData(scanResult.tree?.children || [])
      setBreadcrumb(prev => prev.slice(0, 1))
    } else {
      setBreadcrumb(prev => prev.slice(0, idx + 1))
    }
    setSelectedItem(null)
  }

  const handleFolderClick = (folder: FileItem) => {
    if (folder.children?.length) {
      setTreemapData(folder.children)
      setBreadcrumb([selectedPath.split("/").pop() || selectedPath, folder.name])
    }
    setSelectedItem({ item: folder })
  }

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete "${path}"? This cannot be undone.`)) return
    try {
      await invoke("delete_file_or_directory", { request: { path } })
      handleScan()
    } catch { alert("Failed to delete. Check permissions.") }
  }

  const handleReveal = (path: string) => invoke("reveal_in_finder", { path }).catch(console.error)
  const handleOpenFolder = (path: string) => invoke("open_containing_folder", { path }).catch(console.error)

  const timeSince = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000)
    if (s < 60) return "just now"
    if (s < 3600) return `${Math.floor(s / 60)} min ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <div
      className="space-y-3 max-w-6xl"
      onClick={() => setContextMenu(null)}
    >

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-secondary-200 rounded-xl shadow-md py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {[
            { label: "Reveal in Finder", icon: ExternalLink, action: () => handleReveal(contextMenu.item.path) },
            { label: "Open folder", icon: FolderOpenIcon, action: () => handleOpenFolder(contextMenu.item.path) },
            { label: "Delete", icon: Trash2, action: () => handleDelete(contextMenu.item.path), danger: true },
          ].map(({ label, icon: Icon, action, danger }) => (
            <button
              key={label}
              onClick={() => { action(); setContextMenu(null) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary-50 transition-colors ${danger ? "text-red-500 hover:bg-red-50" : "text-secondary-700"}`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-secondary-900">Scanner</h1>
          <p className="text-xs text-secondary-400 mt-0.5">
            {lastScanTime ? `Last scan ${timeSince(lastScanTime)}` : "Find what's taking up space"}
          </p>
        </div>
        {scanResult && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="h-8 px-3 rounded-lg border border-secondary-200 text-xs text-secondary-500 hover:bg-secondary-50 flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
            Rescan
          </button>
        )}
      </div>

      {/* Scan Controls */}
      <div className="bg-white border border-secondary-100 rounded-xl p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={selectedPath}
            onChange={e => setSelectedPath(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            placeholder="/Users/you"
            className="flex-1 h-9 px-3 rounded-lg border border-secondary-200 text-sm text-secondary-800 placeholder-secondary-300 outline-none focus:border-secondary-400 bg-white font-mono"
          />
          <button
            onClick={() => setSelectedPath("/Users/" + (typeof process !== "undefined" ? (process.env?.USER ?? "") : ""))}
            className="h-9 px-3 rounded-lg border border-secondary-200 text-sm text-secondary-500 hover:bg-secondary-50 flex items-center gap-1.5 flex-shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.8} />
            Browse
          </button>
          {scanning ? (
            <button
              onClick={handleStop}
              className="h-9 px-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-500 flex items-center gap-1.5 flex-shrink-0"
            >
              <StopCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleScan}
              className="h-9 px-4 rounded-lg bg-secondary-900 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-secondary-800 transition-colors flex-shrink-0"
            >
              <Scan className="w-3.5 h-3.5" strokeWidth={1.8} />
              Scan
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-secondary-400 w-16 flex-shrink-0">Depth: {maxDepth}</span>
          <input
            type="range" min="1" max="10" step="1" value={maxDepth}
            onChange={e => setMaxDepth(parseInt(e.target.value))}
            className="flex-1 accent-secondary-400"
          />
          <span className="text-[10px] text-secondary-300 w-20 text-right">shallow → deep</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-100 bg-red-50 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
          {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Scan Progress */}
      {scanning && (
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-secondary-600">Scanning {selectedPath}</p>
            <span className="text-xs text-secondary-400">{scanProgress}%</span>
          </div>
          <div className="w-full bg-secondary-100 rounded-full h-1 overflow-hidden mb-4">
            <div
              className="h-full bg-secondary-500 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="space-y-1.5">
            {completedSteps.map(step => (
              <div key={step} className="flex items-center gap-2 text-xs text-secondary-400">
                <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 10 10" className="w-2 h-2"><path d="M2 5l2 2 4-4" stroke="#3B6D11" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                </div>
                {step}
              </div>
            ))}
            {scanStep && (
              <div className="flex items-center gap-2 text-xs text-secondary-600">
                <div className="w-3.5 h-3.5 rounded-full border border-secondary-300 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary-400 animate-pulse" />
                </div>
                Scanning {scanStep}…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {scanResult && !scanning && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total size", value: formatBytes(scanResult.total_size) },
              { label: "Files", value: scanResult.file_count.toLocaleString() },
              { label: "Directories", value: scanResult.directory_count.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-white border border-secondary-100 rounded-xl p-3">
                <p className="text-[10px] text-secondary-400 mb-1">{s.label}</p>
                <p className="text-sm font-medium text-secondary-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Treemap */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-3 flex-wrap">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-secondary-300" />}
                  <button
                    onClick={() => handleBreadcrumb(i)}
                    className={`text-xs rounded px-1.5 py-0.5 transition-colors ${
                      i === breadcrumb.length - 1
                        ? "text-secondary-700 font-medium bg-secondary-100"
                        : "text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50"
                    }`}
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
            <Treemap data={treemapData} onNodeClick={handleNodeClick} />
            <p className="text-[10px] text-secondary-300 mt-2">Click a folder to drill in • right-click for actions</p>
          </div>

          {/* Folders + Largest Files */}
          <div className="grid grid-cols-2 gap-3">
            {/* Folder tree */}
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <p className="text-[11px] font-medium text-secondary-400 mb-3">folders</p>
              <div className="space-y-0.5">
                {folderTree.slice(0, 10).map((folder, i) => (
                  <button
                    key={i}
                    onClick={() => handleFolderClick(folder)}
                    onContextMenu={e => handleContextMenu(e, folder)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary-50 transition-colors text-left group"
                  >
                    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 text-secondary-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M1 4a1 1 0 011-1h3l1 1.5h6a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4z"/>
                    </svg>
                    <span className="flex-1 text-[13px] text-secondary-700 truncate">{folder.name}</span>
                    <span className="text-[11px] text-secondary-400 flex-shrink-0">{formatBytes(folder.size)}</span>
                    <ChevronRight className="w-3 h-3 text-secondary-200 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Largest files */}
            <LargestFiles files={scanResult.largest_files} onDelete={() => handleScan()} />
          </div>

          {/* Folder chart + Storage breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <FolderSizeChart folders={scanResult.tree?.children?.filter(c => c.is_directory) || []} />
            <StorageBreakdown fileTypes={scanResult.file_types} />
          </div>

          {/* Selected item detail */}
          {selectedItem && (
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-medium text-secondary-400">selected item</p>
                <button onClick={() => setSelectedItem(null)} className="text-secondary-300 hover:text-secondary-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                {[
                  { label: "Name", value: selectedItem.item.name },
                  { label: "Size", value: formatBytes(selectedItem.item.size) },
                  { label: "Type", value: selectedItem.item.is_directory ? "Folder" : (selectedItem.item.file_type?.toUpperCase() ?? "File") },
                  { label: "Path", value: selectedItem.item.path },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-secondary-400 mb-0.5">{label}</p>
                    <p className="text-[13px] text-secondary-800 truncate font-mono">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReveal(selectedItem.item.path)}
                  className="h-8 px-3 rounded-lg border border-secondary-200 text-xs text-secondary-600 hover:bg-secondary-50 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                  Reveal in Finder
                </button>
                <button
                  onClick={() => handleOpenFolder(selectedItem.item.path)}
                  className="h-8 px-3 rounded-lg border border-secondary-200 text-xs text-secondary-600 hover:bg-secondary-50 flex items-center gap-1.5"
                >
                  <FolderOpenIcon className="w-3 h-3" strokeWidth={1.8} />
                  Open folder
                </button>
                <button
                  onClick={() => handleDelete(selectedItem.item.path)}
                  className="h-8 px-3 rounded-lg border border-red-100 bg-red-50 text-xs text-red-500 hover:bg-red-100 flex items-center gap-1.5 ml-auto"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state before scan */}
      {!scanResult && !scanning && (
        <div className="bg-white border border-secondary-100 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-50 border border-secondary-100 flex items-center justify-center mb-4">
            <Scan className="w-5 h-5 text-secondary-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-secondary-600 mb-1">Nothing scanned yet</p>
          <p className="text-xs text-secondary-400 max-w-xs leading-relaxed">
            Enter a path above and click Scan to see what's taking up space.
            Start with your home directory for the best overview.
          </p>
          <div className="mt-6 flex gap-2">
            {[
              "/Users/" + (typeof process !== "undefined" ? (process.env?.USER ?? "you") : "you"),
              "~/Downloads",
              "~/Documents",
            ].map(p => (
              <button
                key={p}
                onClick={() => { setSelectedPath(p); }}
                className="h-7 px-3 rounded-lg border border-secondary-200 text-[11px] text-secondary-500 hover:bg-secondary-50 font-mono"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}