import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { errorMessage } from "../api/api";
import { exportReport, getMarketCap, getReturns, getTopPerformers } from "../api/analytics";
import { getStock, getStocks } from "../api/stocks";
import useFetch from "../hooks/useFetch";
import { useNotify } from "../components/Notification";
import ChartCard from "../components/ChartCard";
import DateFilter from "../components/DateFilter";
import { PriceChart, SignedBarChart } from "../components/PriceChart";
import { EmptyState, ErrorMessage, Loader, PageHeader } from "../components/Feedback";
import { PALETTE, axisTick, fmtCompact, fmtNum, fmtPct, gridStroke, pctClass, shortDate, tooltipStyle } from "../utils/format";

function RankTable({ title, rows }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <table className="table min-w-0">
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol}>
              <td><Link to={`/stocks/${r.symbol}`} className="font-medium text-accent hover:underline">{r.symbol}</Link></td>
              <td className="text-muted">{r.company_name}</td>
              <td className={`text-right font-medium ${pctClass(r.total_return)}`}>{fmtPct(r.total_return)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function Analytics() {
  const notify = useNotify();
  const [range, setRange] = useState({ start: "", end: "" });
  const [selected, setSelected] = useState(null);       // null = backend default (first 5)
  const [maSymbol, setMaSymbol] = useState("");

  const stocks = useFetch(() => getStocks({ per_page: 200 }), []);
  const returns = useFetch(
    () => getReturns({ symbols: selected?.join(","), start: range.start || undefined, end: range.end || undefined }),
    [selected?.join(","), range.start, range.end]
  );
  const top = useFetch(() => getTopPerformers({ n: 5, start: range.start || undefined, end: range.end || undefined }), [range.start, range.end]);
  const caps = useFetch(getMarketCap, []);
  const activeSymbol = maSymbol || stocks.data?.items?.[0]?.symbol;
  const ma = useFetch(
    () => (activeSymbol ? getStock(activeSymbol, { start: range.start || undefined, end: range.end || undefined }) : Promise.resolve(null)),
    [activeSymbol, range.start, range.end]
  );

  const sectorData = useMemo(() => {
    const totals = {};
    (caps.data || []).forEach((c) => { totals[c.sector || "Other"] = (totals[c.sector || "Other"] || 0) + c.market_cap; });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [caps.data]);

  async function download(kind) {
    try { await exportReport(kind); notify("success", "Report downloaded."); } catch (err) { notify("error", errorMessage(err)); }
  }

  if (returns.error) return <ErrorMessage message={returns.error} onRetry={returns.reload} />;
  if (!returns.data || !stocks.data) return <Loader />;
  if (stocks.data.items.length === 0) {
    return <><PageHeader title="Analytics & Reports" /><EmptyState title="No data to analyse" actionTo="/import" actionLabel="Import data">Import a CSV file to unlock analytics.</EmptyState></>;
  }

  const active = selected ?? returns.data.symbols;
  const toggle = (sym) => {
    const next = active.includes(sym) ? active.filter((s) => s !== sym) : [...active, sym];
    if (next.length >= 1 && next.length <= 8) setSelected(next);
  };

  return (
    <>
      <PageHeader title="Analytics & Reports" subtitle={returns.data.summary}>
        <DateFilter {...range} onChange={setRange} />
      </PageHeader>

      <ChartCard
        title="Stock performance comparison"
        subtitle="Cumulative return (%) since the start of the period. Pick up to 8 stocks."
        height={320}
        actions={null}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={returns.data.comparison} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
            <YAxis tick={axisTick} width={55} tickFormatter={(v) => `${fmtNum(v, 0)}%`} />
            <Tooltip {...tooltipStyle} formatter={(v) => `${fmtNum(v)}%`} />
            <Legend />
            {returns.data.symbols.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={PALETTE[i % PALETTE.length]} dot={false} strokeWidth={1.8} />)}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="mt-3 flex flex-wrap gap-2">
        {stocks.data.items.map((s) => (
          <button key={s.symbol} onClick={() => toggle(s.symbol)} aria-pressed={active.includes(s.symbol)}
            className={`rounded-full border px-3 py-1 text-sm ${active.includes(s.symbol) ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>
            {s.symbol}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily market returns" subtitle="Average daily return across all stocks">
          <SignedBarChart data={returns.data.market_daily} xKey="date" yKey="avg_daily_return" name="Average return" />
        </ChartCard>
        <ChartCard title="Market capitalization by sector" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sectorData} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="85%" paddingAngle={1} stroke="none">
                {sectorData.map((d, i) => <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v) => fmtCompact(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {top.data && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <RankTable title="Top-performing stocks" rows={top.data.top} />
          <RankTable title="Worst-performing stocks" rows={top.data.worst} />
        </div>
      )}

      <ChartCard
        className="mt-4"
        title="Moving average analysis"
        height={320}
        actions={
          <select className="input w-auto" value={activeSymbol || ""} onChange={(e) => setMaSymbol(e.target.value)} aria-label="Stock for moving average analysis">
            {stocks.data.items.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} · {s.company_name}</option>)}
          </select>
        }
      >
        {ma.data?.history?.length ? <PriceChart history={ma.data.history} /> : <p className="p-6 text-muted">No data in this range.</p>}
      </ChartCard>

      {caps.data && (
        <section className="card mt-4 p-4">
          <h2 className="mb-2 font-semibold">Market capitalization distribution</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Symbol</th><th>Company</th><th>Sector</th><th className="text-right">Price</th><th className="text-right">Market cap</th><th className="text-right">Weight</th></tr></thead>
              <tbody>
                {caps.data.map((c) => (
                  <tr key={c.symbol}>
                    <td className="font-medium">{c.symbol}</td><td>{c.company_name}</td><td className="text-muted">{c.sector || "–"}</td>
                    <td className="text-right">{fmtNum(c.latest_price)}</td><td className="text-right">{fmtCompact(c.market_cap)}</td><td className="text-right">{fmtNum(c.market_cap_weight)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card mt-4 flex flex-wrap items-center gap-3 p-4">
        <h2 className="mr-auto font-semibold">Export reports (CSV)</h2>
        <button className="btn" onClick={() => download("performance")}><Download className="h-4 w-4" /> Performance report</button>
        <button className="btn" onClick={() => download("returns")}><Download className="h-4 w-4" /> Processed returns</button>
        <button className="btn" onClick={() => download("prices")}><Download className="h-4 w-4" /> Clean prices</button>
      </section>
    </>
  );
}
