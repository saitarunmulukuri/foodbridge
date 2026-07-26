"""Application entry point for running the FoodBridge Flask backend."""

import os
import sys

# TODO: Remove sys.path.insert() when executing application via WSGI server or module mode (python -m backend.app)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug_mode = app.config.get("DEBUG", False)
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
