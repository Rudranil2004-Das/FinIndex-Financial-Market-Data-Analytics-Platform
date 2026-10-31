"""Phase 1/4: charts and exportable reports."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")                      # no GUI needed
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CHART_DIR = ROOT / "output" / "charts"
REPORT_DIR = ROOT / "output" / "reports"
PROCESSED_DIR = ROOT / "data" / "processed"


def price_chart(df: pd.DataFrame, symbol: str) -> Path:
    """df needs date, close, sma_20, sma_50 for one symbol."""
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(df["date"], df["close"], label="Close", color="#3b82f6")
    ax.plot(df["date"], df["sma_20"], label="SMA 20", color="#22c55e", linewidth=1)
    ax.plot(df["date"], df["sma_50"], label="SMA 50", color="#f59e0b", linewidth=1)
    ax.set_title(f"{symbol} closing price (sample data)")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.autofmt_xdate()
    path = CHART_DIR / f"{symbol}_price.png"
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def save_processed(df: pd.DataFrame, name: str) -> Path:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    path = PROCESSED_DIR / name
    df.to_csv(path, index=False)
    return path


def save_report(df: pd.DataFrame, name: str) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / name
    df.to_csv(path, index=False)
    return path
