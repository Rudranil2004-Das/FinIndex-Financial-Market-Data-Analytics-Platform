import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft } from "lucide-react";
import { getStock } from "../api/stocks";
import useFetch from "../hooks/useFetch";
import MetricCard from "../components/MetricCard";
import ChartCard from "../components/ChartCard";
import DateFilter from "../components/DateFilter";
import { PriceChart, SignedBarChart } from "../components/PriceChart";
import { ErrorMessage, Loader, PageHeader } from "../components/Feedback";
import { axisTick, fmtCompact, fmtNum, fmtPct, gridStroke, pctClass, shortDate, tooltipStyle } from "../utils/format";

export default function StockDetails() {
  const { symbol } = useParams();
  const [range, setRange] = useState({ start: "", end: "" });
  const { data, loading, error, reload } = useFetch(
    () => getStock(symbol, { start: range.start || undefined, end: range.end || undefined }),
    [symbol, range.start, range.end]
  );

  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return <Loader />;
  const { stock, history, summary: s } = data;

  return (
    <>
      <Link to="/market" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Market Watch
      </Link>
      <PageHeader title={`${stock.symbol} · ${stock.company_name}`} subtitle={[stock.exchange, stock.sector].filter(Boolean).join(" · ")}>
        <DateFilter {...range} onChange={setRange} />
      </PageHeader>

      {!s ? (
        <p className="card p-6 text-muted">No price history in this date range.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Latest close" value={fmtNum(s.latest_close)} sub={s.latest_date} />
            <MetricCard label="Period return" value={fmtPct(s.total_return)} tone={pctClass(s.total_return)} sub={`${s.trading_days} trading days`} />
            <MetricCard label="Period high / low" value={`${fmtNum(s.period_high)} / ${fmtNum(s.period_low)}`} />
            <MetricCard label="Market cap" value={fmtCompact(s.market_cap)} sub={`${fmtCompact(stock.shares_outstanding)} shares`} />
          </div>

          <div className="mt-4 grid gap-4">
            <ChartCard title="Price and moving averages" subtitle="Closing price with 20 and 50 day simple moving averages" height={320}>
              <PriceChart history={history} />
            </ChartCard>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Daily returns" subtitle="Percentage change in close, day over day">
                <SignedBarChart data={history} xKey="date" yKey="daily_return" name="Daily return" />
              </ChartCard>
              <ChartCard title="Trading volume">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
                    <YAxis tick={axisTick} width={55} tickFormatter={fmtCompact} />
                    <Tooltip {...tooltipStyle} formatter={(v) => fmtCompact(v)} />
                    <Bar dataKey="volume" name="Volume" fill="#3b82f6" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <section className="card p-4">
              <h2 className="mb-2 font-semibold">Historical performance summary</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ["Average daily return", fmtPct(s.avg_daily_return, 3)],
                  ["Volatility (std dev)", fmtPct(s.volatility, 3).replace("+", "")],
                  ["Best day", fmtPct(s.best_day)],
                  ["Worst day", fmtPct(s.worst_day)],
                  ["Average volume", fmtCompact(s.avg_volume)],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}
      {loading && <p className="mt-2 text-xs text-muted">Updating…</p>}
    </>
  );
}
