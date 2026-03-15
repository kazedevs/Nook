import { useRef, useEffect, useState } from "react";
import { FileItem } from "@/types";
import { formatBytes } from "@/utils/format";

interface Props {
  data: FileItem[];
  onNodeClick?: (item: FileItem) => void;
}

interface Node {
  item: FileItem;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Tooltip {
  name: string;
  size: string;
  x: number;
  y: number;
  visible: boolean;
}

const COLORS = [
  "#1E2A1A",
  "#1A1E2A",
  "#221A2A",
  "#2A1E1A",
  "#2A2A1A",
  "#1A2A26",
  "#222222",
  "#2A1A22",
  "#1A2228",
  "#1E2620",
];
const TEXT_COLORS = [
  "#3B6D11",
  "#185FA5",
  "#534AB7",
  "#993C1D",
  "#854F0B",
  "#0F6E56",
  "#444441",
  "#993556",
  "#0C447C",
  "#3B6D11",
];

function squarify(
  items: FileItem[],
  x: number,
  y: number,
  w: number,
  h: number,
): Node[] {
  if (!items.length || w < 1 || h < 1) return [];
  const total = items.reduce((s, i) => s + i.size, 0);
  if (!total) return [];
  const sorted = [...items].sort((a, b) => b.size - a.size);
  const nodes: Node[] = [];
  let cx = x,
    cy = y,
    rw = w,
    rh = h;
  for (const item of sorted) {
    const ratio = item.size / total;
    let nw: number, nh: number;
    if (rw >= rh) {
      nw = rw * ratio;
      nh = rh;
      cx += nw;
      rw -= nw;
    } else {
      nw = rw;
      nh = rh * ratio;
      cy += nh;
      rh -= nh;
    }
    nodes.push({
      item,
      x: rw >= rh ? cx - nw : cx,
      y: rh > rw ? cy - nh : cy,
      w: nw,
      h: nh,
    });
  }
  return nodes;
}

export function Treemap({ data, onNodeClick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tooltip, setTooltip] = useState<Tooltip>({
    name: "",
    size: "",
    x: 0,
    y: 0,
    visible: false,
  });
  const [width, setWidth] = useState(600);
  const H = 280;

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth(w);
      setNodes(squarify(data, 0, 0, w, H));
    });
    if (wrapRef.current) {
      obs.observe(wrapRef.current);
      const iw = wrapRef.current.getBoundingClientRect().width;
      if (iw > 0) {
        setWidth(iw);
        setNodes(squarify(data, 0, 0, iw, H));
      }
    }
    return () => obs.disconnect();
  }, [data]);

  useEffect(() => {
    if (width > 0) setNodes(squarify(data, 0, 0, width, H));
  }, [data, width]);

  if (!data.length)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: H,
          background: "#141414",
          borderRadius: 6,
          border: "0.5px solid #1E1E1E",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "#666",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          no data
        </p>
      </div>
    );

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: H,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <svg
        width={width}
        height={H}
        style={{ display: "block", userSelect: "none" }}
      >
        {nodes.map((n, i) => (
          <g
            key={i}
            onClick={() => onNodeClick?.(n.item)}
            onMouseMove={(e) => {
              const bnd = wrapRef.current!.getBoundingClientRect();
              let lx = e.clientX - bnd.left + 12,
                ly = e.clientY - bnd.top + 12;
              if (lx + 150 > width) lx -= 162;
              setTooltip({
                name: n.item.name,
                size: formatBytes(n.item.size),
                x: lx,
                y: ly,
                visible: true,
              });
            }}
            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={n.x + 1}
              y={n.y + 1}
              width={Math.max(n.w - 2, 0)}
              height={Math.max(n.h - 2, 0)}
              rx={3}
              fill={COLORS[i % COLORS.length]}
              stroke="#0A0A0A"
              strokeWidth={1.5}
            />
            {n.w > 55 && n.h > 28 && (
              <text
                x={n.x + 8}
                y={n.y + 17}
                fontSize={11}
                fontWeight={500}
                fill={TEXT_COLORS[i % TEXT_COLORS.length]}
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                {n.item.name.length > Math.floor((n.w - 16) / 7)
                  ? n.item.name.slice(0, Math.floor((n.w - 16) / 7)) + "…"
                  : n.item.name}
              </text>
            )}
            {n.w > 55 && n.h > 42 && (
              <text
                x={n.x + 8}
                y={n.y + 31}
                fontSize={9}
                fill={TEXT_COLORS[i % TEXT_COLORS.length]}
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  opacity: 0.7,
                }}
              >
                {formatBytes(n.item.size)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            pointerEvents: "none",
            background: "#0F0F0F",
            border: "0.5px solid #2A2A2A",
            borderRadius: 6,
            padding: "7px 10px",
            zIndex: 10,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#C8C4BE",
              marginBottom: 2,
            }}
          >
            {tooltip.name}
          </p>
          <p style={{ fontSize: 10, color: "#777" }}>{tooltip.size}</p>
        </div>
      )}
    </div>
  );
}
