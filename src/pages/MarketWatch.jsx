import { useEffect, useState } from "react";
import { getStocks } from "../api/stocks";
import useFetch, { useDebounced } from "../hooks/useFetch";
import { useSettings } from "../hooks/useSettings";
import SearchBar from "../components/SearchBar";
import StockTable, { Pagination } from "../components/StockTable";
import { ErrorMessage, Loader, PageHeader } from "../components/Feedback";

export default function MarketWatch() {
  const { settings } = useSettings();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState("symbol");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);

  useEffect(() => setPage(1), [q, sector, sort, order]);

  const { data, loading, error, reload } = useFetch(
    () => getStocks({ search: q, sector, sort, order, page, per_page: settings.rowsPerPage }),
    [q, sector, sort, order, page, settings.rowsPerPage]
  );

  const onSort = (key) => {
    if (key === sort) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(key); setOrder("asc"); }
  };

  return (
    <>
      <PageHeader title="Market Watch" subtitle="Latest closing price, daily change and volume for every tracked stock." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by symbol or company" />
        <label>
          <span className="sr-only">Filter by sector</span>
          <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All sectors</option>
            {(data?.sectors || []).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Loader /> : (
        <div className="card">
          <StockTable rows={data.items} sort={sort} order={order} onSort={onSort} />
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          {loading && <p className="px-3 pb-3 text-xs text-muted">Updating…</p>}
        </div>
      )}
    </>
  );
}
