from flask import Blueprint

import database.db_operations as ops
from modules.stock_analysis import normalised_market, performance_table, top_and_worst
from utils.helpers import df_records, ok

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.get("/summary")
def summary():
    c = ops.counts()
    prices, stocks = ops.get_prices_df(), ops.get_stocks_df()
    perf = performance_table(prices, stocks)
    top, worst = top_and_worst(perf, 5)
    market = normalised_market(prices) if not prices.empty else None
    return ok({
        "total_stocks": c["stocks"],
        "total_records": c["price_records"],
        "total_indices": c["indices"],
        "latest_trade_date": c["latest_trade_date"],
        "first_trade_date": c["first_trade_date"],
        "average_return": float(perf["total_return"].mean()) if not perf.empty else None,
        "latest_market_return": float(market["avg_daily_return"].iloc[-1]) if market is not None and len(market) > 1 else None,
        "top_performers": df_records(top[["symbol", "company_name", "latest_price", "total_return"]]) if not perf.empty else [],
        "worst_performers": df_records(worst[["symbol", "company_name", "latest_price", "total_return"]]) if not perf.empty else [],
        "recent_imports": ops.list_batches(5),
        "data_notice": "Sample / uploaded historical data only. This is not real-time market data.",
    })


@bp.get("/market-performance")
def market_performance():
    prices = ops.get_prices_df()
    if prices.empty:
        return ok([])
    return ok(df_records(normalised_market(prices)))
