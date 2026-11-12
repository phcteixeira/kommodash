import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getAllCatalogProducts } from "@/lib/kommo/api";

// O widget roda no domínio da Kommo e chama esse endpoint direto do
// navegador (não é `widget_request` assinado pela Kommo como no Salesbot) —
// precisa de CORS liberado. Sem cookies/sessão envolvidos (autorização é só
// a chave secreta), `*` não expõe nada sensível.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/**
 * Lista os produtos do catálogo pra popular o seletor do widget no card do
 * lead (v1 do registro manual de contratos — ver lib/kommo/contracts-notes.ts).
 * GET porque o widget chama isso ao renderizar, antes de qualquer ação do
 * usuário.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!isValidWidgetSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const products = (await getAllCatalogProducts()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return NextResponse.json({ ok: true, products }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/contracts/products]", err);
    return NextResponse.json({ ok: false, message: "Falha ao buscar produtos." }, { status: 500, headers: CORS_HEADERS });
  }
}
