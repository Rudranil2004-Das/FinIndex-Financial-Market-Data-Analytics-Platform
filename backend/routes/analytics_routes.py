from flask import Blueprint, Response, request

import database.db_operations as ops
from modules.report_generator import save_report
from modules.stock_analysis import add_returns, normalised_market, performance_table, summary_text, top_and_worst
from utils.helpers import ApiError, df_records, ok

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _perf(start=None, end=None):
    prices = ops.get_prices_df(None, start, end)
    return prices, performance_table(prices, ops.get_stocks_df())


@bp.get("/returns")
def returns():
    start, end = request.args.get("start"), request.args.get("end")
    prices, perf = _perf(start, end)
    if prices.empty:
        return ok({"symbols": [], "comparison": [], "market_daily": [], "performance": [], "summary": "No data available."})
    wanted = [s.strip().upper() for s in request.args.get("symbols", "").split(",") if s.strip()]
    symbols = wanted or sorted(prices["symbol"].unique())[:5]
    df = add_returns(prices[prices["symbol"].isin(symbols)])
    comparison = df.pivot(index="date", columns="symbol", values="cumulative_return").reset_index()
    market = normalised_market(prices)
    return ok({
        "symbols": symbols,
        "comparison": df_records(comparison),
        "market_daily": df_records(market[["date", "avg_daily_return"]]),
        "performance": df_records(perf),
        "summary": summary_text(perf),
    })


@bp.get("/top-performers")
def top_performers():
    n = min(request.args.get("n", 5, type=int), 50)
    _, perf = _perf(request.args.get("start"), request.args.get("end"))
    top, worst = top_and_worst(perf, n)
    return ok({"top": df_records(top), "worst": df_records(worst)})


@bp.get("/market-cap")
def market_cap():
    _, perf = _perf()
    if perf.empty:
        return ok([])
    cols = ["symbol", "company_name", "sector", "latest_price", "shares_outstanding", "market_cap", "market_cap_weight"]
    return ok(df_records(perf[cols].sort_values("market_cap", ascending=False)))


@bp.get("/export")
def export():
    kind = request.args.get("kind", "performance")
    prices, perf = _perf()
    if prices.empty:
        raise ApiError("There is no data to export yet.", 404)
    if kind == "performance":
        df, name = perf, "performance_report.csv"
    elif kind == "returns":
        df, name = add_returns(prices), "processed_returns.csv"
    elif kind == "prices":
        df, name = prices, "clean_prices.csv"
    else:
        raise ApiError("kind must be performance, returns or prices.")
    save_report(df, name)                    # also keep a copy in output/reports
    return Response(df.to_csv(index=False), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={name}"})
