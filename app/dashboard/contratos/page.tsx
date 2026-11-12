import { loadKommoDataset, loadAllNotes, resolveLeadsByIds } from "@/lib/kommo/dataset";
import { buildClosings } from "@/lib/kommo/aggregate";
import { extractRegistrations } from "@/lib/kommo/manual-registrations";
import { CONTRACT_NOTE_PREFIX } from "@/lib/kommo/contracts-notes";
import { DISCONTINUED_PRODUCT_NAMES } from "@/lib/kommo/catalog-config";
import { resolveClosingsWindow, toDateInputValue } from "@/lib/date-range";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContratosFilterBar } from "@/components/filters/ContratosFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { FileSignature, Package, TrendingUp } from "lucide-react";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; product?: string }>;
}) {
  const { period, from: fromParam, to: toParam, product: productParam } = await searchParams;
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, notesResult] = await Promise.all([
    loadKommoDataset({ createdFrom: window.from, createdTo: window.to }),
    loadAllNotes(),
  ]);
  const { leads, catalogElements } = dataset;

  const isDemo = datasetIsDemo || notesResult.isDemo;
  const error = datasetError ?? notesResult.error;

  const registrations = extractRegistrations(notesResult.notes, CONTRACT_NOTE_PREFIX);
  const leadById = await resolveLeadsByIds(
    leads,
    registrations.map((r) => r.leadId)
  );
  const fullReport = buildClosings(catalogElements, registrations, window, leadById);

  const selectedProductId = productParam ? Number(productParam) : null;
  const rows = selectedProductId
    ? fullReport.rows.filter((r) => r.productId === selectedProductId)
    : fullReport.rows;
  const totalClosings = rows.length;
  const productSummary = selectedProductId
    ? fullReport.productSummary.filter((p) => p.productId === selectedProductId)
    : fullReport.productSummary;
  const topProduct = productSummary[0];

  const productOptions = catalogElements
    .filter((e) => !DISCONTINUED_PRODUCT_NAMES.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Produtos contratados por leads ('fechamentos') no período selecionado, pela data em que foram registrados."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Fechamentos no período" value={formatNumber(totalClosings)} icon={FileSignature} />
        <KpiCard label="Produtos distintos" value={formatNumber(productSummary.length)} icon={Package} />
        <KpiCard
          label="Produto mais vendido"
          value={topProduct ? topProduct.productName : "—"}
          icon={TrendingUp}
          hint={topProduct ? `${formatNumber(topProduct.count)} fechamentos` : undefined}
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
              cell: (r) => formatDate(r.closedAt),
              align: "right",
            },
          ]}
        />
      </div>
    </div>
  );
}
