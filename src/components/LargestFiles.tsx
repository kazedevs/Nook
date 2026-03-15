import { FileItem } from "@/types";
import { formatBytes } from "@/utils/format";
import { Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";

interface Props {
  files: FileItem[];
  onDelete?: (path: string) => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
};

export function LargestFiles({ files, onDelete }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleReveal = (path: string) =>
    invoke("reveal_in_finder", { path }).catch(console.error);
  const handleOpenFolder = (path: string) =>
    invoke("open_containing_folder", { path }).catch(console.error);
  const handleDelete = async (path: string) => {
    if (!confirm(`delete "${path}"?`)) return;
    try {
      await invoke("delete_file_or_directory", { request: { path } });
      onDelete?.(path);
    } catch {
      alert("failed to delete. check permissions.");
    }
  };

  if (!files?.length)
    return (
      <div style={card}>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#666",
            marginBottom: 10,
            ...mono,
          }}
        >
          largest files
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 80,
            fontSize: 11,
            color: "#555",
            ...mono,
          }}
        >
          no files found
        </div>
      </div>
    );

  return (
    <div style={card}>
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#333",
          marginBottom: 10,
          ...mono,
        }}
      >
        largest files
      </p>
      <div>
        {files.slice(0, 20).map((file, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              background: hoveredIdx === i ? "#141414" : "transparent",
              transition: "background 0.1s",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#555",
                width: 16,
                textAlign: "right",
                flexShrink: 0,
                ...mono,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#AAA",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "250px",
                  ...mono,
                }}
              >
                {file.name}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#666",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "250px",
                  ...mono,
                }}
              >
                {file.path}
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#777",
                flexShrink: 0,
                minWidth: 52,
                textAlign: "right",
                ...mono,
              }}
            >
              {formatBytes(file.size)}
            </span>
            <div
              style={{
                display: "flex",
                gap: 2,
                opacity: hoveredIdx === i ? 1 : 0,
                transition: "opacity 0.1s",
              }}
            >
              {[
                {
                  icon: ExternalLink,
                  action: () => handleReveal(file.path),
                  title: "reveal",
                  hoverBg: "#0D1422",
                },
                {
                  icon: FolderOpen,
                  action: () => handleOpenFolder(file.path),
                  title: "open",
                  hoverBg: "#141414",
                },
                {
                  icon: Trash2,
                  action: () => handleDelete(file.path),
                  title: "delete",
                  hoverBg: "#0D0900",
                  color: "#633806",
                },
              ].map(({ icon: Icon, action, title, hoverBg, color }) => (
                <button
                  key={title}
                  onClick={action}
                  title={title}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "none",
                    background: "transparent",
                    color: color ?? "#666",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Icon style={{ width: 12, height: 12 }} strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
