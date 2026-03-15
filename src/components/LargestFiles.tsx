import { FileItem } from "@/types"
import { formatBytes } from "@/utils/format"
import { Trash2, ExternalLink, FolderOpen } from "lucide-react"
import { invoke } from "@tauri-apps/api/tauri"

interface Props {
  files: FileItem[]
  onDelete?: (path: string) => void
}

export function LargestFiles({ files, onDelete }: Props) {
  const handleReveal = (path: string) =>
    invoke("reveal_in_finder", { path }).catch(console.error)

  const handleOpenFolder = (path: string) =>
    invoke("open_containing_folder", { path }).catch(console.error)

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete "${path}"? This cannot be undone.`)) return
    try {
      await invoke("delete_file_or_directory", { request: { path } })
      onDelete?.(path)
    } catch {
      alert("Failed to delete. Check permissions and try again.")
    }
  }

  if (!files?.length) return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <p className="text-[11px] font-medium text-secondary-400 mb-3">largest files</p>
      <div className="flex items-center justify-center h-24 text-secondary-300 text-sm">No files found</div>
    </div>
  )

  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <p className="text-[11px] font-medium text-secondary-400 mb-3">largest files</p>
      <div>
        {files.slice(0, 20).map((file, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary-50 transition-colors group">
            <span className="text-[11px] text-secondary-300 w-4 text-right flex-shrink-0">{i + 1}</span>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-secondary-900 truncate">{file.name}</p>
              <p className="text-[10px] text-secondary-400 truncate">{file.path}</p>
            </div>

            <span className="text-xs text-secondary-600 flex-shrink-0 min-w-[52px] text-right">
              {formatBytes(file.size)}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleReveal(file.path)}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-blue-50 transition-colors"
                title="Reveal in Finder"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.8} />
              </button>
              <button
                onClick={() => handleOpenFolder(file.path)}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary-100 transition-colors"
                title="Open containing folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-secondary-400" strokeWidth={1.8} />
              </button>
              <button
                onClick={() => handleDelete(file.path)}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}