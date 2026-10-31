# FinIndex: Financial Market Data & Analytics Platform

A full-stack financial analytics app: import stock CSV files, validate them, store them in a database, analyse returns and moving averages, build simplified market-cap-weighted indices and explore everything in a React dashboard.

**Stack:** Python 3.12, Flask, Pandas, NumPy, Matplotlib, SQLite (MySQL schema included), React 18, Vite, Tailwind CSS 3, Axios, Recharts, Lucide.

> All bundled data is **sample data** for fictional companies on a fictional exchange. FinIndex never presents it as real-time market data. The index is a documented educational model, not a copy of any official index.

## Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (`pip install uv` if you do not have it)
- Node.js 18+ (20 LTS recommended) and npm

## Run it (two terminals)

### Terminal 1: backend (Flask on port 5000)

Windows (PowerShell / CMD):

```
cd FinIndex\backend
uv venv
.venv\Scripts\activate
uv pip install -r requirements.txt
python cli.py load ..\data\sample\sample_stocks.csv
python app.py
```

macOS / Linux:

```
cd FinIndex/backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python cli.py load ../data/sample/sample_stocks.csv
python app.py
```

`cli.py load` is optional: it pre-loads the sample data. You can also skip it and upload the CSV from the Data Import page. The SQLite database (`backend/finindex.db`) is created automatically on first run.

Check it works: open <http://127.0.0.1:5000/api/health>.

### Terminal 2: frontend (Vite on port 5173)

```
cd FinIndex/frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to Flask, so no extra configuration is needed.

## Suggested walkthrough

1. **Data Import**: upload `data/sample/sample_stocks.csv` (skip if you ran `cli.py load`).
2. **Dashboard** and **Market Watch**: browse summaries, search, sort and open a stock.
3. **Indices**: click *New index*, keep all stocks selected, create it, then open the details page.
4. **Analytics**: compare stocks, see sector weights, export CSV reports.
5. **Data Validation**: import `data/sample/sample_with_errors.csv` (it has missing values, a bad symbol, a bad date, a duplicate, negative values, a high below low and an unusual price jump) and watch the validation centre report each issue.

## CSV format

Required columns: `symbol, date, open, high, low, close, volume`.
Optional (used when a stock is first seen): `company_name, exchange, sector, shares_outstanding` (default 1,000,000 shares).

## Command-line helpers (run inside `backend/`)

| Command | What it does |
|---|---|
| `python cli.py generate-sample` | Regenerate the sample CSV files in `data/sample` |
| `python cli.py process <csv>` | Phase 1 pipeline: validate, returns, moving averages, charts, exports to `data/processed` and `output/charts` |
| `python cli.py load <csv>` | Import a CSV into the database (same pipeline as the upload page) |
| `python cli.py reset-db` | Delete the SQLite database |

## Where each phase lives

| Phase | Code |
|---|---|
| 1. Python and financial data processing | `modules/data_loader.py`, `modules/stock_analysis.py`, `modules/report_generator.py`, `cli.py process` |
| 2. Cleaning and validation | `modules/data_cleaner.py`, `modules/data_validator.py` |
| 3. SQL and database | `database/schema.sql`, `database/connection.py`, `database/db_operations.py` (JOINs, window functions, transactions) |
| 4. Calculation engine | `modules/stock_analysis.py`, `modules/index_calculator.py` |
| 5. Flask backend | `app.py`, `routes/*.py` |
| 6. React frontend | `frontend/src/pages`, `components`, `layouts` |
| 7. Integration | `frontend/src/api/*.js`, `hooks/useFetch.js` |
| 8. Quality and testing | `utils/logger.py`, error handlers in `app.py`, `docs/testing.md` |
| 9. Git and docs | `.gitignore`, `docs/` |

## Financial formulas

- Daily return (%) = (Close − Previous close) ÷ Previous close × 100
- Market cap = Close × Shares outstanding
- Weight (%) = Stock market cap ÷ Total index market cap × 100
- Index value = Base value × (Current market cap ÷ Base market cap)

Simplifications: no free-float adjustment, divisor or corporate actions. The index only uses dates on which every constituent has a price, and the base date moves to the first date where all constituents traded.

## Troubleshooting

- **"API offline" badge or network error:** Flask is not running. Start `python app.py` in `backend/` (port 5000).
- **Port 5000 busy (common on macOS):** run `set PORT=5001` (Windows) or `PORT=5001 python app.py`, then change the target in `frontend/vite.config.js`.
- **Import says "Missing required column(s)":** check the CSV header names (case does not matter).
- **Reset everything:** stop Flask, run `python cli.py reset-db`, start again.

## Docs

`docs/architecture.md`, `docs/database-schema.md`, `docs/api-documentation.md`, `docs/testing.md`.
