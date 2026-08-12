import { loadKommoDataset, loadProductLinkEvents, resolveLeadNames } from "@/lib/kommo/dataset";
import { buildClosings } from "@/lib/kommo/aggregate";
import { resolveClosingsWindow, toDateInputValue } from "@/lib/date-range";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingsPeriodFilter } from "@/components/filters/ClosingsPeriodFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { FileSignature, Package, TrendingUp, Clock3 } from "lucide-react";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period, from: fromParam, to: toParam } = await searchParams;
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, eventsResult] = await Promise.all([
    loadKommoDataset({ createdFrom: window.from, createdTo: window.to }),
    loadProductLinkEvents({ from: window.from, to: window.to }),
  ]);
  const { leads, catalogElements } = dataset;

  const isDemo = datasetIsDemo || eventsResult.isDemo;
  const error = datasetError ?? eventsResult.error;

  const leadNameById = await resolveLeadNames(leads, eventsResult.events);
  const report = buildClosings(leads, catalogElements, eventsResult.events, window, leadNameById);
  const topProduct = report.productSummary[0];

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Produtos vinculados a leads ('fechamentos') no período selecionado, pela data em que o vínculo aconteceu."
        filters={
          <ClosingsPeriodFilter
            current={window.key}
            from={toDateInputValue(window.from)}
            to={toDateInputValue(window.to)}
          />
        }
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Fechamentos no período" value={formatNumber(report.totalClosings)} icon={FileSignature} />
        <KpiCard label="Produtos distintos" value={formatNumber(report.productSummary.length)} icon={Package} />
        <KpiCard
          label="Produto mais vendido"
          value={topProduct ? topProduct.productName : "—"}
          icon={TrendingUp}
          hint={topProduct ? `${formatNumber(topProduct.count)} fechamentos` : undefined}
        />
        <KpiCard
          label="Datas aproximadas"
          value={formatNumber(report.approximateCount)}
          icon={Clock3}
          hint="Sem evento de vínculo — usamos a data de criação do lead"
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Fechamentos</h2>
        <Table
          keyFor={(r) => `${r.leadId}:${r.productId}`}
          rows={report.rows}
          columns={[
            { header: "Nome do Lead", cell: (r) => r.leadName },
            { header: "Produto", cell: (r) => r.productName },
            {
              header: "Data da contratação",
              cell: (r) => (
                <span>
                  {formatDate(r.closedAt)}
                  {r.isApproximate ? <span className="ml-1 text-[var(--muted)]">(aprox.)</span> : null}
                </span>
              ),
              align: "right",
            },
          ]}
        />
        {report.approximateCount > 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            (aprox.): sem evento de vínculo registrado na Kommo — a data de criação do lead foi usada como
            aproximação.
          </p>
        ) : null}
      </div>
    </div>
  );
}
