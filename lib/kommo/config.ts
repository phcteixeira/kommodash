import { z } from "zod";

const envSchema = z.object({
  KOMMO_SUBDOMAIN: z.string().trim().min(1).optional(),
  KOMMO_ACCESS_TOKEN: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse({
  KOMMO_SUBDOMAIN: process.env.KOMMO_SUBDOMAIN,
  KOMMO_ACCESS_TOKEN: process.env.KOMMO_ACCESS_TOKEN,
});

const env = parsed.success ? parsed.data : {};

export const kommoConfig = {
  subdomain: env.KOMMO_SUBDOMAIN ?? "",
  accessToken: env.KOMMO_ACCESS_TOKEN ?? "",
};

/** Verdadeiro quando subdomínio + token estão configurados via env vars. */
export function isKommoConfigured(): boolean {
  return Boolean(kommoConfig.subdomain && kommoConfig.accessToken);
}

export function kommoBaseUrl(): string {
  return `https://${kommoConfig.subdomain}.kommo.com/api/v4`;
}
