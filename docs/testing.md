# Manual test checklist

| Area | Test | Expected |
|---|---|---|
| Import | Upload `sample_stocks.csv` | 3,120 valid, 0 invalid, status `completed` |
| Import | Upload it again | 0 newly stored, 3,120 skipped (already exist) |
| Import | Upload `sample_with_errors.csv` | 7 invalid rows, 2 unusual-move warnings, status `completed_with_errors` |
| Import | Upload a `.txt` file / empty file / wrong headers | 400 with a clear message |
| Empty data | Fresh database, open every page | Empty-state messages, no crashes |
| Stocks | Search, sector filter, sort, paginate | Table updates; no match shows an empty message |
| Stocks | POST an existing symbol | 409 |
| Index | Create with code `X` | 400 (code must be 2-12 characters) |
| Index | Create a valid index and view details | Base weights sum to 100, first value equals base value |
| Backend down | Stop Flask, reload the app | "API offline" badge and an error message with a retry button |

Quick backend smoke test from `backend/`: start the server, then open `/api/health` and `/api/dashboard/summary` in a browser.
