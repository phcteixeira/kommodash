"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHROME } from "@/lib/palette";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function DonutChart({ data, height = 260 }: { data: DonutSlice[]; height?: number }) {
  const hasValues = data.some((d) => d.value > 0);
  if (!hasValues) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--muted)]">
        Sem dados no período selecionado.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={2} stroke={CHROME.light.surface} strokeWidth={2}>
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: CHROME.light.textSecondary }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
