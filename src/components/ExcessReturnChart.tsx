"use client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from "recharts";
import type { EnrichedEntry } from "@/lib/types";

const GRADE_COLORS: Record<string, string> = {
  BULL_HIT: "#8b5cf6",
  WIN: "#10b981",
  NEUTRAL: "#f59e0b",
  MISS: "#ef4444",
  UNGRADED: "#6b7280",
};

export default function ExcessReturnChart({ entries }: { entries: EnrichedEntry[] }) {
  const data = entries
    .filter((e) => e.excess_return !== null)
    .map((e) => ({
      ticker: e.ticker,
      excess: (e.excess_return as number) * 100,
      grade: e.grade,
    }))
    .sort((a, b) => b.excess - a.excess);

  if (data.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No data to chart
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: Math.max(120, data.length * 32) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 8, bottom: 8 }}>
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={{ stroke: "#374151" }}
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fill: "#f9fafb", fontSize: 12 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
            width={70}
          />
          <Tooltip
            cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
            contentStyle={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 4,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f9fafb" }}
            formatter={(v: any) => [`${v.toFixed(1)}%`, "Excess"]}
          />
          <ReferenceLine x={0} stroke="#374151" />
          <Bar dataKey="excess">
            {data.map((d, i) => (
              <Cell key={i} fill={GRADE_COLORS[d.grade] || "#6b7280"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
