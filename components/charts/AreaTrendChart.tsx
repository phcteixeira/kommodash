"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHROME, CATEGORICAL } from "@/lib/palette";
import type { ValueFormat } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: Record<string, string | number>[];
  categoryKey: string;
  valueKey: string;
  name: string;
  height?: number;
  valueFormat?: ValueFormat;
  currency?: string;
}

export function AreaTrendChart({ data, categoryKey, valueKey, name, height = 320, valueFormat, currency }: Props) {
  const color = CATEGORICAL[0];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHROME.light.gridline} vertical={false} />
        <XAxis dataKey={categoryKey} stroke={CHROME.light.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHROME.light.baseline }} />
        <YAxis stroke={CHROME.light.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHROME.light.baseline }} />
        <Tooltip content={<ChartTooltip valueFormat={valueFormat} currency={currency} />} cursor={{ stroke: CHROME.light.baseline, strokeWidth: 1 }} />
        <Area type="monotone" dataKey={valueKey} name={name} stroke={color} strokeWidth={2} fill="url(#areaFill)" dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
