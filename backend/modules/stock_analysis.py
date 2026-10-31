"""Phase 1 & 4: returns, moving averages, performance tables."""
import numpy as np
import pandas as pd


def add_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Expects columns symbol, date, close (+ optional others). Adds returns and moving averages."""
    df = prices.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["symbol", "date"])
    g = df.groupby("symbol")["close"]
    df["price_change"] = g.diff()
    # Daily Return (%) = (Current Close - Previous Close) / Previous Close * 100
    df["daily_return"] = g.pct_change() * 100
    df["cumulative_return"] = (g.transform(lambda s: s / s.iloc[0]) - 1) * 100
    df["sma_20"] = g.transform(lambda s: s.rolling(20).mean())
    df["sma_50"] = g.transform(lambda s: s.rolling(50).mean())
    return df


def performance_table(prices: pd.DataFrame, stocks: pd.DataFrame) -> pd.DataFrame:
    """One row per stock: start/end price, total return, volatility, volume, market cap."""
    if prices.empty:
        return pd.DataFrame()
    df = add_returns(prices)
    rows = []
    for symbol, g in df.groupby("symbol"):
        first, last = g.iloc[0], g.iloc[-1]
        rows.append({
            "symbol": symbol,
            "start_price": first["close"], "latest_price": last["close"],
            "total_return": (last["close"] / first["close"] - 1) * 100,
            "avg_daily_return": g["daily_return"].mean(),
            "volatility": g["daily_return"].std(),
            "avg_price": g["close"].mean(),
            "total_volume": int(g["volume"].sum()),
            "latest_date": last["date"],
        })
    perf = pd.DataFrame(rows).merge(stocks[["symbol", "company_name", "sector", "shares_outstanding"]], on="symbol", how="left")
    # Market Capitalization = Current Share Price x Shares Outstanding
    perf["market_cap"] = perf["latest_price"] * perf["shares_outstanding"]
    total = perf["market_cap"].sum()
    perf["market_cap_weight"] = perf["market_cap"] / total * 100 if total else 0.0
    return perf.sort_values("total_return", ascending=False).reset_index(drop=True)


def top_and_worst(perf: pd.DataFrame, n: int = 5):
    if perf.empty:
        return perf, perf
    return perf.head(n), perf.tail(n).sort_values("total_return")


def summary_text(perf: pd.DataFrame) -> str:
    if perf.empty:
        return "No data available."
    best, worst = perf.iloc[0], perf.iloc[-1]
    return (f"{len(perf)} stocks analysed. Average total return {perf['total_return'].mean():.2f}%. "
            f"Best: {best['symbol']} ({best['total_return']:.2f}%). "
            f"Weakest: {worst['symbol']} ({worst['total_return']:.2f}%).")


def normalised_market(prices: pd.DataFrame) -> pd.DataFrame:
    """Equal-weighted market line (each stock rebased to 100) + average daily return."""
    pivot = prices.pivot_table(index="date", columns="symbol", values="close").sort_index().ffill()
    rebased = pivot / pivot.iloc[0] * 100
    out = pd.DataFrame({"date": pivot.index, "market_value": rebased.mean(axis=1).values})
    out["avg_daily_return"] = pivot.pct_change().mean(axis=1).values * 100
    return out
