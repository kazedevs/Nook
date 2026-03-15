import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileTypeStat } from "@/types";
import { formatBytes } from "@/utils/format";

const COLORS = [
  "#B5D4F4",
  "#9FE1CB",
  "#CECBF6",
  "#F5C4B3",
  "#FAC775",
  "#C0DD97",
  "#D3D1C7",
  "#F4C0D1",
];

interface Props {
  fileTypes: FileTypeStat[];
  maxItems?: number;
}

export function StorageBreakdown({ fileTypes, maxItems = 8 }: Props) {
  const sorted = [...(fileTypes ?? [])]
    .sort((a, b) => b.total_size - a.total_size)
    .slice(0, maxItems);

  const total = sorted.reduce((s, t) => s + t.total_size, 0);

  const chartData = sorted.map((t) => ({
    name: "." + t.extension,
    value: t.total_size,
    percentage: Math.round((t.total_size / total) * 100),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs shadow-sm">
          <p className="font-medium text-secondary-900">{payload[0].name}</p>
          <p className="text-secondary-500">
            {formatBytes(payload[0].value)} ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (!sorted.length)
    return (
      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-[11px] font-medium text-secondary-400 mb-3">
          storage breakdown
        </p>
        <div className="flex items-center justify-center h-24 text-secondary-300 text-sm">
          No data
        </div>
      </div>
    );

  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <p className="text-[11px] font-medium text-secondary-400 mb-4">
        storage breakdown
      </p>
      <div className="flex items-center gap-6">
        <div className="w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={80}
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
        <div className="flex-1 space-y-0.5">
          {sorted.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1.5 border-b border-secondary-50 last:border-0"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-[12px] text-secondary-700 flex-1">
                .{t.extension}
              </span>
              <span className="text-[11px] text-secondary-500">
                {formatBytes(t.total_size)}
              </span>
              <span className="text-[11px] text-secondary-300 w-8 text-right">
                {Math.round((t.total_size / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
