# API (base URL `/api`)

| Method | Route | Purpose |
|---|---|---|
| GET | /health | Status, DB info and record counts |
| GET | /dashboard/summary | Totals, average return, top/worst stocks, recent imports |
| GET | /dashboard/market-performance | Equal-weighted market line (base 100) and average daily return |
| GET | /stocks | List with latest close and daily change. Query: `search, sector, sort, order, page, per_page` |
| GET | /stocks/{symbol} | Info, price history with returns and SMA 20/50, summary. Query: `start, end` |
| POST | /stocks | Create a stock. JSON: `symbol, company_name, exchange, sector, shares_outstanding` |
| PUT | /stocks/{symbol} | Update company_name, exchange, sector, shares_outstanding |
| DELETE | /stocks/{symbol} | Delete a stock and its prices |
| POST | /import | Upload CSV (multipart field `file`) |
| GET | /import/history | All import batches |
| GET | /import/{batch_id} | One batch with its issues |
| POST | /validation/run | Re-validate everything stored in the database |
| GET | /validation/summary | Totals and issues grouped by type |
| GET | /validation/errors | Issues. Query: `batch_id, limit, offset` |
| GET | /analytics/returns | Cumulative-return comparison. Query: `symbols (comma list), start, end` |
| GET | /analytics/top-performers | `top` and `worst` lists. Query: `n, start, end` |
| GET | /analytics/market-cap | Market cap and weight per stock |
| GET | /analytics/export | CSV download. Query: `kind=performance|returns|prices` |
| GET | /indices | All indices with latest value and performance |
| POST | /indices | Create and calculate. JSON: `index_code, index_name, base_value, base_date, symbols` |
| POST | /indices/{id}/calculate | Recalculate and store index values |
| GET | /indices/{id}/history | Index, values, constituents (base and latest weights), statistics |

Status codes: 200/201 success, 400 invalid input, 404 not found, 409 duplicate, 413 file over 10 MB, 500 unexpected.
