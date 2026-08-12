import type { TimeGranularity } from "./kommo/aggregate";

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

const GRANULARITIES: TimeGranularity[] = ["day", "week", "month"];
export const DEFAULT_GRANULARITY: TimeGranularity = "week";

export function resolveGranularity(param: string | undefined): TimeGranularity {
  return GRANULARITIES.includes(param as TimeGranularity) ? (param as TimeGranularity) : DEFAULT_GRANULARITY;
}
