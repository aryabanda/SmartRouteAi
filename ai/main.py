"""
Serves predictions from the trained Isolation Forest.

Run alongside the Node backend:
    uvicorn main:app --port 5001

Contract matches deviationClassifier.js's callAiService exactly, so the
Node side and mobile app need zero changes when this comes online or goes
offline - deviationClassifier.js falls back to its own rules if this
service is unreachable or hasn't been trained yet.
"""

import os
import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_PATH = "model/isolation_forest.joblib"

app = FastAPI()

model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None


class DeviationFeatures(BaseModel):
    distanceFromRoute: float
    speedKph: float
    headingChangeDeg: float
    timeOffRouteMs: float


@app.get("/health")
def health():
    return {"status": "ok", "modelLoaded": model is not None}


@app.post("/predict")
def predict(features: DeviationFeatures):
    if model is None:
        # No trained model yet - tell the caller plainly rather than guessing.
        # deviationClassifier.js treats any non-2xx or malformed response the
        # same as "AI service unavailable" and falls back to its own rules,
        # so this is a safe, honest response either way.
        return {
            "label": "suspicious",
            "confidence": 0.0,
            "reason": "Model not trained yet - run train.py first. Defaulting to caution.",
        }

    X = np.array([[
        features.distanceFromRoute,
        features.speedKph,
        features.headingChangeDeg,
        features.timeOffRouteMs,
    ]])

    raw_score = float(model.decision_function(X)[0])
    is_anomaly = model.predict(X)[0] == -1

    label = "suspicious" if is_anomaly else "intentional_reroute"
    # decision_function's raw score isn't a calibrated probability - this is
    # just a bounded heuristic so the number is meaningful to glance at, not
    # a statistically rigorous confidence value. Worth being upfront about
    # this in your report if you cite "confidence" from the model.
    confidence = min(1.0, max(0.0, abs(raw_score)))

    return {
        "label": label,
        "confidence": confidence,
        "reason": f"Isolation Forest model (decision score {raw_score:.3f})",
    }
