import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSecret } from "@/lib/kommo-agent/adminConfig";
import { getCatalogs, getCatalogElements } from "@/lib/kommo/api";

/**
 * Lista catálogos e seus elementos — leitura, sem efeito colateral.
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
    const catalogs = await getCatalogs();
    const result = [];
    for (const catalog of catalogs) {
      const elements = await getCatalogElements(catalog.id);
      result.push({
        catalogId: catalog.id,
        catalogName: catalog.name,
        type: catalog.type,
        elements: elements.map((e) => ({ id: e.id, name: e.name })),
      });
    }
    return NextResponse.json({ ok: true, catalogs: result });
  } catch (err) {
    console.error("[admin/catalog]", err);
    return NextResponse.json({ ok: false, message: "Falha ao buscar catálogo." }, { status: 500 });
  }
}
