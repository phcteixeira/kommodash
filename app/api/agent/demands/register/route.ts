import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getAllCatalogProducts } from "@/lib/kommo/api";
import { registerDemandNote } from "@/lib/kommo/demands-notes";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}

/**
 * Registra uma demanda identificada (v1: só o serviço) como nota no lead —
 * ver lib/kommo/demands-notes.ts. Recebe o `optionId` (id do elemento do
 * catálogo, mesma lista de /demands/options); o nome vem resolvido aqui,
 * não confiando em texto enviado pelo cliente.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const secret = typeof body?.secret === "string" ? body.secret : null;
  if (!isValidWidgetSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401, headers: CORS_HEADERS });
  }

  const leadId = Number(body?.leadId);
  const optionId = Number(body?.optionId);
  if (!Number.isFinite(leadId) || !Number.isFinite(optionId)) {
    return NextResponse.json({ ok: false, message: "leadId/optionId inválidos." }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const products = await getAllCatalogProducts();
    const option = products.find((p) => p.id === optionId);
    if (!option) {
      return NextResponse.json({ ok: false, message: "Opção não encontrada." }, { status: 400, headers: CORS_HEADERS });
    }

    await registerDemandNote(leadId, option.name);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/demands/register]", err);
    return NextResponse.json({ ok: false, message: "Falha ao registrar demanda." }, { status: 500, headers: CORS_HEADERS });
  }
}
