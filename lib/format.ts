export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

/** Formata um timestamp unix (segundos) como data curta, ex.: "12/08/2026". */
export function formatDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(unixSeconds * 1000));
}

/** Formata uma duração em dias, estilo "20d." — usado no funil (permanência por etapa, ciclo de vida). */
export function formatDays(days: number): string {
  if (days < 1) return "<1d.";
  return `${Math.round(days)}d.`;
}

/**
 * Formatos de valor que podem ser passados como string de servidor para client
 * components (funções não podem cruzar o limite server -> client).
 */
export type ValueFormat = "currency" | "number";

export function formatValue(value: number, format: ValueFormat = "number", currency = "BRL"): string {
  return format === "currency" ? formatCurrency(value, currency) : formatNumber(value);
}
