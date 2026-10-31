import pandas as pd
from flask import Blueprint, request

import database.db_operations as ops
from modules.data_loader import load_csv
from utils.helpers import ApiError, ok
from utils.logger import get_logger

bp = Blueprint("imports", __name__, url_prefix="/api/import")
log = get_logger()


@bp.post("")
def upload():
    file = request.files.get("file")
    if file is None or not file.filename:
        raise ApiError("Choose a CSV file to upload.")
    if not file.filename.lower().endswith(".csv"):
        raise ApiError("Only .csv files are supported.")
    try:
        df = load_csv(file.stream)
    except pd.errors.EmptyDataError:
        raise ApiError("The file is empty.")
    except (pd.errors.ParserError, UnicodeDecodeError):
        raise ApiError("The file could not be read as CSV. Check the delimiter and encoding (UTF-8).")
    if df.empty:
        raise ApiError("The file has a header but no data rows.")
    try:
        result = ops.run_import(file.filename, df)
    except ValueError as exc:               # missing required columns
        raise ApiError(str(exc))
    log.info("Import %s: %s valid / %s invalid", file.filename, result["valid_records"], result["invalid_records"])
    return ok(result, 201)


@bp.get("/history")
def history():
    return ok(ops.list_batches(100))


@bp.get("/<int:batch_id>")
def batch_detail(batch_id):
    batch = ops.get_batch(batch_id)
    if not batch:
        raise ApiError("Import batch not found.", 404)
    return ok({"batch": batch, "errors": ops.list_errors(batch_id, limit=500)})
