export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

/**
 * Formatos de valor que podem ser passados como string de servidor para client
 * components (funções não podem cruzar o limite server -> client).
 */
export type ValueFormat = "currency" | "number";

export function formatValue(value: number, format: ValueFormat = "number", currency = "BRL"): string {
  return format === "currency" ? formatCurrency(value, currency) : formatNumber(value);
}
