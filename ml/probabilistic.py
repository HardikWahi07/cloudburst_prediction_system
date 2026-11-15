"""
Probabilistic Rainfall-Risk Scoring & Calibration Module (Python).

Provides:
1. Platt scaling & Sigmoid Probability Calibration for scikit-learn models.
2. Risk categorization into Low, Moderate, High, and Critical.
3. Configurable threshold profiles (Balanced, Conservative, High Precision).
4. Epistemic Prediction Confidence and Data Freshness scoring.
"""

import math
from datetime import datetime
import numpy as np


THRESHOLD_PROFILES = {
    "balanced": {
        "name": "Balanced",
        "low": 0.15,
        "moderate": 0.45,
        "critical": 0.75,
        "description": "Balanced operating thresholds for standard disaster operations",
    },
    "conservative": {
        "name": "Conservative",
        "low": 0.10,
        "moderate": 0.35,
        "critical": 0.65,
        "description": "Safety-first lower thresholds prioritizing zero false negatives",
    },
    "high_precision": {
        "name": "High Precision",
        "low": 0.20,
        "moderate": 0.55,
        "critical": 0.85,
        "description": "Higher thresholds minimizing false alarm rate and panic",
    },
}


def calibrate_probability(raw_probability: float, temperature: float = 1.0, prior_shift: float = 0.0) -> float:
    """
    Applies Platt/temperature scaling to smooth and calibrate raw model probabilities.
    """
    p = np.clip(raw_probability, 1e-5, 1.0 - 1e-5)
    logit = np.log(p / (1.0 - p))
    calibrated_logit = (logit / temperature) + prior_shift
    calibrated_p = 1.0 / (1.0 + np.exp(-calibrated_logit))
    return float(np.round(calibrated_p, 4))


def categorize_risk(probability: float, thresholds: dict = None) -> dict:
    """
    Categorizes calibrated probability into Low, Moderate, High, or Critical.
    """
    th = thresholds or THRESHOLD_PROFILES["balanced"]
    low = th.get("low", 0.15)
    mod = th.get("moderate", 0.45)
    crit = th.get("critical", 0.75)

    p = float(probability)
    if p >= crit:
        category = "Critical"
        color = "#dc2626"
        directive = "Emergency Spillway Gate Deployment & Grid Substation Islanding"
    elif p >= mod:
        category = "High"
        color = "#ea580c"
        directive = "Penstock Headroom Maintenance & Upstream Silt Trap Clearance"
    elif p >= low:
        category = "Moderate"
        color = "#d97706"
        directive = "Enhanced Catchment Telemetry & Standby Sluice Operators"
    else:
        category = "Low"
        color = "#059669"
        directive = "Standard Grid Operations & Routine Meteorological Bulletin Logging"

    return {
        "category": category,
        "probability": p,
        "probability_percentage": round(p * 100, 1),
        "color": color,
        "directive": directive,
        "thresholds": {"low": low, "moderate": mod, "critical": crit},
    }


def estimate_confidence(probability: float, thresholds: dict = None, completeness: float = 1.0) -> dict:
    """
    Estimates prediction confidence based on margin from decision boundaries and sensor completeness.
    """
    th = thresholds or THRESHOLD_PROFILES["balanced"]
    low, mod, crit = th.get("low", 0.15), th.get("moderate", 0.45), th.get("critical", 0.75)

    p = float(probability)
    margin = min(abs(p - low), abs(p - mod), abs(p - crit))

    raw_conf = 60.0 + margin * 130.0
    if p <= 0.05 or p >= 0.85:
        raw_conf = max(raw_conf, 88.0 + abs(p - 0.5) * 22.0)

    adjusted = raw_conf * (0.60 + 0.40 * completeness)
    score = int(min(99, max(50, round(adjusted))))

    tier = "HIGH" if score >= 85 else "MEDIUM" if score >= 72 else "LOW"

    return {
        "confidence_score": score,
        "confidence_tier": tier,
        "margin_to_boundary": round(float(margin), 3),
    }


def assess_freshness(timestamp_str: str) -> dict:
    """
    Calculates age and freshness classification of telemetry data.
    """
    now = datetime.utcnow()
    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00")).replace(tzinfo=None)
        age_seconds = max(0, int((now - dt).total_seconds()))
    except Exception:
        age_seconds = 0

    age_minutes = age_seconds // 60
    if age_minutes <= 30:
        status = "LIVE"
    elif age_minutes <= 120:
        status = "RECENT"
    else:
        status = "STALE"

    return {
        "age_minutes": age_minutes,
        "age_seconds": age_seconds,
        "status": status,
        "is_real_time": status == "LIVE",
    }
