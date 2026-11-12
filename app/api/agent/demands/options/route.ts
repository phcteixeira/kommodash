import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getAllCatalogProducts } from "@/lib/kommo/api";

// Mesmo motivo do /contracts/products e /proposals/options — chamado
// direto do navegador a partir do domínio da Kommo.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/**
 * Lista as opções pra popular o seletor de "Demandas Identificadas" no
 * widget — ver lib/kommo/demands-notes.ts. Fonte: catálogo de produtos,
 * a mesma usada em /contracts/products (o campo nativo "Serviço", que
 * antes era a fonte, foi removido da conta).
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!isValidWidgetSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const options = (await getAllCatalogProducts()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return NextResponse.json({ ok: true, options }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/demands/options]", err);
    return NextResponse.json({ ok: false, message: "Falha ao buscar opções." }, { status: 500, headers: CORS_HEADERS });
  }
}
