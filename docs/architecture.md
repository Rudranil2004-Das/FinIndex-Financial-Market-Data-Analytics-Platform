# Architecture

```
React (Vite, :5173)  --/api-->  Flask (:5000)  -->  modules/ (Pandas, NumPy)
        Axios                    routes/*.py   -->  database/ (SQLite)
```

- **routes/**: thin HTTP layer. Parse input, call modules or database functions, return JSON.
- **modules/**: pure data logic with no Flask code (loader, cleaner, validator, stock_analysis, index_calculator, report_generator). Easy to test on their own.
- **database/**: schema, connection and all SQL. `run_import` writes the batch, stocks, prices and validation errors in one transaction.
- **utils/**: logging, JSON-safe conversion (NaN to null), `ApiError`.
- **frontend/src/api**: one Axios instance (`api.js`) plus a file per resource.
- **Import flow:** upload, load as text, clean (trim, uppercase), validate (separate valid and invalid), store valid rows (`INSERT OR IGNORE` on the unique stock/date pair), store issues, return a batch summary.
- **Errors:** every failure returns `{"error": "message"}` with a suitable status code; unexpected errors are logged with a traceback.
