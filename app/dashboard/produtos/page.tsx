import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildCatalogSummary, buildCustomFieldsSummary } from "@/lib/kommo/aggregate";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { KpiCard } from "@/components/ui/KpiCard";
import { Package, ListTree } from "lucide-react";

const ENTITY_LABEL: Record<string, string> = {
  leads: "Leads",
  contacts: "Contatos",
  companies: "Empresas",
};

export default async function ProdutosPage() {
  const { dataset, isDemo, error } = await loadKommoDataset();
  const { catalogs, catalogElements, customFields } = dataset;

  const catalogSummary = buildCatalogSummary(catalogs, catalogElements);
  const customFieldsSummary = buildCustomFieldsSummary(customFields);

  return (
    <div>
      <PageHeader
        title="Produtos e campos personalizados"
        description="Catálogo de produtos/serviços e campos personalizados configurados na conta."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Produtos no catálogo" value={formatNumber(catalogElements.length)} icon={Package} />
        <KpiCard label="Campos personalizados" value={formatNumber(customFields.length)} icon={ListTree} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {catalogSummary.map((catalog) => (
          <div key={catalog.catalogId} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 font-medium text-[var(--text-primary)]">{catalog.catalogName}</h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {formatNumber(catalog.elementCount)} produtos cadastrados
            </p>
            <Table
              keyFor={(e) => e.id}
              rows={catalog.elements}
              columns={[{ header: "Produto", cell: (e) => e.name }]}
            />
          </div>
        ))}

        {customFieldsSummary.map((entity) => (
          <div key={entity.entityType} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 font-medium text-[var(--text-primary)]">
              Campos personalizados — {ENTITY_LABEL[entity.entityType] ?? entity.entityType}
            </h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {formatNumber(entity.totalFields)} campos · {entity.byType.map((t) => `${t.type} (${t.count})`).join(", ")}
            </p>
            <Table
              keyFor={(f) => f.id}
              rows={entity.fields}
              columns={[
                { header: "Nome", cell: (f) => f.name },
                { header: "Tipo", cell: (f) => f.type },
                { header: "Código", cell: (f) => f.code ?? "—" },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
