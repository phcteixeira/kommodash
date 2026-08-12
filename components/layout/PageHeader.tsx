import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  filters,
}: {
  title: string;
  description?: string;
  filters?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      {filters ? <div className="flex flex-wrap items-center gap-3">{filters}</div> : null}
    </div>
  );
}
