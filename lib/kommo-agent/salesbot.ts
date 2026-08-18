import { kommoConfig } from "@/lib/kommo/config";
import type { KommoWidgetRequestPayload } from "./types";

export class KommoAgentSalesbotError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "KommoAgentSalesbotError";
    this.status = status;
  }
}

/** Lê `obj[chave]` (bracket notation) de um URLSearchParams já decodificado
 * em um objeto raso — só o nível que o widget_request realmente usa
 * (`data[message_text]`, `data[lead_id]`, ...). */
function extractBracketGroup(params: URLSearchParams, group: string): Record<string, string> {
  const result: Record<string, string> = {};
  const prefix = `${group}[`;
  for (const [key, value] of params.entries()) {
    if (key.startsWith(prefix) && key.endsWith("]")) {
      const field = key.slice(prefix.length, -1);
      result[field] = value;
    }
  }
  return result;
}

/**
 * Parseia o corpo do POST que o Salesbot envia no step widget_request.
 * Confirmado contra payload real: application/x-www-form-urlencoded (não
 * JSON), com os campos de `data` em notação de colchetes.
 */
export function parseWidgetRequestBody(rawBody: string): KommoWidgetRequestPayload {
  const params = new URLSearchParams(rawBody);
  const token = params.get("token");
  const returnUrl = params.get("return_url");
  const data = extractBracketGroup(params, "data");

  if (!token || !returnUrl) {
    throw new KommoAgentSalesbotError("Corpo do widget_request sem token ou return_url.", 400);
  }

  return {
    token,
    return_url: returnUrl,
    data: {
      from: data.from ?? "",
      message_text: data.message_text ?? "",
      lead_id: data.lead_id ?? "",
      contact_name: data.contact_name ?? "",
    },
  };
}

// Limite de caracteres por handler "show" — valor da doc oficial
// (developers.kommo.com/reference/salesbot-widget-block-execution-confirmation),
// ainda não confirmado empiricamente contra a conta real. Ajustar aqui se o
// primeiro teste mostrar um limite diferente (mensagem cortada/erro 400).
const SHOW_HANDLER_MAX_CHARS = 80;
const MAX_HANDLERS_PER_REQUEST = 10;

function chunkText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Retoma a execução do Salesbot enviando a resposta de volta pro chat do
 * lead. POST pra `return_url` (mesmo domínio/auth da API v4 — usa o mesmo
 * access token de `lib/kommo/config.ts`), corpo com `execute_handlers` do
 * tipo "show"/"text". Resposta esperada é 202 com corpo vazio.
 */
export async function continueSalesbotWithReply(returnUrl: string, replyText: string): Promise<void> {
  const chunks = chunkText(replyText, SHOW_HANDLER_MAX_CHARS).slice(0, MAX_HANDLERS_PER_REQUEST);

  const res = await fetch(returnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kommoConfig.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      execute_handlers: chunks.map((value) => ({
        handler: "show",
        params: { type: "text", value },
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new KommoAgentSalesbotError(
      `Falha ao continuar o Salesbot (${res.status}): ${body.slice(0, 300)}`,
      res.status
    );
  }
}
