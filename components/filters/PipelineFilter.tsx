"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function PipelineFilter({
  pipelines,
  current,
}: {
  pipelines: { id: number; name: string }[];
  current: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipeline", value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  if (pipelines.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Funil
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
      >
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2a78d6]" /> : null}
    </label>
  );
}
