import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSecret } from "@/lib/kommo-agent/adminConfig";
import { getAllNotes, getCatalogs, getCatalogElements } from "@/lib/kommo/api";
import { extractRegistrations } from "@/lib/kommo/manual-registrations";
import { DEMAND_NOTE_PREFIX } from "@/lib/kommo/demands-notes";
import { PROPOSAL_NOTE_PREFIX } from "@/lib/kommo/proposals-notes";
import { CONTRACT_NOTE_PREFIX } from "@/lib/kommo/contracts-notes";

/**
 * Lista catálogos e seus elementos — leitura, sem efeito colateral. Inclui
 * quantas notas de registro manual (Demandas/Propostas/Contratos) usam o
 * nome exato de cada elemento hoje — dá o tamanho real do risco antes de
 * renomear um elemento (renomear quebra o casamento por nome com registros
 * já escritos, ver lib/kommo/aggregate.ts#buildClosings).
 *
 * Rota administrativa pontual pra ajustar a lista de produtos (ver
 * app/api/admin/catalog/apply); não é chamada pelo widget nem pelo
 * navegador, só por mim.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  try {
    const [catalogs, notes] = await Promise.all([getCatalogs(), getAllNotes()]);
    const countByName = new Map<string, { demand: number; proposal: number; contract: number }>();
    function tally(prefix: string, key: "demand" | "proposal" | "contract") {
      for (const reg of extractRegistrations(notes, prefix)) {
        const entry = countByName.get(reg.value) ?? { demand: 0, proposal: 0, contract: 0 };
        entry[key] += 1;
        countByName.set(reg.value, entry);
      }
    }
    tally(DEMAND_NOTE_PREFIX, "demand");
    tally(PROPOSAL_NOTE_PREFIX, "proposal");
    tally(CONTRACT_NOTE_PREFIX, "contract");

    const result = [];
    for (const catalog of catalogs) {
      const elements = await getCatalogElements(catalog.id);
      result.push({
        catalogId: catalog.id,
        catalogName: catalog.name,
        type: catalog.type,
        elements: elements.map((e) => ({
          id: e.id,
          name: e.name,
          registrations: countByName.get(e.name) ?? { demand: 0, proposal: 0, contract: 0 },
        })),
      });
    }
    return NextResponse.json({ ok: true, catalogs: result });
  } catch (err) {
    console.error("[admin/catalog]", err);
    return NextResponse.json({ ok: false, message: "Falha ao buscar catálogo." }, { status: 500 });
  }
}
