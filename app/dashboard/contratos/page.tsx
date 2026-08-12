import { loadKommoDataset, loadProductLinkEvents, resolveLeadNames } from "@/lib/kommo/dataset";
import { buildClosings } from "@/lib/kommo/aggregate";
import { resolveClosingsWindow, toDateInputValue } from "@/lib/date-range";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContratosFilterBar } from "@/components/filters/ContratosFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { FileSignature, Package, TrendingUp, Clock3 } from "lucide-react";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; product?: string }>;
}) {
  const { period, from: fromParam, to: toParam, product: productParam } = await searchParams;
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, eventsResult] = await Promise.all([
    loadKommoDataset({ createdFrom: window.from, createdTo: window.to }),
    loadProductLinkEvents({ from: window.from, to: window.to }),
  ]);
  const { leads, catalogElements } = dataset;

  const isDemo = datasetIsDemo || eventsResult.isDemo;
  const error = datasetError ?? eventsResult.error;

  const leadNameById = await resolveLeadNames(leads, eventsResult.events);
  const fullReport = buildClosings(leads, catalogElements, eventsResult.events, window, leadNameById);

  const selectedProductId = productParam ? Number(productParam) : null;
  const rows = selectedProductId
    ? fullReport.rows.filter((r) => r.productId === selectedProductId)
    : fullReport.rows;
  const totalClosings = rows.length;
  const approximateCount = rows.filter((r) => r.isApproximate).length;
  const productSummary = selectedProductId
    ? fullReport.productSummary.filter((p) => p.productId === selectedProductId)
    : fullReport.productSummary;
  const topProduct = productSummary[0];

  const productOptions = [...catalogElements]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Produtos vinculados a leads ('fechamentos') no período selecionado, pela data em que o vínculo aconteceu."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Fechamentos no período" value={formatNumber(totalClosings)} icon={FileSignature} />
        <KpiCard label="Produtos distintos" value={formatNumber(productSummary.length)} icon={Package} />
        <KpiCard
          label="Produto mais vendido"
          value={topProduct ? topProduct.productName : "—"}
          icon={TrendingUp}
          hint={topProduct ? `${formatNumber(topProduct.count)} fechamentos` : undefined}
        />
        <KpiCard
          label="Datas aproximadas"
          value={formatNumber(approximateCount)}
          icon={Clock3}
          hint="Sem evento de vínculo — usamos a data de criação do lead"
        />
      </div>

      <div className="mt-6">
        <ContratosFilterBar
          currentPeriod={window.key}
          currentFrom={toDateInputValue(window.from)}
          currentTo={toDateInputValue(window.to)}
          products={productOptions}
          currentProductId={selectedProductId ? String(selectedProductId) : "all"}
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Fechamentos</h2>
        <Table
          keyFor={(r) => `${r.leadId}:${r.productId}`}
          rows={rows}
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
        {approximateCount > 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            (aprox.): sem evento de vínculo registrado na Kommo — a data de criação do lead foi usada como
            aproximação.
          </p>
        ) : null}
      </div>
    </div>
  );
}
