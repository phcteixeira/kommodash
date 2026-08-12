"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RANGE_PRESETS, type RangeKey } from "@/lib/date-range";

export function DateRangeFilter({ current }: { current: RangeKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Período
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
      >
        {Object.entries(RANGE_PRESETS).map(([key, preset]) => (
          <option key={key} value={key}>
            {preset.label}
          </option>
        ))}
      </select>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2a78d6]" /> : null}
    </label>
  );
}
