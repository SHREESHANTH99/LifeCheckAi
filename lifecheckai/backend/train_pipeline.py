from __future__ import annotations

import json

try:
    from lifecheckai.backend.app.services.ml_service import train_model
except ModuleNotFoundError:
    from app.services.ml_service import train_model


if __name__ == "__main__":
    metrics = train_model(force=True)
    print(json.dumps(metrics, indent=2))
