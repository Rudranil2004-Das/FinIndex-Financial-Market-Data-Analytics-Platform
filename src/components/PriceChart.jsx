import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, fmtNum, gridStroke, shortDate, tooltipStyle } from "../utils/format";

/** Close price with 20 and 50 day moving averages. `history` comes from /api/stocks/<symbol>. */
export function PriceChart({ history }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
        <YAxis tick={axisTick} domain={["auto", "auto"]} width={55} tickFormatter={(v) => fmtNum(v, 0)} />
        <Tooltip {...tooltipStyle} formatter={(v) => fmtNum(v)} />
        <Legend />
        <Line type="monotone" dataKey="close" name="Close" stroke="#3b82f6" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#22c55e" dot={false} strokeWidth={1.2} connectNulls />
        <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#f59e0b" dot={false} strokeWidth={1.2} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Generic bar chart that colours bars green/red by sign. */
export function SignedBarChart({ data, xKey, yKey, name }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
        <YAxis tick={axisTick} width={55} tickFormatter={(v) => `${fmtNum(v, 1)}%`} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${fmtNum(v)}%`} />
        <Bar dataKey={yKey} name={name} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d[yKey] >= 0 ? "#22c55e" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
