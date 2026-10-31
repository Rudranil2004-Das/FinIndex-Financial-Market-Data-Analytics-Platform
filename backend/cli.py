"""Command-line helpers.  Run from the backend folder:

    python cli.py generate-sample      create sample CSV files in ../data/sample
    python cli.py load ../data/sample/sample_stocks.csv
    python cli.py process ../data/sample/sample_stocks.csv     (Phase 1 pipeline: returns, charts, exports)
    python cli.py reset-db             delete the SQLite database file
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from database.connection import DB_PATH, init_db
from database.db_operations import run_import
from modules.data_cleaner import clean_dataframe
from modules.data_loader import load_csv
from modules.data_validator import validate_dataframe, validation_report
from modules.report_generator import price_chart, save_processed, save_report
from modules.stock_analysis import add_returns

SAMPLE_DIR = Path(__file__).resolve().parents[1] / "data" / "sample"

# Fictional companies on a fictional exchange: this is SAMPLE data, not real market data.
COMPANIES = [
    ("ALFA", "Alfa Software (Sample)", "Technology", 900_000_000),
    ("BRVO", "Bravo Banking Group (Sample)", "Financials", 1_400_000_000),
    ("CHRL", "Charlie Energy (Sample)", "Energy", 1_100_000_000),
    ("DLTA", "Delta Healthcare (Sample)", "Healthcare", 600_000_000),
    ("ECHO", "Echo Retail (Sample)", "Consumer", 750_000_000),
    ("FXTR", "Foxtrot Motors (Sample)", "Industrials", 500_000_000),
    ("GOLF", "Golf Telecom (Sample)", "Communication", 1_000_000_000),
    ("HOTL", "Hotel Utilities (Sample)", "Utilities", 400_000_000),
    ("INDG", "Indigo Materials (Sample)", "Materials", 350_000_000),
    ("JLTT", "Juliett Semiconductors (Sample)", "Technology", 800_000_000),
    ("KILO", "Kilo Insurance (Sample)", "Financials", 450_000_000),
    ("LIMA", "Lima Foods (Sample)", "Consumer", 300_000_000),
]


def _series(rng, symbol_info, dates, start_price, drift, vol):
    symbol, name, sector, shares = symbol_info
    closes = start_price * np.exp(np.cumsum(rng.normal(drift, vol, len(dates))))
    prev = np.concatenate([[start_price], closes[:-1]])
    opens = prev * (1 + rng.normal(0, 0.004, len(dates)))
    highs = np.maximum(opens, closes) * (1 + np.abs(rng.normal(0, 0.006, len(dates))))
    lows = np.minimum(opens, closes) * (1 - np.abs(rng.normal(0, 0.006, len(dates))))
    volume = rng.lognormal(14.5, 0.35, len(dates)).astype(int)
    return pd.DataFrame({
        "symbol": symbol, "company_name": name, "exchange": "SAMPLEX", "sector": sector,
        "shares_outstanding": shares, "date": dates.strftime("%Y-%m-%d"),
        "open": opens.round(2), "high": highs.round(2), "low": lows.round(2),
        "close": closes.round(2), "volume": volume})


def generate_sample():
    rng = np.random.default_rng(42)
    dates = pd.bdate_range("2024-01-01", periods=260)
    frames = [_series(rng, info, dates, rng.uniform(40, 600), rng.uniform(-0.0002, 0.0012), rng.uniform(0.009, 0.022))
              for info in COMPANIES]
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    pd.concat(frames).to_csv(SAMPLE_DIR / "sample_stocks.csv", index=False)

    # Second file: one new stock + deliberately broken rows to demo the validation centre
    new = _series(rng, ("NEWX", "Newex Industries (Sample)", "Industrials", 250_000_000), dates, 120, 0.0004, 0.012)
    new.loc[100, "close"] = round(new.loc[100, "close"] * 1.6, 2)          # unusual one-day jump (warning)
    new.loc[100, "high"] = round(new.loc[100, "close"] * 1.01, 2)
    extra = pd.bdate_range("2025-01-01", periods=8).strftime("%Y-%m-%d")    # dates not in the clean set
    bad = [new.iloc[3].copy() for _ in range(7)]
    for row, day in zip(bad, extra):
        row["date"] = day
    bad[0]["close"] = ""                                   # missing value
    bad[1]["open"] = -5                                    # negative price
    bad[2]["symbol"] = "BAD$SYM"                           # invalid symbol
    bad[3]["date"] = "2024-13-45"                          # invalid date
    bad[4]["date"] = new.iloc[10]["date"]                  # duplicate (same symbol + date)
    bad[5]["high"], bad[5]["low"] = 90, 130                # high below low
    bad[6]["volume"] = -100                                # negative volume
    pd.concat([new, pd.DataFrame(bad)]).to_csv(SAMPLE_DIR / "sample_with_errors.csv", index=False)
    print(f"Sample files written to {SAMPLE_DIR}")


def process(path):
    """Phase 1 pipeline: load -> clean -> validate -> returns/MAs -> charts -> exports."""
    raw = load_csv(path)
    valid, errors, stats = validate_dataframe(clean_dataframe(raw))
    print("Validation:", stats)
    processed = add_returns(valid)
    print("Clean data ->", save_processed(valid, "clean_prices.csv"))
    print("Returns    ->", save_processed(processed, "processed_returns.csv"))
    if errors:
        print("Issues     ->", save_report(validation_report(errors, stats), "validation_report.csv"))
    for symbol in sorted(processed["symbol"].unique())[:3]:
        print("Chart      ->", price_chart(processed[processed["symbol"] == symbol], symbol))
    totals = processed.groupby("symbol")["cumulative_return"].last().sort_values(ascending=False)
    print("\nTotal return % (best first):\n", totals.round(2).to_string())


def main():
    parser = argparse.ArgumentParser(description="FinIndex command-line helpers")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("generate-sample")
    sub.add_parser("reset-db")
    for name in ("load", "process"):
        sub.add_parser(name).add_argument("csv")
    args = parser.parse_args()

    if args.cmd == "generate-sample":
        generate_sample()
    elif args.cmd == "reset-db":
        DB_PATH.unlink(missing_ok=True)
        print("Database removed.")
    elif args.cmd == "load":
        init_db()
        result = run_import(Path(args.csv).name, load_csv(args.csv))
        print({k: v for k, v in result.items() if k != "errors_preview"})
    elif args.cmd == "process":
        process(args.csv)


if __name__ == "__main__":
    main()
