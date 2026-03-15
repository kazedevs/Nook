import { FileItem } from "@/types"
import { formatBytes } from "@/utils/format"

const COLORS = [
  '#B5D4F4','#9FE1CB','#CECBF6','#F5C4B3','#FAC775',
  '#C0DD97','#D3D1C7','#F4C0D1','#85B7EB','#5DCAA5',
]

interface Props {
  folders: FileItem[]
  maxItems?: number
}

export function FolderSizeChart({ folders, maxItems = 10 }: Props) {
  if (!folders?.length) return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <p className="text-[11px] font-medium text-secondary-400 mb-3">top folders</p>
      <div className="flex items-center justify-center h-24 text-secondary-300 text-sm">No folders found</div>
    </div>
  )

  const sorted = [...folders]
    .filter(f => f.is_directory)
    .sort((a, b) => b.size - a.size)
    .slice(0, maxItems)

  const max = sorted[0]?.size ?? 1

  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <p className="text-[11px] font-medium text-secondary-400 mb-4">top folders</p>
      <div className="space-y-3">
        {sorted.map((folder, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] text-secondary-700 w-28 flex-shrink-0 truncate" title={folder.name}>
              {folder.name}
            </span>
            <div className="flex-1 bg-secondary-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((folder.size / max) * 100, 2)}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
            <span className="text-[11px] text-secondary-500 w-14 text-right flex-shrink-0">
              {formatBytes(folder.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}