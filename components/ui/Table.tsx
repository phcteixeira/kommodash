import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
}

export function Table<T>({ columns, rows, keyFor }: {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string | number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`py-2 pr-4 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)} className="border-b border-[var(--border)] last:border-0">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`py-2 pr-4 tabular-nums ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
