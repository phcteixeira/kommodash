import { PeriodFilterForm, filterControlClass, filterLabelClass } from "./PeriodFilterForm";
import type { ClosingsPeriodKey } from "@/lib/date-range";

interface PipelineOption {
  id: number;
  name: string;
}

interface Props {
  currentPeriod: ClosingsPeriodKey;
  currentFrom: string;
  currentTo: string;
  pipelines: PipelineOption[];
  currentPipelineId: string; // "all" ou o id do pipeline como string
}

export function PerformanceLeadsFilterBar({
  currentPeriod,
  currentFrom,
  currentTo,
  pipelines,
  currentPipelineId,
}: Props) {
  return (
    <PeriodFilterForm
      action="/dashboard/performance-leads"
      currentPeriod={currentPeriod}
      currentFrom={currentFrom}
      currentTo={currentTo}
    >
      <label className={filterLabelClass}>
        Funil
        <select
          name="pipeline"
          defaultValue={currentPipelineId === "all" ? "" : currentPipelineId}
          className={filterControlClass}
        >
          <option value="">Todos os funis</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </PeriodFilterForm>
  );
}
