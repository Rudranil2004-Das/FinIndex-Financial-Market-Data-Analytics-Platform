import api from "./api";

const data = (p) => p.then((r) => r.data);

export const getIndices = () => data(api.get("/indices"));
export const createIndex = (body) => data(api.post("/indices", body));
export const calculateIndex = (id) => data(api.post(`/indices/${id}/calculate`));
export const getIndexHistory = (id) => data(api.get(`/indices/${id}/history`));
