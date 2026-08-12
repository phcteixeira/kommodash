"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { TimeGranularity } from "@/lib/kommo/aggregate";

const OPTIONS: { value: TimeGranularity; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function GranularityFilter({ current }: { current: TimeGranularity }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("granularity", value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Período
      <div
        className={`flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={isPending}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors disabled:cursor-wait ${
              current === opt.value
                ? "bg-[#2a78d6] text-white"
                : "text-[var(--text-secondary)] hover:bg-black/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2a78d6]" /> : null}
    </div>
  );
}
