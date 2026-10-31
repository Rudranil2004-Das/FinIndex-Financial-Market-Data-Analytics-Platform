import { Link, useParams } from "react-router-dom";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Calculator } from "lucide-react";
import { calculateIndex, getIndexHistory } from "../api/indices";
import { errorMessage } from "../api/api";
import useFetch from "../hooks/useFetch";
import { useNotify } from "../components/Notification";
import MetricCard from "../components/MetricCard";
import ChartCard from "../components/ChartCard";
import { SignedBarChart } from "../components/PriceChart";
import { ErrorMessage, Loader, PageHeader } from "../components/Feedback";
import { PALETTE, axisTick, fmtCompact, fmtNum, fmtPct, gridStroke, pctClass, shortDate, tooltipStyle } from "../utils/format";

export default function IndexDetails() {
  const { id } = useParams();
  const notify = useNotify();
  const { data, error, reload } = useFetch(() => getIndexHistory(id), [id]);

  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return <Loader />;
  const { index, values, constituents, stats } = data;

  async function recalc() {
    try { await calculateIndex(id); notify("success", "Index recalculated."); reload(); }
    catch (err) { notify("error", errorMessage(err)); }
  }

  return (
    <>
      <Link to="/indices" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Indices</Link>
      <PageHeader title={index.index_name} subtitle={`${index.index_code} · base ${fmtNum(index.base_value, 0)} on ${index.base_date}`}>
        <button className="btn" onClick={recalc}><Calculator className="h-4 w-4" /> Recalculate</button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Latest value" value={fmtNum(stats.latest_value)} />
          <MetricCard label="Performance since base" value={fmtPct(stats.performance_pct)} tone={pctClass(stats.performance_pct)} />
          <MetricCard label="Volatility (daily)" value={`${fmtNum(stats.volatility, 3)}%`} sub={`Avg daily ${fmtPct(stats.avg_daily_return, 3)}`} />
          <MetricCard label="Max drawdown" value={fmtPct(stats.max_drawdown)} tone="text-down" sub={`Best ${fmtPct(stats.best_day)} · Worst ${fmtPct(stats.worst_day)}`} />
        </div>
      )}

      <div className="mt-4 grid gap-4">
        <ChartCard title="Index performance" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={values} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
              <YAxis tick={axisTick} domain={["auto", "auto"]} width={55} tickFormatter={(v) => fmtNum(v, 0)} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtNum(v)} />
              <Line type="monotone" dataKey="index_value" name="Index value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Daily index return">
            <SignedBarChart data={values} xKey="date" yKey="daily_return" name="Daily return" />
          </ChartCard>
          <ChartCard title="Market capitalization distribution" subtitle="Latest weights" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={constituents} dataKey="latest_weight" nameKey="symbol" innerRadius="50%" outerRadius="85%" paddingAngle={1} stroke="none">
                  {constituents.map((c, i) => <Cell key={c.symbol} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v) => `${fmtNum(v)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Constituent stocks</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Symbol</th><th>Company</th><th>Sector</th><th className="text-right">Base weight</th><th className="text-right">Latest weight</th><th className="text-right">Market cap</th></tr></thead>
              <tbody>
                {constituents.map((c) => (
                  <tr key={c.symbol}>
                    <td><Link to={`/stocks/${c.symbol}`} className="font-medium text-accent hover:underline">{c.symbol}</Link></td>
                    <td>{c.company_name}</td><td className="text-muted">{c.sector || "–"}</td>
                    <td className="text-right">{fmtNum(c.base_weight)}%</td>
                    <td className="text-right">{fmtNum(c.latest_weight)}%</td>
                    <td className="text-right">{fmtCompact(c.market_cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">{data.model_note}</p>
        </section>
      </div>
    </>
  );
}
