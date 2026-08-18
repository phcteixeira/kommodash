import { z } from "zod";

const envSchema = z.object({
  KOMMO_INTEGRATION_CLIENT_ID: z.string().trim().min(1).optional(),
  KOMMO_INTEGRATION_CLIENT_SECRET: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse({
  KOMMO_INTEGRATION_CLIENT_ID: process.env.KOMMO_INTEGRATION_CLIENT_ID,
  KOMMO_INTEGRATION_CLIENT_SECRET: process.env.KOMMO_INTEGRATION_CLIENT_SECRET,
});

const env = parsed.success ? parsed.data : {};

export const kommoAgentConfig = {
  clientId: env.KOMMO_INTEGRATION_CLIENT_ID ?? "",
  clientSecret: env.KOMMO_INTEGRATION_CLIENT_SECRET ?? "",
};

/** Verdadeiro quando a integração privada do agente está configurada. */
export function isKommoAgentConfigured(): boolean {
  return Boolean(kommoAgentConfig.clientId && kommoAgentConfig.clientSecret);
}
