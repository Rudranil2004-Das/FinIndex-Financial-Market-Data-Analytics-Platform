"""Small shared helpers: JSON-safe conversion, error type, pagination."""
import math
from datetime import date, datetime

import numpy as np
import pandas as pd
from flask import jsonify


class ApiError(Exception):
    """Raise inside a route to return a clean JSON error."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def clean(value):
    """Make pandas/numpy values JSON-safe (NaN -> None, numpy -> python)."""
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if (math.isnan(value) or math.isinf(value)) else float(value)
    if value is pd.NaT:
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.strftime("%Y-%m-%d")
    return value


def ok(payload, status: int = 200):
    return jsonify(clean(payload)), status


def df_records(df: pd.DataFrame) -> list:
    """DataFrame -> list of JSON-safe dicts."""
    if df is None or df.empty:
        return []
    return [clean(r) for r in df.to_dict(orient="records")]


def paginate(items: list, page: int, per_page: int) -> dict:
    page = max(page, 1)
    per_page = min(max(per_page, 1), 200)
    total = len(items)
    start = (page - 1) * per_page
    return {
        "items": items[start:start + per_page],
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": max(math.ceil(total / per_page), 1),
    }
