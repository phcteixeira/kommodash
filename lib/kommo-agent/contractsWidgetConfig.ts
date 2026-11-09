import { timingSafeEqual } from "crypto";
import { z } from "zod";

const envSchema = z.object({
  KOMMO_CONTRACTS_WIDGET_SECRET: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse({
  KOMMO_CONTRACTS_WIDGET_SECRET: process.env.KOMMO_CONTRACTS_WIDGET_SECRET,
});

const env = parsed.success ? parsed.data : {};

export const contractsWidgetConfig = {
  secret: env.KOMMO_CONTRACTS_WIDGET_SECRET ?? "",
};

export function isContractsWidgetConfigured(): boolean {
  return Boolean(contractsWidgetConfig.secret);
}

/**
 * Checagem simples por segredo compartilhado — não é JWT assinado pela
 * Kommo como no widget_request do Salesbot (não há esse mecanismo pra
 * `lcard-1`; `self.crm_post` só propaga a chamada, sem assinar nada,
 * segundo a documentação). O segredo é configurado na instalação do
 * widget e enviado em cada chamada. Não protege contra alguém com acesso
 * à própria conta Kommo (quem já está logado pode ler o segredo no código
 * do widget) — só evita que a URL pública do endpoint seja usada por
 * terceiros que não têm acesso nenhum à conta.
 */
export function isValidWidgetSecret(provided: string | null): boolean {
  if (!contractsWidgetConfig.secret || !provided) return false;
  const expected = Buffer.from(contractsWidgetConfig.secret);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
