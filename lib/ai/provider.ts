import Anthropic from "@anthropic-ai/sdk";
import { aiConfig, isAiConfigured } from "./config";

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface AiConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiReplyRequest {
  /** Prompt de sistema (comportamento, escopo, critério de handoff). */
  systemPrompt: string;
  /** Dados do lead/contato formatados em texto, injetados no system prompt. */
  leadContext: string;
  /** Turnos anteriores desta conversa (reconstruídos a partir das notas do
   * lead na Kommo — ver lib/kommo-agent/memory.ts). Vazio na 1ª mensagem. */
  history: AiConversationTurn[];
  /** Mensagem atual do cliente. */
  incomingMessage: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new AiProviderError("ANTHROPIC_API_KEY não configurado.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: aiConfig.apiKey });
  }
  return client;
}

/**
 * Gera a próxima resposta do agente de triagem. Sem extended thinking (não
 * precisa pra respostas curtas de atendimento) e com max_tokens baixo — o
 * texto final ainda passa pelo chunking de lib/kommo-agent/salesbot.ts antes
 * de ir pro WhatsApp.
 */
export async function generateReply(request: AiReplyRequest): Promise<string> {
  const anthropic = getClient();

  const system = `${request.systemPrompt}\n\n--- Dados do lead ---\n${request.leadContext}`;

  const messages: Anthropic.MessageParam[] = [
    ...request.history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user" as const, content: request.incomingMessage },
  ];

  try {
    const response = await anthropic.messages.create({
      model: aiConfig.model,
      max_tokens: 400,
      system,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AiProviderError("Resposta da IA sem bloco de texto.");
    }
    return textBlock.text.trim();
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new AiProviderError(`Erro na API da Anthropic (${err.status}): ${err.message}`);
    }
    throw err;
  }
}
