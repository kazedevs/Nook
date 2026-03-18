import { FileItem } from "@/types";
import { formatBytes } from "@/utils/format";

const COLORS = [
  "#3B6D11",
  "#185FA5",
  "#534AB7",
  "#993C1D",
  "#854F0B",
  "#0F6E56",
  "#5F5E5A",
  "#993556",
  "#0C447C",
  "#3B6D11",
];

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
};

interface Props {
  folders: FileItem[];
  maxItems?: number;
}

export function FolderSizeChart({ folders, maxItems = 10 }: Props) {
  if (!folders?.length)
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
          top folders
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
          no folders found
        </div>
      </div>
    );

  const sorted = [...folders]
    .filter((f) => f.is_directory)
    .sort((a, b) => b.size - a.size)
    .slice(0, maxItems);
  const max = sorted[0]?.size ?? 1;

  return (
    <div style={card}>
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#666",
          marginBottom: 12,
          ...mono,
        }}
      >
        top folders
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((folder, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#777",
                width: 100,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...mono,
              }}
              title={folder.name}
            >
              {folder.name}
            </span>
            <div
              style={{
                flex: 1,
                background: "#161616",
                borderRadius: 2,
                height: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  width: `${Math.max((folder.size / max) * 100, 2)}%`,
                  background: COLORS[i % COLORS.length],
                  transition: "width 0.5s",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                color: "#666",
                width: 52,
                textAlign: "right",
                flexShrink: 0,
                ...mono,
              }}
            >
              {formatBytes(folder.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
