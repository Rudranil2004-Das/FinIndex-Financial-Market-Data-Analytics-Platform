"""Phase 1: load and export CSV files."""
from pathlib import Path

import pandas as pd


def load_csv(source) -> pd.DataFrame:
    """Read a CSV (path or file-like) as text so validation can judge every cell."""
    df = pd.read_csv(source, dtype=str, skipinitialspace=True, keep_default_na=True)
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def export_csv(df: pd.DataFrame, path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path
