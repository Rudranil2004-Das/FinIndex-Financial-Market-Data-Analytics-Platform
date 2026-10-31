"""All SQL lives here: CRUD, joins, window functions, import transactions."""
import pandas as pd

from database.connection import db_session, get_connection
from modules.data_cleaner import clean_dataframe
from modules.data_validator import validate_dataframe

DEFAULT_SHARES = 1_000_000
MAX_STORED_ERRORS = 5000


def query(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_connection()
    try:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()


def query_one(sql: str, params: tuple = ()):
    rows = query(sql, params)
    return rows[0] if rows else None


# ------------------------------------------------------------------ stocks
LATEST_SQL = """
WITH ranked AS (
    SELECT stock_id, trade_date, close_price, volume,
           ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY trade_date DESC) AS rn
    FROM stock_prices
)
SELECT s.id, s.symbol, s.company_name, s.exchange, s.sector, s.shares_outstanding,
       r1.close_price AS latest_close, r1.volume AS latest_volume, r1.trade_date AS latest_date,
       r2.close_price AS prev_close
FROM stocks s
LEFT JOIN ranked r1 ON r1.stock_id = s.id AND r1.rn = 1
LEFT JOIN ranked r2 ON r2.stock_id = s.id AND r2.rn = 2
ORDER BY s.symbol
"""


def list_stocks_with_latest() -> list[dict]:
    rows = query(LATEST_SQL)
    for r in rows:
        prev, last = r["prev_close"], r["latest_close"]
        r["daily_change_pct"] = (last / prev - 1) * 100 if prev and last else None
    return rows


def get_stock(symbol: str):
    return query_one("SELECT * FROM stocks WHERE symbol = ?", (symbol.upper(),))


def create_stock(data: dict) -> dict:
    with db_session() as conn:
        cur = conn.execute(
            "INSERT INTO stocks (symbol, company_name, exchange, sector, shares_outstanding) VALUES (?,?,?,?,?)",
            (data["symbol"], data["company_name"], data.get("exchange"), data.get("sector"),
             data.get("shares_outstanding", DEFAULT_SHARES)))
        new_id = cur.lastrowid
    return query_one("SELECT * FROM stocks WHERE id = ?", (new_id,))


def update_stock(symbol: str, data: dict):
    fields = [f for f in ("company_name", "exchange", "sector", "shares_outstanding") if f in data]
    if fields:
        with db_session() as conn:
            conn.execute(f"UPDATE stocks SET {', '.join(f + ' = ?' for f in fields)} WHERE symbol = ?",
                         tuple(data[f] for f in fields) + (symbol.upper(),))
    return get_stock(symbol)


def delete_stock(symbol: str) -> bool:
    with db_session() as conn:
        return conn.execute("DELETE FROM stocks WHERE symbol = ?", (symbol.upper(),)).rowcount > 0


def get_stocks_df() -> pd.DataFrame:
    return pd.DataFrame(query("SELECT symbol, company_name, exchange, sector, shares_outstanding FROM stocks"))


def get_prices_df(symbols=None, start=None, end=None) -> pd.DataFrame:
    sql = """SELECT s.symbol, p.trade_date AS date, p.open_price AS open, p.high_price AS high,
                    p.low_price AS low, p.close_price AS close, p.volume
             FROM stock_prices p JOIN stocks s ON s.id = p.stock_id WHERE 1=1"""
    params: list = []
    if symbols:
        sql += f" AND s.symbol IN ({','.join('?' * len(symbols))})"
        params += [s.upper() for s in symbols]
    if start:
        sql += " AND p.trade_date >= ?"; params.append(start)
    if end:
        sql += " AND p.trade_date <= ?"; params.append(end)
    sql += " ORDER BY s.symbol, p.trade_date"
    return pd.DataFrame(query(sql, tuple(params)),
                        columns=["symbol", "date", "open", "high", "low", "close", "volume"])


def counts() -> dict:
    return query_one("""SELECT (SELECT COUNT(*) FROM stocks) AS stocks,
                               (SELECT COUNT(*) FROM stock_prices) AS price_records,
                               (SELECT COUNT(*) FROM indices) AS indices,
                               (SELECT MAX(trade_date) FROM stock_prices) AS latest_trade_date,
                               (SELECT MIN(trade_date) FROM stock_prices) AS first_trade_date""")


# ------------------------------------------------------------------ import
def ensure_stocks(conn, valid: pd.DataFrame) -> dict:
    ids = {r["symbol"]: r["id"] for r in conn.execute("SELECT id, symbol FROM stocks")}
    for symbol, g in valid.groupby("symbol"):
        if symbol in ids:
            continue

        def first(col):
            if col in g.columns:
                s = g[col].dropna()
                if len(s):
                    return str(s.iloc[0])
            return None

        try:
            shares = int(float(first("shares_outstanding")))
            shares = shares if shares > 0 else DEFAULT_SHARES
        except (TypeError, ValueError):
            shares = DEFAULT_SHARES
        cur = conn.execute(
            "INSERT INTO stocks (symbol, company_name, exchange, sector, shares_outstanding) VALUES (?,?,?,?,?)",
            (symbol, first("company_name") or symbol, first("exchange"), first("sector"), shares))
        ids[symbol] = cur.lastrowid
    return ids


def insert_prices(conn, valid: pd.DataFrame, ids: dict) -> int:
    rows = [(ids[r.symbol], r.date, float(r.open), float(r.high), float(r.low), float(r.close), int(r.volume))
            for r in valid.itertuples(index=False)]
    cur = conn.executemany(
        "INSERT OR IGNORE INTO stock_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, volume) "
        "VALUES (?,?,?,?,?,?,?)", rows)
    return cur.rowcount if rows else 0


def run_import(filename: str, raw_df: pd.DataFrame) -> dict:
    """Clean -> validate -> store valid rows + errors in ONE transaction."""
    cleaned = clean_dataframe(raw_df)
    valid, errors, stats = validate_dataframe(cleaned)       # ValueError if columns missing
    with db_session() as conn:
        batch_id = conn.execute(
            "INSERT INTO import_batches (filename, total_records, valid_records, invalid_records, status) VALUES (?,?,?,?,?)",
            (filename, stats["total_records"], stats["valid_records"], stats["invalid_records"], "processing")).lastrowid
        ids = ensure_stocks(conn, valid)
        inserted = insert_prices(conn, valid, ids)
        conn.executemany(
            "INSERT INTO validation_errors (batch_id, row_number, column_name, error_message) VALUES (?,?,?,?)",
            [(batch_id, e["row_number"], e["column_name"], e["error_message"]) for e in errors[:MAX_STORED_ERRORS]])
        status = "failed" if stats["valid_records"] == 0 else (
            "completed_with_errors" if stats["invalid_records"] else "completed")
        conn.execute("UPDATE import_batches SET status = ? WHERE id = ?", (status, batch_id))
    return {"batch_id": batch_id, "filename": filename, "status": status, **stats,
            "inserted_records": inserted, "skipped_existing": stats["valid_records"] - inserted,
            "errors_preview": errors[:20]}


def list_batches(limit: int = 50) -> list[dict]:
    return query("SELECT * FROM import_batches ORDER BY id DESC LIMIT ?", (limit,))


def get_batch(batch_id: int):
    return query_one("SELECT * FROM import_batches WHERE id = ?", (batch_id,))


def list_errors(batch_id=None, limit: int = 200, offset: int = 0) -> list[dict]:
    sql = "SELECT * FROM validation_errors"
    params: list = []
    if batch_id:
        sql += " WHERE batch_id = ?"; params.append(batch_id)
    sql += " ORDER BY id LIMIT ? OFFSET ?"
    return query(sql, tuple(params + [limit, offset]))


def validation_summary() -> dict:
    totals = query_one("""SELECT COALESCE(SUM(total_records),0) AS total_checked,
                                 COALESCE(SUM(valid_records),0) AS valid_records,
                                 COALESCE(SUM(invalid_records),0) AS invalid_records,
                                 COUNT(*) AS batches FROM import_batches""")
    kinds = query("""SELECT CASE WHEN error_message LIKE 'Warning:%' THEN 'Warning: unusual price movement'
                                 ELSE error_message END AS error_message, column_name, COUNT(*) AS count
                     FROM validation_errors GROUP BY 1, 2 ORDER BY count DESC""")
    totals["missing_values"] = sum(k["count"] for k in kinds if k["error_message"].startswith("Missing"))
    totals["duplicate_records"] = sum(k["count"] for k in kinds if k["error_message"].startswith("Duplicate"))
    totals["unusual_movements"] = sum(k["count"] for k in kinds if k["error_message"].startswith("Warning"))
    totals["quality_score"] = round(100 * totals["valid_records"] / totals["total_checked"], 2) if totals["total_checked"] else 0.0
    totals["by_type"] = kinds
    return totals


# ------------------------------------------------------------------ indices
def create_index(code: str, name: str, base_value: float, base_date: str, weights: pd.DataFrame) -> int:
    with db_session() as conn:
        index_id = conn.execute(
            "INSERT INTO indices (index_code, index_name, base_value, base_date) VALUES (?,?,?,?)",
            (code, name, base_value, base_date)).lastrowid
        stock_ids = {r["symbol"]: r["id"] for r in conn.execute("SELECT id, symbol FROM stocks")}
        conn.executemany(
            "INSERT INTO index_constituents (index_id, stock_id, weight) VALUES (?,?,?)",
            [(index_id, stock_ids[r.symbol], float(r.weight)) for r in weights.itertuples()])
    return index_id


def list_indices() -> list[dict]:
    rows = query("""SELECT i.*,
        (SELECT COUNT(*) FROM index_constituents c WHERE c.index_id = i.id) AS constituent_count,
        (SELECT index_value FROM index_values v WHERE v.index_id = i.id ORDER BY calculation_date DESC LIMIT 1) AS latest_value,
        (SELECT calculation_date FROM index_values v WHERE v.index_id = i.id ORDER BY calculation_date DESC LIMIT 1) AS latest_date
        FROM indices i ORDER BY i.id""")
    for r in rows:
        r["performance_pct"] = (r["latest_value"] / r["base_value"] - 1) * 100 if r["latest_value"] else None
    return rows


def get_index(index_id: int):
    return query_one("SELECT * FROM indices WHERE id = ?", (index_id,))


def get_constituents(index_id: int) -> list[dict]:
    return query("""SELECT s.symbol, s.company_name, s.sector, s.shares_outstanding, c.weight
                    FROM index_constituents c JOIN stocks s ON s.id = c.stock_id
                    WHERE c.index_id = ? ORDER BY c.weight DESC""", (index_id,))


def save_index_values(index_id: int, df: pd.DataFrame) -> None:
    with db_session() as conn:
        conn.execute("DELETE FROM index_values WHERE index_id = ?", (index_id,))
        conn.executemany(
            "INSERT INTO index_values (index_id, calculation_date, index_value, daily_return) VALUES (?,?,?,?)",
            [(index_id, r.calculation_date, float(r.index_value),
              None if pd.isna(r.daily_return) else float(r.daily_return)) for r in df.itertuples()])


def get_index_values(index_id: int) -> list[dict]:
    return query("SELECT calculation_date AS date, index_value, daily_return FROM index_values "
                 "WHERE index_id = ? ORDER BY calculation_date", (index_id,))
