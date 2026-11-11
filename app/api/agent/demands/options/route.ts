import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getCustomFields } from "@/lib/kommo/api";
import { SERVICO_FIELD_NAME } from "@/lib/kommo/aggregate";

// Mesmo motivo do /contracts/products e /proposals/options — chamado
// direto do navegador a partir do domínio da Kommo.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/**
 * Lista as opções do campo "Serviço" (multiselect) pra popular o seletor
 * de "Demandas Identificadas" no widget — ver lib/kommo/demands-notes.ts.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!isValidWidgetSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const fields = await getCustomFields("leads");
    const field = fields.find((f) => f.name.trim().toLowerCase() === SERVICO_FIELD_NAME.trim().toLowerCase());
    const options = (field?.enums ?? [])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((e) => ({ id: e.id, name: e.value }));
    return NextResponse.json({ ok: true, options }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/demands/options]", err);
    return NextResponse.json({ ok: false, message: "Falha ao buscar opções." }, { status: 500, headers: CORS_HEADERS });
  }
}
