"""Phase 2: light, safe cleaning before validation (never invents data)."""
import pandas as pd


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    # Trim whitespace in every text cell and turn blanks into NaN
    for col in df.columns:
        df[col] = df[col].astype("string").str.strip().replace("", pd.NA)
    if "symbol" in df.columns:
        df["symbol"] = df["symbol"].str.upper()    # consistent symbols
    return df
