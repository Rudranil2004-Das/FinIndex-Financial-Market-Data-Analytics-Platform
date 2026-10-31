import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

export function errorMessage(err) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === "ERR_NETWORK") return "Cannot reach the backend. Start Flask (python app.py) and try again.";
  return err?.message || "Something went wrong.";
}

const data = (promise) => promise.then((r) => r.data);

export const getHealth = () => data(api.get("/health"));
export const getDashboardSummary = () => data(api.get("/dashboard/summary"));
export const getMarketPerformance = () => data(api.get("/dashboard/market-performance"));

export const uploadCsv = (file) => {
  const form = new FormData();
  form.append("file", file);
  return data(api.post("/import", form));
};
export const getImportHistory = () => data(api.get("/import/history"));
export const getImportBatch = (id) => data(api.get(`/import/${id}`));

export const runValidation = () => data(api.post("/validation/run"));
export const getValidationSummary = () => data(api.get("/validation/summary"));
export const getValidationErrors = (params) => data(api.get("/validation/errors", { params }));

export default api;
