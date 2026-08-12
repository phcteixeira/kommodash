"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PipelineFilter({
  pipelines,
  current,
}: {
  pipelines: { id: number; name: string }[];
  current: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipeline", value);
    router.push(`?${params.toString()}`);
  }

  if (pipelines.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      Funil
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      >
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
