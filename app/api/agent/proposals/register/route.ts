import { NextRequest, NextResponse } from "next/server";
import { isValidWidgetSecret } from "@/lib/kommo-agent/contractsWidgetConfig";
import { getCustomFields } from "@/lib/kommo/api";
import { PROPOSTAS_ENVIADAS_FIELD_NAME } from "@/lib/kommo/aggregate";
import { registerProposalNote } from "@/lib/kommo/proposals-notes";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}

/**
 * Registra uma proposta enviada (v1: só o serviço) como nota no lead — ver
 * lib/kommo/proposals-notes.ts. Recebe o `optionId` (enum_id do campo
 * "Propostas Enviadas"); o nome do serviço vem resolvido aqui, não
 * confiando em texto enviado pelo cliente.
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
    const fields = await getCustomFields("leads");
    const field = fields.find(
      (f) => f.name.trim().toLowerCase() === PROPOSTAS_ENVIADAS_FIELD_NAME.trim().toLowerCase()
    );
    const option = field?.enums?.find((e) => e.id === optionId);
    if (!option) {
      return NextResponse.json({ ok: false, message: "Opção não encontrada." }, { status: 400, headers: CORS_HEADERS });
    }

    await registerProposalNote(leadId, option.value);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[agent/proposals/register]", err);
    return NextResponse.json({ ok: false, message: "Falha ao registrar proposta." }, { status: 500, headers: CORS_HEADERS });
  }
}
