"""Phase 2: validation rules. Separates valid and invalid records and reports why."""
import numpy as np
import pandas as pd

REQUIRED = ["symbol", "date", "open", "high", "low", "close", "volume"]
PRICE_COLS = ["open", "high", "low", "close"]
OPTIONAL_INFO = ["company_name", "exchange", "sector", "shares_outstanding"]
SYMBOL_PATTERN = r"^[A-Z0-9][A-Z0-9.\-]{0,11}$"
UNUSUAL_MOVE_PCT = 20.0   # a single-day close move above this is flagged (warning only)
WARNING_PREFIX = "Warning: "


def validate_dataframe(raw: pd.DataFrame):
    """Return (valid_df, errors, stats). `errors` rows follow the validation_errors table."""
    df = raw.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing_cols = [c for c in REQUIRED if c not in df.columns]
    if missing_cols:
        raise ValueError("Missing required column(s): " + ", ".join(missing_cols))

    df = df.reset_index(drop=True)
    row_no = df.index + 2                      # +1 header, +1 for 1-based rows
    bad = pd.Series(False, index=df.index)
    errors: list[dict] = []

    def flag(mask: pd.Series, column: str, message: str):
        nonlocal bad
        for i in df.index[mask.fillna(False)]:
            errors.append({"row_number": int(row_no[i]), "column_name": column, "error_message": message})
        bad = bad | mask.fillna(False)

    present = {}
    for col in REQUIRED:
        text = df[col].astype("string").str.strip()
        present[col] = text.notna() & (text != "")
        flag(~present[col], col, f"Missing value in '{col}'")

    symbol = df["symbol"].astype("string").str.strip().str.upper()
    flag(present["symbol"] & ~symbol.str.match(SYMBOL_PATTERN).fillna(False), "symbol", "Invalid stock symbol")

    dates = pd.to_datetime(df["date"], errors="coerce", format="mixed")
    flag(present["date"] & dates.isna(), "date", "Invalid date format")

    num = {}
    for col in PRICE_COLS + ["volume"]:
        num[col] = pd.to_numeric(df[col], errors="coerce")
        flag(present[col] & num[col].isna(), col, f"'{col}' is not a number")
    for col in PRICE_COLS:
        flag(num[col].notna() & (num[col] <= 0), col, f"'{col}' must be a positive price")
    flag(num["volume"].notna() & (num["volume"] < 0), "volume", "Trading volume cannot be negative")

    all_numeric = pd.concat([num[c] for c in PRICE_COLS], axis=1).notna().all(axis=1)
    o, h, l, c = (num[k] for k in PRICE_COLS)
    inconsistent = all_numeric & ((h < l) | (h < o) | (h < c) | (l > o) | (l > c))
    flag(inconsistent, "high/low", "High/low inconsistent with open and close")

    key = symbol.fillna("") + "|" + dates.dt.strftime("%Y-%m-%d").fillna("")
    duplicate = key.duplicated(keep="first") & dates.notna() & present["symbol"]
    flag(duplicate, "symbol,date", "Duplicate record (same symbol and date)")

    # ---- build the valid dataset
    valid = pd.DataFrame({
        "symbol": symbol, "date": dates.dt.strftime("%Y-%m-%d"),
        "open": o, "high": h, "low": l, "close": c, "volume": num["volume"],
    })
    for col in OPTIONAL_INFO:
        if col in df.columns:
            valid[col] = df[col]
    valid = valid[~bad].copy()
    valid["volume"] = valid["volume"].astype("int64")

    # ---- warnings: unusual daily moves (valid rows only, still imported)
    unusual = 0
    if not valid.empty:
        tmp = valid.assign(_row=row_no[valid.index]).sort_values(["symbol", "date"])
        move = tmp.groupby("symbol")["close"].pct_change().abs() * 100
        for i in tmp.index[move > UNUSUAL_MOVE_PCT]:
            errors.append({"row_number": int(tmp.at[i, "_row"]), "column_name": "close",
                           "error_message": f"{WARNING_PREFIX}unusual price movement ({move[i]:.1f}% in one day)"})
            unusual += 1

    problems = [e for e in errors if not e["error_message"].startswith(WARNING_PREFIX)]
    stats = {
        "total_records": int(len(df)),
        "valid_records": int(len(valid)),
        "invalid_records": int(bad.sum()),
        "missing_values": sum(e["error_message"].startswith("Missing") for e in problems),
        "duplicate_records": int(duplicate.sum()),
        "unusual_movements": unusual,
        "quality_score": round(100 * len(valid) / len(df), 2) if len(df) else 0.0,
    }
    return valid.reset_index(drop=True), errors, stats


def validation_report(errors: list[dict], stats: dict) -> pd.DataFrame:
    """Invalid-record report as a DataFrame (Phase 2 deliverable)."""
    return pd.DataFrame(errors, columns=["row_number", "column_name", "error_message"])
