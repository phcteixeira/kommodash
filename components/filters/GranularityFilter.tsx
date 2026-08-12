"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TimeGranularity } from "@/lib/kommo/aggregate";

const OPTIONS: { value: TimeGranularity; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function GranularityFilter({ current }: { current: TimeGranularity }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("granularity", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Agrupar por
      <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              current === opt.value
                ? "bg-[#2a78d6] text-white"
                : "text-[var(--text-secondary)] hover:bg-black/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
