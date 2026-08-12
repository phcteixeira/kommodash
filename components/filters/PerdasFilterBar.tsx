import { PeriodFilterForm } from "./PeriodFilterForm";
import type { ClosingsPeriodKey } from "@/lib/date-range";

interface Props {
  currentPeriod: ClosingsPeriodKey;
  currentFrom: string;
  currentTo: string;
}

export function PerdasFilterBar({ currentPeriod, currentFrom, currentTo }: Props) {
  return (
    <PeriodFilterForm
      action="/dashboard/perdas"
      currentPeriod={currentPeriod}
      currentFrom={currentFrom}
      currentTo={currentTo}
    />
  );
}
