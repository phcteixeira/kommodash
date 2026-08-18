import { getLeadNotes, addLeadNote } from "@/lib/kommo/api";
import type { AiConversationTurn } from "@/lib/ai/provider";

// Não há Chats API acessível pra este canal (WhatsApp já integrado pela
// própria Kommo — sem scope_id nosso, ver plano do agente de IA), então a
// "memória" da conversa é reconstruída a partir de notas que o próprio
// agente escreve no lead a cada turno, marcadas com um prefixo pra não se
// confundir com notas manuais/de outras integrações.
const CUSTOMER_PREFIX = "[Agente IA — cliente] ";
const AGENT_PREFIX = "[Agente IA — resposta] ";

// Limite de turnos carregados — a triagem é curta por natureza (ver escopo
// do prompt); isso é só uma proteção contra custo/latência crescerem sem
// limite num lead que ficou "preso" trocando mensagens com o bot.
const MAX_HISTORY_TURNS = 20;

export async function loadConversationHistory(leadId: number): Promise<AiConversationTurn[]> {
  const notes = await getLeadNotes(leadId);

  const turns = notes
    .map((note) => {
      const text = note.params?.text ?? "";
      if (text.startsWith(CUSTOMER_PREFIX)) {
        return { role: "user" as const, content: text.slice(CUSTOMER_PREFIX.length), createdAt: note.created_at };
      }
      if (text.startsWith(AGENT_PREFIX)) {
        return { role: "assistant" as const, content: text.slice(AGENT_PREFIX.length), createdAt: note.created_at };
      }
      return null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.createdAt - b.createdAt);

  return turns.slice(-MAX_HISTORY_TURNS).map(({ role, content }) => ({ role, content }));
}

export async function saveConversationTurn(
  leadId: number,
  role: AiConversationTurn["role"],
  content: string
): Promise<void> {
  const prefix = role === "user" ? CUSTOMER_PREFIX : AGENT_PREFIX;
  await addLeadNote(leadId, `${prefix}${content}`);
}
