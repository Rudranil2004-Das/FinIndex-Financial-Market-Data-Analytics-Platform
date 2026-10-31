import re
import sqlite3

from flask import Blueprint, request

import database.db_operations as ops
from modules.stock_analysis import add_returns
from utils.helpers import ApiError, df_records, ok, paginate

bp = Blueprint("stocks", __name__, url_prefix="/api/stocks")
SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,11}$")
SORTABLE = {"symbol", "company_name", "sector", "latest_close", "daily_change_pct", "latest_volume"}


def _payload(partial: bool = False) -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be JSON.")
    out = {}
    if not partial:
        symbol = str(data.get("symbol", "")).strip().upper()
        if not SYMBOL_RE.match(symbol):
            raise ApiError("A valid stock symbol is required (letters, digits, '.' or '-').")
        out["symbol"] = symbol
    if "company_name" in data or not partial:
        name = str(data.get("company_name", "")).strip()
        if not name:
            raise ApiError("company_name is required.")
        out["company_name"] = name
    for f in ("exchange", "sector"):
        if f in data:
            out[f] = (str(data[f]).strip() or None) if data[f] is not None else None
    if "shares_outstanding" in data:
        try:
            shares = int(data["shares_outstanding"])
        except (TypeError, ValueError):
            raise ApiError("shares_outstanding must be a whole number.")
        if shares <= 0:
            raise ApiError("shares_outstanding must be positive.")
        out["shares_outstanding"] = shares
    return out


@bp.get("")
def list_stocks():
    rows = ops.list_stocks_with_latest()
    search = request.args.get("search", "").strip().lower()
    sector = request.args.get("sector", "").strip()
    if search:
        rows = [r for r in rows if search in r["symbol"].lower() or search in r["company_name"].lower()]
    if sector:
        rows = [r for r in rows if r["sector"] == sector]
    sectors = sorted({r["sector"] for r in ops.list_stocks_with_latest() if r["sector"]})
    sort = request.args.get("sort", "symbol")
    if sort in SORTABLE:
        desc = request.args.get("order", "asc") == "desc"
        have = [r for r in rows if r[sort] is not None]
        rows = sorted(have, key=lambda r: r[sort], reverse=desc) + [r for r in rows if r[sort] is None]
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    return ok({**paginate(rows, page, per_page), "sectors": sectors})


@bp.get("/<symbol>")
def stock_detail(symbol):
    stock = ops.get_stock(symbol)
    if not stock:
        raise ApiError(f"Stock '{symbol.upper()}' not found.", 404)
    prices = ops.get_prices_df([symbol], request.args.get("start"), request.args.get("end"))
    if prices.empty:
        return ok({"stock": stock, "history": [], "summary": None})
    df = add_returns(prices)
    last = df.iloc[-1]
    summary = {
        "latest_close": last["close"], "latest_date": last["date"],
        "period_high": df["high"].max(), "period_low": df["low"].min(),
        "total_return": last["cumulative_return"],
        "avg_daily_return": df["daily_return"].mean(), "volatility": df["daily_return"].std(),
        "avg_volume": df["volume"].mean(), "trading_days": len(df),
        "best_day": df["daily_return"].max(), "worst_day": df["daily_return"].min(),
        "market_cap": last["close"] * stock["shares_outstanding"],
    }
    return ok({"stock": stock, "history": df_records(df), "summary": summary})


@bp.post("")
def create():
    data = _payload()
    try:
        return ok(ops.create_stock(data), 201)
    except sqlite3.IntegrityError:
        raise ApiError(f"Stock '{data['symbol']}' already exists.", 409)


@bp.put("/<symbol>")
def update(symbol):
    if not ops.get_stock(symbol):
        raise ApiError(f"Stock '{symbol.upper()}' not found.", 404)
    return ok(ops.update_stock(symbol, _payload(partial=True)))


@bp.delete("/<symbol>")
def delete(symbol):
    if not ops.delete_stock(symbol):
        raise ApiError(f"Stock '{symbol.upper()}' not found.", 404)
    return ok({"deleted": symbol.upper()})
