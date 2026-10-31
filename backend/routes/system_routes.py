import time

from flask import Blueprint

import database.db_operations as ops
from database.connection import DB_PATH
from utils.helpers import ok

bp = Blueprint("system", __name__, url_prefix="/api")
STARTED = time.time()


@bp.get("/health")
def health():
    try:
        c = ops.counts()
        db_ok = True
    except Exception:       # database unreachable
        c, db_ok = {}, False
    return ok({"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "error",
               "engine": "SQLite", "db_file": DB_PATH.name, "version": "1.0.0",
               "uptime_seconds": int(time.time() - STARTED), "counts": c})
