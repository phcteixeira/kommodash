import { loadKommoDataset, loadLossReasons } from "@/lib/kommo/dataset";
import { buildLossReasons, buildStatusTypeMap } from "@/lib/kommo/aggregate";
import { resolveClosingsWindow, toDateInputValue } from "@/lib/date-range";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingsPeriodFilter } from "@/components/filters/ClosingsPeriodFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { XCircle, Layers, AlertTriangle } from "lucide-react";

export default async function PerdasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period, from: fromParam, to: toParam } = await searchParams;
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, lossReasonsResult] = await Promise.all([
    loadKommoDataset({ closedFrom: window.from, closedTo: window.to }),
    loadLossReasons(),
  ]);
  const { leads, pipelines } = dataset;

  const isDemo = datasetIsDemo || lossReasonsResult.isDemo;
  const error = datasetError ?? lossReasonsResult.error;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const report = buildLossReasons(leads, lossReasonsResult.lossReasons, statusTypeMap, window);
  const topReason = report.rows[0];

  return (
    <div>
      <PageHeader
        title="Perdas"
        description="Leads perdidos no período selecionado, agrupados pelo motivo de perda."
        filters={
          <ClosingsPeriodFilter
            current={window.key}
            from={toDateInputValue(window.from)}
            to={toDateInputValue(window.to)}
          />
        }
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Perdas no período" value={formatNumber(report.totalLosses)} icon={XCircle} accent={report.totalLosses > 0 ? "critical" : "neutral"} />
        <KpiCard label="Motivos distintos" value={formatNumber(report.rows.length)} icon={Layers} />
        <KpiCard
          label="Motivo principal"
          value={topReason ? topReason.reasonName : "—"}
          icon={AlertTriangle}
          hint={topReason ? `${formatNumber(topReason.count)} perdas` : undefined}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Perdas por motivo</h2>
        <Table
          keyFor={(r) => r.reasonId}
          rows={report.rows}
          columns={[
            { header: "Motivo de perda", cell: (r) => r.reasonName },
            { header: "Quantidade", cell: (r) => formatNumber(r.count), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
