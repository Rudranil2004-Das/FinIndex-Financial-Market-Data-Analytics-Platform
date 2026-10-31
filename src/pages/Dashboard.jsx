import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Database, Layers, TrendingUp } from "lucide-react";
import { getDashboardSummary, getMarketPerformance } from "../api/api";
import useFetch from "../hooks/useFetch";
import { useSettings } from "../hooks/useSettings";
import MetricCard from "../components/MetricCard";
import ChartCard from "../components/ChartCard";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, ErrorMessage, Loader, PageHeader } from "../components/Feedback";
import { axisTick, fmtNum, fmtPct, gridStroke, pctClass, shortDate, tooltipStyle } from "../utils/format";

function PerformerList({ title, rows }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <table className="table min-w-0">
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol}>
              <td>
                <Link to={`/stocks/${r.symbol}`} className="font-medium text-accent hover:underline">{r.symbol}</Link>
                <div className="text-xs text-muted">{r.company_name}</div>
              </td>
              <td className="text-right">{fmtNum(r.latest_price)}</td>
              <td className={`text-right font-medium ${pctClass(r.total_return)}`}>{fmtPct(r.total_return)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function Dashboard() {
  const { settings } = useSettings();
  const summary = useFetch(getDashboardSummary, []);
  const market = useFetch(getMarketPerformance, []);

  if (summary.loading && !summary.data) return <Loader />;
  if (summary.error) return <ErrorMessage message={summary.error} onRetry={summary.reload} />;
  const s = summary.data;

  if (!s.total_stocks) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState title="No market data yet" actionTo="/import" actionLabel="Go to Data Import">
          Upload a stock CSV file to start. A sample file is included in data/sample/sample_stocks.csv.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Data from ${s.first_trade_date} to ${s.latest_trade_date}. ${s.data_notice}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Tracked stocks" value={s.total_stocks} icon={TrendingUp} />
        <MetricCard label="Price records" value={s.total_records.toLocaleString()} icon={Database} />
        <MetricCard label="Indices" value={s.total_indices} icon={Layers} />
        <MetricCard label="Average stock return" value={fmtPct(s.average_return)} tone={pctClass(s.average_return)} sub="Whole period" icon={BarChart3} />
        <MetricCard label="Latest market move" value={fmtPct(s.latest_market_return)} tone={pctClass(s.latest_market_return)} sub="Average daily return" icon={Activity} />
      </div>

      <div className="mt-4">
        <ChartCard title="Market performance" subtitle="Equal-weighted average of all stocks, rebased to 100" height={300}>
          {market.data && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={market.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mkt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
                <YAxis tick={axisTick} domain={["auto", "auto"]} width={50} tickFormatter={(v) => fmtNum(v, 0)} />
                <Tooltip {...tooltipStyle} formatter={(v) => fmtNum(v)} />
                <Area type="monotone" dataKey="market_value" name="Market value" stroke="#3b82f6" strokeWidth={2} fill="url(#mkt)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PerformerList title="Top-performing stocks" rows={s.top_performers.slice(0, settings.topN)} />
        <PerformerList title="Worst-performing stocks" rows={s.worst_performers.slice(0, settings.topN)} />
      </div>

      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-semibold">Recent import activity</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>File</th><th>Status</th><th className="text-right">Valid</th><th className="text-right">Invalid</th><th>Uploaded</th></tr>
            </thead>
            <tbody>
              {s.recent_imports.map((b) => (
                <tr key={b.id}>
                  <td>{b.filename}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="text-right">{b.valid_records}</td>
                  <td className="text-right">{b.invalid_records}</td>
                  <td className="text-muted">{b.uploaded_at}</td>
                </tr>
              ))}
              {s.recent_imports.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">No imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
