"""Basic application logging (console + rotating file)."""
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parents[2] / "output"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def get_logger(name: str = "finindex") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:  # already configured
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(name)s | %(message)s")
    console = logging.StreamHandler()
    console.setFormatter(fmt)
    logger.addHandler(console)
    file_handler = RotatingFileHandler(LOG_DIR / "finindex.log", maxBytes=1_000_000, backupCount=3)
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)
    return logger
