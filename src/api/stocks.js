import api from "./api";

const data = (p) => p.then((r) => r.data);

export const getStocks = (params) => data(api.get("/stocks", { params }));
export const getStock = (symbol, params) => data(api.get(`/stocks/${symbol}`, { params }));
export const createStock = (body) => data(api.post("/stocks", body));
export const updateStock = (symbol, body) => data(api.put(`/stocks/${symbol}`, body));
export const deleteStock = (symbol) => data(api.delete(`/stocks/${symbol}`));
