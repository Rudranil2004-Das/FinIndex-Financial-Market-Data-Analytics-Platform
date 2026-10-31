import api from "./api";

const data = (p) => p.then((r) => r.data);

export const getReturns = (params) => data(api.get("/analytics/returns", { params }));
export const getTopPerformers = (params) => data(api.get("/analytics/top-performers", { params }));
export const getMarketCap = () => data(api.get("/analytics/market-cap"));

/** Downloads a CSV report through the browser. kind: performance | returns | prices */
export async function exportReport(kind) {
  const res = await api.get("/analytics/export", { params: { kind }, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}_report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
