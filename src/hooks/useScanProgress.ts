import { useEffect, useRef, useState, useCallback } from "react"
import { listen, UnlistenFn } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/tauri"
import { ScanResult, ScanRequest } from "@/types"

interface ScanProgressEvent {
  path: string
  files_found: number
  dirs_found: number
  bytes_found: number
  pct: number
}

interface UseScanReturn {
  scan: (path: string, maxDepth: number, ignoreHidden: boolean, ignoreSystem: boolean) => Promise<void>
  cancel: () => void
  scanning: boolean
  progress: number          // 0–100
  filesFound: number        // live counter
  bytesFound: number        // live counter
  currentPath: string       // path currently being scanned
  result: ScanResult | null
  error: string
}

export function useScanProgress(): UseScanReturn {
  const [scanning, setScanning]       = useState(false)
  const [progress, setProgress]       = useState(0)
  const [filesFound, setFilesFound]   = useState(0)
  const [bytesFound, setBytesFound]   = useState(0)
  const [currentPath, setCurrentPath] = useState("")
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [error, setError]             = useState("")
  const cancelledRef = useRef(false)
  const unlistenRef  = useRef<UnlistenFn | null>(null)

  // Clean up listener on unmount.
  useEffect(() => () => { unlistenRef.current?.() }, [])

  const scan = useCallback(async (
    path: string,
    maxDepth: number,
    ignoreHidden: boolean,
    ignoreSystem: boolean,
  ) => {
    cancelledRef.current = false
    setScanning(true)
    setError("")
    setResult(null)
    setProgress(0)
    setFilesFound(0)
    setBytesFound(0)
    setCurrentPath(path)

    // Subscribe to real progress events from Rust.
    unlistenRef.current?.()
    unlistenRef.current = await listen<ScanProgressEvent>("scan_progress", ev => {
      if (cancelledRef.current) return
      setProgress(ev.payload.pct)
      setFilesFound(ev.payload.files_found)
      setBytesFound(ev.payload.bytes_found)
    })

    try {
      const req: ScanRequest & { ignore_hidden: boolean; ignore_system: boolean } = {
        path,
        max_depth: maxDepth,
        ignore_hidden: ignoreHidden,
        ignore_system: ignoreSystem,
      }
      const data = await invoke<ScanResult>("scan_directory", { request: req })
      if (!cancelledRef.current) setResult(data)
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      unlistenRef.current?.()
      setScanning(false)
      setProgress(100)
    }
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    unlistenRef.current?.()
    setScanning(false)
    setProgress(0)
  }, [])

  return { scan, cancel, scanning, progress, filesFound, bytesFound, currentPath, result, error }
}
