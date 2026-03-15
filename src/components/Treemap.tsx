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
  "#B5D4F4",
  "#9FE1CB",
  "#CECBF6",
  "#F5C4B3",
  "#FAC775",
  "#C0DD97",
  "#D3D1C7",
  "#F4C0D1",
  "#85B7EB",
  "#5DCAA5",
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
  const [width, setWidth] = useState(600); // Initial width
  const H = 320;

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth(w);
      setNodes(squarify(data, 0, 0, w, H));
    });
    if (wrapRef.current) {
      obs.observe(wrapRef.current);
      // Set initial width if ResizeObserver doesn't fire immediately
      const initialWidth = wrapRef.current.getBoundingClientRect().width;
      if (initialWidth > 0) {
        setWidth(initialWidth);
        setNodes(squarify(data, 0, 0, initialWidth, H));
      }
    }
    return () => obs.disconnect();
  }, [data]);

  // Fallback: ensure nodes are calculated when data changes
  useEffect(() => {
    if (width > 0) {
      setNodes(squarify(data, 0, 0, width, H));
    }
  }, [data, width, H]);

  if (!data.length)
    return (
      <div className="flex items-center justify-center h-64 bg-secondary-50 rounded-lg border border-secondary-100">
        <p className="text-sm text-secondary-400">No data to display</p>
      </div>
    );

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-lg overflow-hidden"
      style={{ height: H }}
    >
      <svg width={width} height={H} className="select-none block">
        {nodes.map((n, i) => (
          <g
            key={i}
            onClick={() => onNodeClick?.(n.item)}
            onMouseMove={(e) => {
              const bnd = wrapRef.current!.getBoundingClientRect();
              let lx = e.clientX - bnd.left + 12;
              let ly = e.clientY - bnd.top + 12;
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
              rx={4}
              fill={COLORS[i % COLORS.length]}
              stroke="white"
              strokeWidth={1.5}
            />
            {n.w > 55 && n.h > 28 && (
              <text
                x={n.x + 8}
                y={n.y + 18}
                fontSize={12}
                fontWeight={500}
                fill="#2C2C2A"
              >
                {n.item.name.length > Math.floor((n.w - 16) / 7.5)
                  ? n.item.name.slice(0, Math.floor((n.w - 16) / 7.5)) + "…"
                  : n.item.name}
              </text>
            )}
            {n.w > 55 && n.h > 44 && (
              <text x={n.x + 8} y={n.y + 34} fontSize={10} fill="#5F5E5A">
                {formatBytes(n.item.size)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs shadow-sm z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-medium text-secondary-900 mb-0.5">
            {tooltip.name}
          </p>
          <p className="text-secondary-500">{tooltip.size}</p>
        </div>
      )}
    </div>
  );
}
