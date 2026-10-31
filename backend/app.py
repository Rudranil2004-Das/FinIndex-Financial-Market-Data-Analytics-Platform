"""FinIndex Flask application entry point.  Run:  python app.py"""
import os
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from database.connection import init_db
from routes.analytics_routes import bp as analytics_bp
from routes.dashboard_routes import bp as dashboard_bp
from routes.import_routes import bp as import_bp
from routes.index_routes import bp as index_bp
from routes.stock_routes import bp as stock_bp
from routes.system_routes import bp as system_bp
from routes.validation_routes import bp as validation_bp
from utils.helpers import ApiError
from utils.logger import get_logger

log = get_logger()


def seed_if_empty() -> None:
    """On hosts where the SQLite file resets (e.g. Render free), reload the sample data."""
    if os.environ.get("AUTO_LOAD_SAMPLE") != "true":
        return
    from database.db_operations import counts, run_import
    from modules.data_loader import load_csv

    if counts()["stocks"] == 0:
        csv = Path(__file__).resolve().parents[1] / "data" / "sample" / "sample_stocks.csv"
        if csv.exists():
            run_import(csv.name, load_csv(csv))
            log.info("Sample data loaded")
        else:
            log.warning("AUTO_LOAD_SAMPLE is on but %s was not found", csv)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024        # 10 MB uploads
    init_db()
    seed_if_empty()

    for bp in (system_bp, dashboard_bp, stock_bp, import_bp, validation_bp, analytics_bp, index_bp):
        app.register_blueprint(bp)

    # FININDEX_CORS_ORIGIN: "*" or a comma-separated list of origins (no trailing slash needed)
    allowed = [o.strip().rstrip("/") for o in os.environ.get("FININDEX_CORS_ORIGIN", "*").split(",") if o.strip()]
    allow_vercel = os.environ.get("ALLOW_VERCEL_PREVIEWS", "true") == "true"

    @app.get("/")
    def root():
        return jsonify({"service": "FinIndex API", "status": "running", "health": "/api/health"})

    @app.after_request
    def add_headers(resp):
        origin = request.headers.get("Origin", "").rstrip("/")
        if "*" in allowed:
            resp.headers["Access-Control-Allow-Origin"] = "*"
        elif origin in allowed or (allow_vercel and origin.startswith("https://") and origin.endswith(".vercel.app")):
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        if request.path.startswith("/api"):
            log.info("%s %s -> %s", request.method, request.full_path.rstrip("?"), resp.status_code)
        return resp

    @app.errorhandler(ApiError)
    def api_error(exc):
        return jsonify({"error": exc.message}), exc.status

    @app.errorhandler(HTTPException)
    def http_error(exc):
        message = "File is too large (limit 10 MB)." if exc.code == 413 else exc.description
        return jsonify({"error": message}), exc.code

    @app.errorhandler(Exception)
    def unexpected(exc):
        log.exception("Unhandled error")
        return jsonify({"error": "Unexpected server error. Check the backend log."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=True)
