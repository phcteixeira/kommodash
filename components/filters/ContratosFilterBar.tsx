import { PeriodFilterForm, filterControlClass, filterLabelClass } from "./PeriodFilterForm";
import type { ClosingsPeriodKey } from "@/lib/date-range";

interface ProductOption {
  id: number;
  name: string;
}

interface Props {
  currentPeriod: ClosingsPeriodKey;
  currentFrom: string;
  currentTo: string;
  products: ProductOption[];
  currentProductId: string; // "all" ou o id do produto como string
}

export function ContratosFilterBar({ currentPeriod, currentFrom, currentTo, products, currentProductId }: Props) {
  return (
    <PeriodFilterForm
      action="/dashboard/contratos"
      currentPeriod={currentPeriod}
      currentFrom={currentFrom}
      currentTo={currentTo}
    >
      <label className={filterLabelClass}>
        Produto
        <select name="product" defaultValue={currentProductId === "all" ? "" : currentProductId} className={filterControlClass}>
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </PeriodFilterForm>
  );
}
