"""Phase 4: simplified market-cap-weighted index (educational model).

Index Value = Base Value x (Current Market Cap / Base Market Cap)
No free-float, divisor or corporate-action adjustments. This does NOT reproduce
any proprietary index-provider methodology.
"""
import pandas as pd


def _pivot(prices: pd.DataFrame, symbols: list[str]) -> pd.DataFrame:
    sub = prices[prices["symbol"].isin(symbols)]
    return sub.pivot_table(index="date", columns="symbol", values="close").sort_index()


def resolve_base_date(prices: pd.DataFrame, symbols: list[str], base_date: str) -> str:
    """First date on/after base_date on which every constituent has a price."""
    piv = _pivot(prices, symbols).dropna()
    piv = piv[piv.index >= pd.to_datetime(base_date).strftime("%Y-%m-%d")]
    if piv.empty:
        raise ValueError("No common trading date on or after the base date for these stocks.")
    return piv.index[0]


def constituent_weights(prices: pd.DataFrame, shares: dict, symbols: list[str], on_date: str) -> pd.DataFrame:
    """Weight (%) = Stock Market Cap / Total Index Market Cap x 100"""
    close = _pivot(prices, symbols).loc[on_date]
    mcap = close * pd.Series({s: shares[s] for s in symbols})
    out = pd.DataFrame({"symbol": mcap.index, "price": close.values, "market_cap": mcap.values})
    out["weight"] = out["market_cap"] / out["market_cap"].sum() * 100
    return out.sort_values("weight", ascending=False).reset_index(drop=True)


def calculate_index(prices: pd.DataFrame, shares: dict, symbols: list[str],
                    base_value: float, base_date: str) -> pd.DataFrame:
    piv = _pivot(prices, symbols).dropna()          # only dates where all constituents traded
    piv = piv[piv.index >= base_date]
    if piv.empty:
        raise ValueError("No price data available from the base date.")
    mcap = piv.mul(pd.Series({s: shares[s] for s in symbols}), axis=1).sum(axis=1)
    base_mcap = mcap.iloc[0]
    out = pd.DataFrame({"calculation_date": piv.index,
                        "index_value": (base_value * mcap / base_mcap).values})
    out["daily_return"] = out["index_value"].pct_change() * 100
    return out
