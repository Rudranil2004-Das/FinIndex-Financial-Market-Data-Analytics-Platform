export const fmtNum = (v, d = 2) =>
  v == null || Number.isNaN(Number(v))
    ? "–"
    : Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtPct = (v, d = 2) =>
  v == null || Number.isNaN(Number(v)) ? "–" : `${v > 0 ? "+" : ""}${Number(v).toFixed(d)}%`;

export const fmtCompact = (v) =>
  v == null ? "–" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);

export const pctClass = (v) => (v == null || v === 0 ? "text-muted" : v > 0 ? "text-up" : "text-down");

export const shortDate = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

export const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#a78bfa", "#ec4899", "#14b8a6", "#f97316", "#94a3b8"];

// Shared Recharts styling
export const axisTick = { fill: "#8c98ac", fontSize: 12 };
export const gridStroke = "#334054";
export const tooltipStyle = {
  contentStyle: { background: "#1b2230", border: "1px solid #334054", borderRadius: 8, color: "#e2e8f0", fontSize: 13 },
  labelStyle: { color: "#8c98ac" },
};
