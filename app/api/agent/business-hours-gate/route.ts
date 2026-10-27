import { NextRequest, NextResponse } from "next/server";
import { verifyKommoSalesbotToken, KommoAgentAuthError } from "@/lib/kommo-agent/jwt";
import { parseWidgetRequestBody, continueSalesbotFlow, stopSalesbot, KommoAgentSalesbotError } from "@/lib/kommo-agent/salesbot";
import { isWithinBusinessHours } from "@/lib/kommo-agent/businessHours";

/**
 * Etapa adaptada logo após "Iniciar robô": decide se o robô deve seguir
 * (fora do horário comercial, quando não há ninguém da equipe disponível)
 * ou parar por aqui (horário comercial, equipe atende direto — ver
 * lib/kommo-agent/businessHours.ts).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload;
  try {
    payload = parseWidgetRequestBody(rawBody);
  } catch (err) {
    console.error("[agent/business-hours-gate] corpo inválido", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    verifyKommoSalesbotToken(payload.token);
  } catch (err) {
    const message = err instanceof KommoAgentAuthError ? err.message : "Token inválido.";
    console.error("[agent/business-hours-gate] falha na validação do token:", message);
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  const businessHours = isWithinBusinessHours();
  console.log("[agent/business-hours-gate]", { leadId: payload.data.lead_id, businessHours });

  try {
    if (businessHours) {
      await stopSalesbot(payload.return_url);
    } else {
      await continueSalesbotFlow(payload.return_url);
    }
  } catch (err) {
    const message = err instanceof KommoAgentSalesbotError ? err.message : String(err);
    console.error("[agent/business-hours-gate] falha ao responder ao Salesbot:", message);
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
