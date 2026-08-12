"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RANGE_PRESETS, type RangeKey } from "@/lib/date-range";

export function DateRangeFilter({ current }: { current: RangeKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Período
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      >
        {Object.entries(RANGE_PRESETS).map(([key, preset]) => (
          <option key={key} value={key}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
