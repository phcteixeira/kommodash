"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHROME } from "@/lib/palette";
import type { ValueFormat } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";

export interface BarSeries {
  key: string;
  name: string;
  color: string;
}

interface Props {
  data: Record<string, string | number>[];
  categoryKey: string;
  series: BarSeries[];
  layout?: "horizontal" | "vertical";
  height?: number;
  valueFormat?: ValueFormat;
  currency?: string;
  /** Quando informado (e houver apenas 1 série), cada barra usa a cor de data[i][colorKey]. */
  colorKey?: string;
}

export function BarComparisonChart({
  data,
  categoryKey,
  series,
  layout = "vertical",
  height = 320,
  valueFormat,
  currency,
  colorKey,
}: Props) {
  const perBarColor = colorKey && series.length === 1;
  const isVertical = layout === "vertical"; // barras horizontais (categorias no eixo Y)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        barGap={2}
      >
        <CartesianGrid stroke={CHROME.light.gridline} horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" stroke={CHROME.light.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHROME.light.baseline }} />
            <YAxis
              type="category"
              dataKey={categoryKey}
              stroke={CHROME.light.muted}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: CHROME.light.baseline }}
              width={140}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} stroke={CHROME.light.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHROME.light.baseline }} />
            <YAxis stroke={CHROME.light.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHROME.light.baseline }} />
          </>
        )}
        <Tooltip content={<ChartTooltip valueFormat={valueFormat} currency={currency} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, color: CHROME.light.textSecondary }} /> : null}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={4} maxBarSize={28}>
            {perBarColor
              ? data.map((row, i) => <Cell key={i} fill={String(row[colorKey as string])} />)
              : null}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
