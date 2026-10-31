"""FinIndex Flask application entry point.  Run:  python app.py"""
import os

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


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024        # 10 MB uploads
    init_db()

    for bp in (system_bp, dashboard_bp, stock_bp, import_bp, validation_bp, analytics_bp, index_bp):
        app.register_blueprint(bp)

    @app.after_request
    def add_headers(resp):
        # Open CORS for local development (Vite also proxies /api, so this is a fallback)
        resp.headers["Access-Control-Allow-Origin"] = os.environ.get("FININDEX_CORS_ORIGIN", "*")
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
