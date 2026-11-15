"""
Real-time Inference Module for Himalayan Cloudburst ML.

Loads trained model artifact and evaluates real-time telemetry observations.
"""

import os
import joblib
import numpy as np
import pandas as pd
from ml.features import extract_features, FEATURE_COLUMNS


class CloudburstPredictor:
    def __init__(self, model_path: str = "ml/artifacts/cloudburst_model.joblib"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found at {model_path}. Run ml.train first.")
        
        bundle = joblib.load(model_path)
        self.model_name = bundle["model_name"]
        self.model = bundle["model"]
        self.feature_names = bundle["feature_names"]
        self.optimal_threshold = bundle.get("optimal_threshold", 0.5)
        self.safety_threshold = bundle.get("safety_threshold", 0.3)

    def predict_observation(self, observation: dict) -> dict:
        """
        Runs inference on a single meteorological observation dict or dataframe row.
        """
        df = pd.DataFrame([observation])
        df_feat = extract_features(df)
        
        # Ensure all columns present
        for col in self.feature_names:
            if col not in df_feat.columns:
                df_feat[col] = 0.0

        X = df_feat[self.feature_names]
        proba = float(self.model.predict_proba(X)[0, 1])

        risk_level = "MINIMAL"
        if proba >= 0.70 or proba >= self.optimal_threshold:
            risk_level = "SEVERE"
        elif proba >= 0.40:
            risk_level = "HIGH"
        elif proba >= 0.20:
            risk_level = "MODERATE"
        elif proba >= 0.05:
            risk_level = "LOW"

        decision_threshold = min(0.50, self.optimal_threshold)
        safety_alert_threshold = min(0.30, self.safety_threshold)

        return {
            "cloudburst_probability": round(proba, 4),
            "cloudburst_predicted": bool(proba >= decision_threshold),
            "safety_alert": bool(proba >= safety_alert_threshold),
            "risk_level": risk_level,
            "model_used": self.model_name,
        }

    def predict_timeseries(self, df_timeseries: pd.DataFrame) -> pd.DataFrame:
        """
        Runs batch prediction over an hourly sequence for a station.
        """
        df_feat = extract_features(df_timeseries)
        for col in self.feature_names:
            if col not in df_feat.columns:
                df_feat[col] = 0.0

        X = df_feat[self.feature_names]
        probas = self.model.predict_proba(X)[:, 1]

        res = df_timeseries.copy()
        res["cloudburst_probability"] = np.round(probas, 4)
        res["cloudburst_predicted"] = (probas >= self.optimal_threshold).astype(int)
        res["safety_alert"] = (probas >= self.safety_threshold).astype(int)
        return res
