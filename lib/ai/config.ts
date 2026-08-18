import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
});

const env = parsed.success ? parsed.data : {};

export const aiConfig = {
  apiKey: env.ANTHROPIC_API_KEY ?? "",
  // Modelo de custo baixo, adequado pra triagem inicial de atendimento
  // (perguntas objetivas, respostas curtas) — ver estimativa de custo
  // discutida com o usuário antes de decidir.
  model: "claude-haiku-4-5",
};

export function isAiConfigured(): boolean {
  return Boolean(aiConfig.apiKey);
}
