import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { fmtCompact, fmtNum, fmtPct, pctClass } from "../utils/format";

const COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "company_name", label: "Company" },
  { key: "sector", label: "Sector" },
  { key: "latest_close", label: "Close", right: true },
  { key: "daily_change_pct", label: "Daily change", right: true },
  { key: "latest_volume", label: "Volume", right: true },
];

export default function StockTable({ rows, sort, order, onSort }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.right ? "text-right" : ""} aria-sort={sort === c.key ? (order === "asc" ? "ascending" : "descending") : "none"}>
                <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => onSort(c.key)}>
                  {c.label}
                  {sort === c.key && (order === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol}>
              <td>
                <Link to={`/stocks/${r.symbol}`} className="font-medium text-accent hover:underline">
                  {r.symbol}
                </Link>
              </td>
              <td>{r.company_name}</td>
              <td className="text-muted">{r.sector || "–"}</td>
              <td className="text-right">{fmtNum(r.latest_close)}</td>
              <td className={`text-right font-medium ${pctClass(r.daily_change_pct)}`}>{fmtPct(r.daily_change_pct)}</td>
              <td className="text-right">{fmtCompact(r.latest_volume)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-8 text-center text-muted">
                No stocks match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-3 text-sm text-muted">
      <span>{total} stocks</span>
      <div className="flex items-center gap-2">
        <button className="btn px-2" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button className="btn px-2" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
