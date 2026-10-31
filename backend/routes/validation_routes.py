from flask import Blueprint, request

import database.db_operations as ops
from modules.data_validator import validate_dataframe
from utils.helpers import ok

bp = Blueprint("validation", __name__, url_prefix="/api/validation")


@bp.post("/run")
def run():
    """Re-validate everything currently stored in the database (a data-quality audit)."""
    prices = ops.get_prices_df()
    if prices.empty:
        return ok({"stats": None, "issues": [], "message": "No stored price records to validate."})
    _, errors, stats = validate_dataframe(prices)
    return ok({"stats": stats, "issues": errors[:100]})


@bp.get("/summary")
def summary():
    return ok(ops.validation_summary())


@bp.get("/errors")
def errors():
    batch_id = request.args.get("batch_id", type=int)
    limit = min(request.args.get("limit", 200, type=int), 1000)
    offset = request.args.get("offset", 0, type=int)
    return ok(ops.list_errors(batch_id, limit, offset))
