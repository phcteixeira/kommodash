import { NextRequest, NextResponse } from "next/server";
import { verifyKommoSalesbotToken, KommoAgentAuthError } from "@/lib/kommo-agent/jwt";
import {
  parseWidgetRequestBody,
  continueSalesbotWithReply,
  KommoAgentSalesbotError,
} from "@/lib/kommo-agent/salesbot";

/**
 * Recebe o step "widget_request" do Salesbot a cada mensagem de WhatsApp
 * recebida, valida a assinatura, e devolve uma resposta pro chat via
 * `return_url`. Ver plano de implementação do agente de IA e
 * lib/kommo-agent/types.ts (formato do payload confirmado contra a conta
 * real, não só a doc pública).
 *
 * Ainda sem IA de verdade — devolve um eco da mensagem recebida, só pra
 * validar a ponta a ponta (chegada do payload → validação → callback pro
 * Salesbot → mensagem aparece no WhatsApp) antes de decidir o provedor de
 * IA e plugar lib/ai/provider.ts aqui.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload;
  try {
    payload = parseWidgetRequestBody(rawBody);
  } catch (err) {
    console.error("[agent/webhook] corpo inválido", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    verifyKommoSalesbotToken(payload.token);
  } catch (err) {
    const message = err instanceof KommoAgentAuthError ? err.message : "Token inválido.";
    console.error("[agent/webhook] falha na validação do token:", message);
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  // Não logar o texto da mensagem do cliente em nível normal — só metadados.
  console.log("[agent/webhook] mensagem recebida", {
    leadId: payload.data.lead_id,
    contactName: payload.data.contact_name,
  });

  const replyText = `Recebi sua mensagem: "${payload.data.message_text}". (resposta de teste, IA ainda não conectada)`;

  try {
    await continueSalesbotWithReply(payload.return_url, replyText);
  } catch (err) {
    const message = err instanceof KommoAgentSalesbotError ? err.message : String(err);
    console.error("[agent/webhook] falha ao continuar o Salesbot:", message);
    // Ainda respondemos 200 pra Kommo não reenviar o webhook original — o
    // problema é na chamada de saída (return_url), não na recepção.
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
