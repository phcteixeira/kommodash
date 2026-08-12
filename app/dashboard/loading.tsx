import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando dados da Kommo…
      </div>

      <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="h-3.5 w-24 rounded bg-black/10" />
            <div className="mt-3 h-6 w-16 rounded bg-black/10" />
          </div>
        ))}
      </div>

      <div className="mt-6 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="h-3.5 w-48 rounded bg-black/10" />
        <div className="mt-4 h-64 rounded-lg bg-black/5" />
      </div>
    </div>
  );
}
