"use client";

import type { TooltipProps } from "recharts";
import { formatValue, type ValueFormat } from "@/lib/format";

interface Props extends TooltipProps<number, string> {
  valueFormat?: ValueFormat;
  currency?: string;
}

export function ChartTooltip({ active, payload, label, valueFormat, currency }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  // Em gráficos empilhados com dados esparsos (ex.: um produto sem leads em
  // um período), o Recharts ainda inclui a série no payload com valor undefined.
  const visible = payload.filter((entry) => entry.value !== undefined && entry.value !== null);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md">
      {label ? <div className="mb-1 font-medium text-[var(--text-primary)]">{label}</div> : null}
      <div className="flex flex-col gap-0.5">
        {visible.map((entry) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-[var(--text-secondary)]">{entry.name}:</span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {typeof entry.value === "number"
                ? formatValue(entry.value, valueFormat, currency)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
