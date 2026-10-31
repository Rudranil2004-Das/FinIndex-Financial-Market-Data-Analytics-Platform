-- FinIndex schema (SQLite). MySQL version is in docs/database-schema.md
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    exchange TEXT,
    sector TEXT,
    shares_outstanding INTEGER NOT NULL DEFAULT 1000000
);

CREATE TABLE IF NOT EXISTS stock_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_date TEXT NOT NULL,
    open_price REAL NOT NULL,
    high_price REAL NOT NULL,
    low_price REAL NOT NULL,
    close_price REAL NOT NULL,
    volume INTEGER NOT NULL,
    UNIQUE (stock_id, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_prices_date ON stock_prices(trade_date);

CREATE TABLE IF NOT EXISTS indices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    index_code TEXT NOT NULL UNIQUE,
    index_name TEXT NOT NULL,
    base_value REAL NOT NULL DEFAULT 1000,
    base_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS index_constituents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    index_id INTEGER NOT NULL REFERENCES indices(id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    weight REAL NOT NULL DEFAULT 0,
    UNIQUE (index_id, stock_id)
);

CREATE TABLE IF NOT EXISTS index_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    index_id INTEGER NOT NULL REFERENCES indices(id) ON DELETE CASCADE,
    calculation_date TEXT NOT NULL,
    index_value REAL NOT NULL,
    daily_return REAL,
    UNIQUE (index_id, calculation_date)
);

CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    valid_records INTEGER NOT NULL DEFAULT 0,
    invalid_records INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing',
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS validation_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER,
    column_name TEXT,
    error_message TEXT NOT NULL
);
