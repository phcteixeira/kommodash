import { NextRequest, NextResponse } from "next/server";
import { verifyKommoSalesbotToken, KommoAgentAuthError } from "@/lib/kommo-agent/jwt";
import {
  parseWidgetRequestBody,
  continueSalesbotWithReply,
  KommoAgentSalesbotError,
} from "@/lib/kommo-agent/salesbot";
import { loadConversationHistory, saveConversationTurn } from "@/lib/kommo-agent/memory";
import { generateReply, AiProviderError } from "@/lib/ai/provider";
import { WHATSAPP_AGENT_SYSTEM_PROMPT } from "@/lib/ai/prompts/whatsapp-agent";

/**
 * Recebe o step "widget_request" do Salesbot a cada mensagem de WhatsApp
 * recebida, valida a assinatura, gera a resposta com o agente de triagem
 * inicial (lib/ai/*) e devolve pro chat via `return_url`. Ver plano de
 * implementação do agente de IA e lib/kommo-agent/types.ts (formato do
 * payload confirmado contra a conta real, não só a doc pública).
 *
 * Escopo: só triagem inicial. Não há lógica de código decidindo quando
 * "parar" — isso é responsabilidade do próprio prompt (WHATSAPP_AGENT_SYSTEM_PROMPT):
 * quando ele considerar a triagem concluída, a resposta já vem sinalizando
 * a transferência pra um humano, e a IA para de insistir nas próximas
 * mensagens porque isso também fica no histórico (lib/kommo-agent/memory.ts).
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

  const leadId = Number(payload.data.lead_id);
  if (!Number.isFinite(leadId)) {
    console.error("[agent/webhook] lead_id inválido:", payload.data.lead_id);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Não logar o texto da mensagem do cliente em nível normal — só metadados.
  console.log("[agent/webhook] mensagem recebida", { leadId, contactName: payload.data.contact_name });

  let replyText: string;
  try {
    const history = await loadConversationHistory(leadId);
    replyText = await generateReply({
      systemPrompt: WHATSAPP_AGENT_SYSTEM_PROMPT,
      leadContext: `Nome do contato: ${payload.data.contact_name || "não informado"}`,
      history,
      incomingMessage: payload.data.message_text,
    });
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : String(err);
    console.error("[agent/webhook] falha ao gerar resposta da IA:", message);
    // Fallback seguro — nunca deixar o cliente sem resposta nenhuma por
    // causa de uma falha da IA (ver seção "Segurança" do plano).
    replyText = "Recebemos sua mensagem! Em instantes alguém da nossa equipe continua o atendimento por aqui. 🙏";
  }

  try {
    await continueSalesbotWithReply(payload.return_url, replyText);
  } catch (err) {
    const message = err instanceof KommoAgentSalesbotError ? err.message : String(err);
    console.error("[agent/webhook] falha ao continuar o Salesbot:", message);
    // Ainda respondemos 200 pra Kommo não reenviar o webhook original — o
    // problema é na chamada de saída (return_url), não na recepção.
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }

  // Só grava na memória depois que a resposta foi entregue com sucesso —
  // evita registrar uma pergunta do cliente sem a resposta correspondente
  // se algo falhar no meio do caminho.
  try {
    await saveConversationTurn(leadId, "user", payload.data.message_text);
    await saveConversationTurn(leadId, "assistant", replyText);
  } catch (err) {
    // Falha ao salvar memória não deve derrubar a resposta que já foi
    // entregue — só perde contexto pro próximo turno.
    console.error("[agent/webhook] falha ao salvar memória da conversa:", err);
  }

  return NextResponse.json({ ok: true });
}
