import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildActivitySummary } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { Table } from "@/components/ui/Table";
import { STATUS, CATEGORICAL } from "@/lib/palette";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { tasks, users } = dataset;

  const activities = buildActivitySummary(tasks, users);
  const totalCompleted = activities.reduce((s, a) => s + a.completed, 0);
  const totalOverdue = activities.reduce((s, a) => s + a.overdue, 0);
  const totalUpcoming = activities.reduce((s, a) => s + a.upcoming, 0);

  const chartData = activities.slice(0, 10).map((a) => ({
    user: a.userName,
    completed: a.completed,
    overdue: a.overdue,
    upcoming: a.upcoming,
  }));

  return (
    <div>
      <PageHeader
        title="Atividades e tarefas"
        description="Tarefas concluídas, atrasadas e futuras por responsável."
        filters={<DateRangeFilter current={rangeKey} />}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Concluídas" value={formatNumber(totalCompleted)} icon={CheckCircle2} accent="good" />
        <KpiCard label="Atrasadas" value={formatNumber(totalOverdue)} icon={AlertTriangle} accent={totalOverdue > 0 ? "critical" : "neutral"} />
        <KpiCard label="Futuras" value={formatNumber(totalUpcoming)} icon={Clock} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Tarefas por responsável</h2>
        <BarComparisonChart
          data={chartData}
          categoryKey="user"
          series={[
            { key: "completed", name: "Concluídas", color: STATUS.good },
            { key: "overdue", name: "Atrasadas", color: STATUS.critical },
            { key: "upcoming", name: "Futuras", color: CATEGORICAL[0] },
          ]}
          layout="horizontal"
          height={320}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Detalhamento</h2>
        <Table
          keyFor={(a) => a.userId}
          rows={activities}
          columns={[
            { header: "Responsável", cell: (a) => a.userName },
            { header: "Total", cell: (a) => formatNumber(a.total), align: "right" },
            { header: "Concluídas", cell: (a) => formatNumber(a.completed), align: "right" },
            { header: "Atrasadas", cell: (a) => formatNumber(a.overdue), align: "right" },
            { header: "Futuras", cell: (a) => formatNumber(a.upcoming), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
