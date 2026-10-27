// Horário comercial desta conta: segunda a sexta, 8h-12h e 13h-17h
// (horário de Brasília). Fora disso — incluindo fim de semana e o
// intervalo de almoço — não há ninguém da equipe disponível, então é
// quando a IA deve assumir o atendimento (ver etapa adaptada "Horário
// comercial" no Salesbot "Botclaude").
const TIMEZONE = "America/Sao_Paulo";
const WEEKDAY_WINDOWS: [number, number][] = [
  [8, 12],
  [13, 17],
];

/** true = dentro do horário em que a equipe atende (bot NÃO deve seguir o fluxo). */
export function isWithinBusinessHours(date: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1");

  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (!isWeekday) return false;

  return WEEKDAY_WINDOWS.some(([from, to]) => hour >= from && hour < to);
}
