# Database schema

Tables: `stocks`, `stock_prices`, `indices`, `index_constituents`, `index_values`, `import_batches`, `validation_errors`.
The working schema for SQLite is `backend/database/schema.sql`.

Key rules: `stocks.symbol` unique; `stock_prices` unique on (stock_id, trade_date); child tables cascade on delete.

## MySQL version of the schema

```sql
CREATE DATABASE finindex CHARACTER SET utf8mb4;
USE finindex;

CREATE TABLE stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(12) NOT NULL UNIQUE,
  company_name VARCHAR(150) NOT NULL,
  exchange VARCHAR(50), sector VARCHAR(80),
  shares_outstanding BIGINT NOT NULL DEFAULT 1000000
);
CREATE TABLE stock_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL, trade_date DATE NOT NULL,
  open_price DECIMAL(14,4) NOT NULL, high_price DECIMAL(14,4) NOT NULL,
  low_price DECIMAL(14,4) NOT NULL, close_price DECIMAL(14,4) NOT NULL,
  volume BIGINT NOT NULL,
  UNIQUE KEY uq_stock_date (stock_id, trade_date),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);
CREATE TABLE indices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  index_code VARCHAR(12) NOT NULL UNIQUE, index_name VARCHAR(120) NOT NULL,
  base_value DECIMAL(14,4) NOT NULL DEFAULT 1000, base_date DATE NOT NULL
);
CREATE TABLE index_constituents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  index_id INT NOT NULL, stock_id INT NOT NULL, weight DECIMAL(10,6) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_index_stock (index_id, stock_id),
  FOREIGN KEY (index_id) REFERENCES indices(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);
CREATE TABLE index_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  index_id INT NOT NULL, calculation_date DATE NOT NULL,
  index_value DECIMAL(16,6) NOT NULL, daily_return DECIMAL(10,6),
  UNIQUE KEY uq_index_date (index_id, calculation_date),
  FOREIGN KEY (index_id) REFERENCES indices(id) ON DELETE CASCADE
);
CREATE TABLE import_batches (
  id INT AUTO_INCREMENT PRIMARY KEY, filename VARCHAR(255) NOT NULL,
  total_records INT NOT NULL DEFAULT 0, valid_records INT NOT NULL DEFAULT 0,
  invalid_records INT NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'processing',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE validation_errors (
  id INT AUTO_INCREMENT PRIMARY KEY, batch_id INT NOT NULL,
  row_number INT, column_name VARCHAR(60), error_message VARCHAR(255) NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
);
```

Moving the app to MySQL means replacing `sqlite3` in `database/connection.py` with `mysql-connector-python` and adapting `db_operations.py`: `?` placeholders become `%s`, `INSERT OR IGNORE` becomes `INSERT IGNORE`, and `datetime('now')` is not needed. The rest of the app is unchanged.
