"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CLOSINGS_PERIODS, type ClosingsPeriodKey } from "@/lib/date-range";

interface Props {
  current: ClosingsPeriodKey;
  /** Valores atuais (yyyy-MM-dd) para pré-preencher os campos de data, mesmo fora do modo "Personalizado". */
  from: string;
  to: string;
}

export function ClosingsPeriodFilter({ current, from, to }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function navigate(params: URLSearchParams) {
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function onPeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    if (value === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    } else {
      params.delete("from");
      params.delete("to");
    }
    navigate(params);
  }

  function onCustomDateChange(field: "from" | "to", value: string) {
    if (field === "from") setCustomFrom(value);
    else setCustomTo(value);

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", field === "from" ? value : customFrom);
    params.set("to", field === "to" ? value : customTo);
    navigate(params);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
      Período
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
      >
        {Object.entries(CLOSINGS_PERIODS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      {current === "custom" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            disabled={isPending}
            onChange={(e) => onCustomDateChange("from", e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
          />
          <span className="text-[var(--muted)]">até</span>
          <input
            type="date"
            value={customTo}
            disabled={isPending}
            onChange={(e) => onCustomDateChange("to", e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
          />
        </div>
      ) : null}

      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2a78d6]" /> : null}
    </div>
  );
}
