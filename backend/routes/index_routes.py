import re
import sqlite3

import pandas as pd
from flask import Blueprint, request

import database.db_operations as ops
from modules.index_calculator import calculate_index, constituent_weights, resolve_base_date
from utils.helpers import ApiError, df_records, ok

bp = Blueprint("indices", __name__, url_prefix="/api/indices")
CODE_RE = re.compile(r"^[A-Z0-9_\-]{2,12}$")


def _compute(index_id: int):
    idx = ops.get_index(index_id)
    if not idx:
        raise ApiError("Index not found.", 404)
    cons = ops.get_constituents(index_id)
    symbols = [c["symbol"] for c in cons]
    shares = {c["symbol"]: c["shares_outstanding"] for c in cons}
    prices = ops.get_prices_df(symbols)
    if prices.empty:
        raise ApiError("No price data for this index's constituents.")
    try:
        base = resolve_base_date(prices, symbols, idx["base_date"])
        values = calculate_index(prices, shares, symbols, idx["base_value"], base)
    except ValueError as exc:
        raise ApiError(str(exc))
    ops.save_index_values(index_id, values)
    return values


@bp.get("")
def list_all():
    return ok(ops.list_indices())


@bp.post("")
def create():
    data = request.get_json(silent=True) or {}
    code = str(data.get("index_code", "")).strip().upper()
    name = str(data.get("index_name", "")).strip()
    if not CODE_RE.match(code):
        raise ApiError("index_code must be 2-12 characters: letters, digits, '_' or '-'.")
    if not name:
        raise ApiError("index_name is required.")
    try:
        base_value = float(data.get("base_value", 1000))
    except (TypeError, ValueError):
        raise ApiError("base_value must be a number.")
    if base_value <= 0:
        raise ApiError("base_value must be positive.")
    counts = ops.counts()
    if not counts["price_records"]:
        raise ApiError("Import price data before creating an index.")
    base_date = str(data.get("base_date") or counts["first_trade_date"])
    try:
        base_date = pd.to_datetime(base_date).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        raise ApiError("base_date must look like YYYY-MM-DD.")

    all_symbols = [s["symbol"] for s in ops.list_stocks_with_latest()]
    symbols = [str(s).upper() for s in data.get("symbols") or all_symbols]
    unknown = [s for s in symbols if s not in all_symbols]
    if unknown:
        raise ApiError("Unknown stock symbol(s): " + ", ".join(unknown))
    if not symbols:
        raise ApiError("Select at least one stock.")

    prices = ops.get_prices_df(symbols)
    shares = {r["symbol"]: r["shares_outstanding"] for r in ops.list_stocks_with_latest()}
    try:
        base_date = resolve_base_date(prices, symbols, base_date)
        weights = constituent_weights(prices, shares, symbols, base_date)
    except ValueError as exc:
        raise ApiError(str(exc))
    try:
        index_id = ops.create_index(code, name, base_value, base_date, weights)
    except sqlite3.IntegrityError:
        raise ApiError(f"An index with code '{code}' already exists.", 409)
    _compute(index_id)
    return ok(ops.get_index(index_id), 201)


@bp.post("/<int:index_id>/calculate")
def calculate(index_id):
    values = _compute(index_id)
    last = values.iloc[-1]
    return ok({"index_id": index_id, "points": len(values),
               "latest_date": last["calculation_date"], "latest_value": last["index_value"]})


@bp.get("/<int:index_id>/history")
def history(index_id):
    idx = ops.get_index(index_id)
    if not idx:
        raise ApiError("Index not found.", 404)
    values = ops.get_index_values(index_id)
    cons = ops.get_constituents(index_id)
    for c in cons:
        c["base_weight"] = c.pop("weight")
    if cons:
        prices = ops.get_prices_df([c["symbol"] for c in cons])
        if not prices.empty:
            latest = prices.sort_values("date").groupby("symbol").tail(1).set_index("symbol")
            for c in cons:
                c["latest_price"] = float(latest.loc[c["symbol"], "close"])
                c["market_cap"] = c["latest_price"] * c["shares_outstanding"]
            total = sum(c["market_cap"] for c in cons)
            for c in cons:
                c["latest_weight"] = c["market_cap"] / total * 100
    stats = None
    if values:
        v = pd.DataFrame(values)
        drawdown = (v["index_value"] / v["index_value"].cummax() - 1).min() * 100
        stats = {"latest_value": v["index_value"].iloc[-1],
                 "performance_pct": (v["index_value"].iloc[-1] / idx["base_value"] - 1) * 100,
                 "avg_daily_return": v["daily_return"].mean(), "volatility": v["daily_return"].std(),
                 "best_day": v["daily_return"].max(), "worst_day": v["daily_return"].min(),
                 "max_drawdown": drawdown, "points": len(v)}
    return ok({"index": idx, "values": values, "constituents": cons, "stats": stats,
               "model_note": "Simplified educational market-cap-weighted model; not a replica of any official index."})
