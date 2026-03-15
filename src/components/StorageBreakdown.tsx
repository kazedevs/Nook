import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileTypeStat } from "@/types";
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
];

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
};

interface Props {
  fileTypes: FileTypeStat[];
  maxItems?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = payload.reduce(
      (sum: number, entry: any) => sum + entry.value,
      0,
    );
    return (
      <div
        style={{
          background: "#1A1A1A",
          border: "0.5px solid #2A2A2A",
          borderRadius: 4,
          padding: "6px 8px",
          fontSize: 10,
          color: "#C8C4BE",
          ...mono,
        }}
      >
        <div style={{ marginBottom: 2 }}>.{data.payload.extension}</div>
        <div>
          {formatBytes(data.value)} ({Math.round((data.value / total) * 100)}%)
        </div>
      </div>
    );
  }
  return null;
};

export function StorageBreakdown({ fileTypes, maxItems = 8 }: Props) {
  const sorted = [...(fileTypes ?? [])]
    .sort((a, b) => b.total_size - a.total_size)
    .slice(0, maxItems);
  const total = sorted.reduce((s, t) => s + t.total_size, 0);

  if (!sorted.length)
    return (
      <div style={card}>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#777",
            marginBottom: 10,
            ...mono,
          }}
        >
          storage breakdown
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
          no data
        </div>
      </div>
    );

  const chartData = sorted.map((t) => ({
    name: t.extension,
    value: t.total_size,
    extension: t.extension,
  }));

  return (
    <div style={card}>
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#777",
          marginBottom: 12,
          ...mono,
        }}
      >
        storage breakdown
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 130, height: 130, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1 }}>
          {sorted.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 0",
                borderBottom:
                  i < sorted.length - 1 ? "0.5px solid #161616" : "none",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: COLORS[i % COLORS.length],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: "#666", flex: 1, ...mono }}>
                .{t.extension}
              </span>
              <span style={{ fontSize: 10, color: "#444", ...mono }}>
                {formatBytes(t.total_size)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#555",
                  width: 28,
                  textAlign: "right",
                  ...mono,
                }}
              >
                {Math.round((t.total_size / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
