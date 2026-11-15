"""
Scikit-Learn Baseline Models for Cloudburst Classification.

Provides standard estimators encapsulated in scikit-learn Pipelines:
1. Domain Heuristic / Rule-based Baseline
2. Logistic Regression (L2 Regularized, Balanced)
3. Random Forest Classifier (Balanced Subsample, Ensembles)
4. HistGradientBoostingClassifier (Non-linear Tree Boosting)
5. Extra Trees Classifier
"""

import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class MeteorologicalRuleBaseline(BaseEstimator, ClassifierMixin):
    """
    Standard Rule-Based Meteorological Heuristic Baseline.
    Predicts cloudburst when precipitation rate and convective saturation
    exceed severe atmospheric thresholds.
    """
    def __init__(self, rain_threshold=50.0, rh_threshold=88.0, pressure_drop_threshold=-3.0):
        self.rain_threshold = rain_threshold
        self.rh_threshold = rh_threshold
        self.pressure_drop_threshold = pressure_drop_threshold
        self.classes_ = np.array([0, 1])

    def fit(self, X, y=None):
        return self

    def predict(self, X):
        probs = self.predict_proba(X)
        return (probs[:, 1] >= 0.5).astype(int)

    def predict_proba(self, X):
        if hasattr(X, "columns"):
            rain = X["precipitation"].values if "precipitation" in X.columns else X.iloc[:, 4].values
            rh = X["relative_humidity_2m"].values if "relative_humidity_2m" in X.columns else X.iloc[:, 1].values
            p_drop = X["pressure_change_3h"].values if "pressure_change_3h" in X.columns else np.zeros(len(X))
        else:
            # Assumes standard feature order: precip index 4, rh index 1
            rain = X[:, 4]
            rh = X[:, 1]
            p_drop = X[:, 17] if X.shape[1] > 17 else np.zeros(len(X))

        # Heuristic confidence score
        score = np.zeros(len(X), dtype=float)
        direct_surge = (rain >= self.rain_threshold)
        convective_buildup = (rain >= 30.0) & (rh >= self.rh_threshold) & (p_drop <= self.pressure_drop_threshold)
        
        score[convective_buildup] = 0.65
        score[direct_surge] = 0.95
        score = np.clip(score, 0.001, 0.999)

        probs = np.column_stack([1.0 - score, score])
        return probs


def get_baseline_models(random_state: int = 42) -> dict:
    """
    Instantiates a dictionary of scikit-learn baseline pipelines for evaluation.
    """
    models = {
        "Heuristic Rule Baseline": MeteorologicalRuleBaseline(
            rain_threshold=50.0,
            rh_threshold=88.0,
            pressure_drop_threshold=-3.0
        ),
        "Logistic Regression (Balanced)": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                C=0.1,
                class_weight="balanced",
                solver="lbfgs",
                max_iter=1000,
                random_state=random_state
            ))
        ]),
        "Random Forest (Balanced)": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=6,
                min_samples_leaf=3,
                class_weight="balanced",
                random_state=random_state,
                n_jobs=-1
            ))
        ]),
        "HistGradientBoosting": HistGradientBoostingClassifier(
            loss="log_loss",
            max_iter=120,
            max_depth=7,
            min_samples_leaf=15,
            class_weight="balanced",
            learning_rate=0.08,
            random_state=random_state
        ),
        "Extra Trees (Balanced)": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", ExtraTreesClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_leaf=3,
                class_weight="balanced",
                random_state=random_state,
                n_jobs=-1
            ))
        ]),
    }

    return models
