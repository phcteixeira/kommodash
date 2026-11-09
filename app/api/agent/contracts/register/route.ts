import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getCatalogs, getCatalogElements } from "@/lib/kommo/api";
import { registerContractNote } from "@/lib/kommo/contracts-notes";

// Mesmo motivo do endpoint /products — chamado direto do navegador a
// partir do domínio da Kommo. POST com JSON dispara preflight OPTIONS.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}

/**
 * Registra um contrato (v1: só produto) como nota no lead — ver
 * lib/kommo/contracts-notes.ts. Recebe só o `productId`; o nome vem
 * resolvido aqui, não confiando em texto enviado pelo cliente (o widget
 * já pega o id certo da mesma lista de /products, mas o nome usado na
 * nota precisa ser o que a Kommo realmente tem — não o que veio no POST).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const secret = typeof body?.secret === "string" ? body.secret : null;
  if (!isValidWidgetSecret(secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401, headers: CORS_HEADERS });
  }

  const leadId = Number(body?.leadId);
  const productId = Number(body?.productId);
  if (!Number.isFinite(leadId) || !Number.isFinite(productId)) {
    return NextResponse.json({ ok: false, message: "leadId/productId inválidos." }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const catalogs = await getCatalogs();
    let productName: string | null = null;
    for (const catalog of catalogs) {
      const elements = await getCatalogElements(catalog.id);
      const match = elements.find((e) => e.id === productId);
      if (match) {
        productName = match.name;
        break;
      }
    }
    if (!productName) {
      return NextResponse.json({ ok: false, message: "Produto não encontrado." }, { status: 400, headers: CORS_HEADERS });
    }

    await registerContractNote(leadId, productName);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/contracts/register]", err);
    return NextResponse.json({ ok: false, message: "Falha ao registrar contrato." }, { status: 500, headers: CORS_HEADERS });
  }
}
