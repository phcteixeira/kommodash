import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  accent?: "neutral" | "good" | "critical";
}

const accentClasses: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  neutral: "text-[var(--text-primary)]",
  good: "text-[#0ca30c]",
  critical: "text-[#d03b3b]",
};

export function KpiCard({ label, value, icon: Icon, hint, accent = "neutral" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-[var(--muted)]" /> : null}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accentClasses[accent]}`}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}
