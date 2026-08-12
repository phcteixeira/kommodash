import { endOfDay, startOfDay, subDays, subMonths } from "date-fns";

export const RANGE_PRESETS = {
  "7d": { label: "Últimos 7 dias", days: 7 },
  "30d": { label: "Últimos 30 dias", days: 30 },
  "90d": { label: "Últimos 90 dias", days: 90 },
  "180d": { label: "Últimos 6 meses", days: 180 },
  all: { label: "Todo o período", days: null },
} as const;

export type RangeKey = keyof typeof RANGE_PRESETS;

export const DEFAULT_RANGE: RangeKey = "90d";

export function isRangeKey(value: string | undefined): value is RangeKey {
  return !!value && value in RANGE_PRESETS;
}

export function resolveRange(rangeParam: string | undefined): { key: RangeKey; from?: Date } {
  const key: RangeKey = isRangeKey(rangeParam) ? rangeParam : DEFAULT_RANGE;
  const preset = RANGE_PRESETS[key];
  if (preset.days === null) return { key };
  const from = new Date();
  from.setDate(from.getDate() - preset.days);
  return { key, from };
}

// ---------- Filtro de período da página Contratos (fechamentos) ----------

export const CLOSINGS_PERIODS = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "15d": "Últimos 15 dias",
  month: "Último mês",
  custom: "Personalizado",
} as const;

export type ClosingsPeriodKey = keyof typeof CLOSINGS_PERIODS;

export const DEFAULT_CLOSINGS_PERIOD: ClosingsPeriodKey = "7d";

export function isClosingsPeriodKey(value: string | undefined): value is ClosingsPeriodKey {
  return !!value && value in CLOSINGS_PERIODS;
}

export interface ClosingsWindow {
  key: ClosingsPeriodKey;
  from: Date;
  to: Date;
}

/** Formata uma Date como "yyyy-MM-dd" em horário local, para preencher <input type="date">. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Interpreta um valor "yyyy-MM-dd" (de <input type="date">) como meia-noite local. */
function parseDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function resolveClosingsWindow(params: {
  period?: string;
  from?: string;
  to?: string;
}): ClosingsWindow {
  const key: ClosingsPeriodKey = isClosingsPeriodKey(params.period) ? params.period : DEFAULT_CLOSINGS_PERIOD;
  const now = new Date();

  if (key === "custom") {
    const parsedFrom = params.from ? parseDateInputValue(params.from) : subDays(now, 6);
    const parsedTo = params.to ? parseDateInputValue(params.to) : now;
    const [start, end] = parsedFrom <= parsedTo ? [parsedFrom, parsedTo] : [parsedTo, parsedFrom];
    return { key, from: startOfDay(start), to: endOfDay(end) };
  }
  if (key === "today") return { key, from: startOfDay(now), to: endOfDay(now) };
  if (key === "7d") return { key, from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  if (key === "15d") return { key, from: startOfDay(subDays(now, 14)), to: endOfDay(now) };
  return { key, from: startOfDay(subMonths(now, 1)), to: endOfDay(now) }; // month
}
