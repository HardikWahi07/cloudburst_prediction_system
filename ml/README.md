# Reproducible Himalayan Cloudburst ML Training Pipeline

A machine learning pipeline for Himalayan cloudburst forecasting using scikit-learn, physical feature engineering, and strictly causal temporal evaluation.

## Key Features

1. **Dataset Preparation & Historical Grounding**:
   - Ingests multi-year hourly meteorological datasets (2021–2025) across 12 high-altitude Himalayan monitoring stations (Kedarnath, Chamoli, Dharamshala, Leh, Uttarkashi, Kullu, Gangtok, Shimla, Joshimath, Pithoragarh, etc.).
   - Calibrated with documented Himalayan cloudburst episodes (e.g. 2021 Chamoli & Dharamshala surges, 2022 Amarnath, 2023 Kullu/Mandi, 2024 Uttarkashi, 2025 pre-monsoon deluges).

2. **Causal Feature Engineering (Zero Temporal Leakage)**:
   - Rolling precipitation accumulations: 3h, 6h, 12h, 24h sliding sums computed strictly within station groups.
   - Intensity dynamics: First derivative acceleration ($\Delta R / \Delta t$).
   - Convective barometric drop: 1h, 3h, and 6h pressure trends ($\Delta P / \Delta t$).
   - Thermodynamics & kinematics: Dew point depression ($T - T_d$), moisture flux index ($wind \times RH$), orographic lift index, and cyclical time encodings ($\sin / \cos$ of hour and day of year).

3. **Strict Chronological Train / Val / Test Separation**:
   - **Train Set**: Earliest 70% chronological window ($N = 93,732$ rows, 2021-06-15 to 2024-07-31).
   - **Validation Set**: Subsequent 15% window ($N = 20,100$ rows, 2024-07-31 to 2025-07-08).
   - **Test Set**: Final unseen 15% future window ($N = 20,088$ rows, 2025-07-08 to 2025-09-15).
   - Strictly verifies `max(train_time) < min(val_time) < min(test_time)`. No random split leakage.

4. **Scikit-Learn Baseline Models**:
   - Domain Heuristic Rule Baseline
   - Logistic Regression (Balanced, L2 regularized)
   - Random Forest Classifier (Balanced weights, 100 estimators, max depth 10)
   - HistGradientBoostingClassifier (Non-linear gradient boosting)
   - Extra Trees Classifier (Balanced)

5. **Rare-Class Evaluation Metrics**:
   - **PR-AUC (Average Precision score)**: Primary metric for extreme class imbalance ($< 0.1\%$ prevalence).
   - **Precision, Recall, and F1-Score**: Evaluated across default ($0.50$), F1-optimal, and safety-critical ($\text{Recall} \ge 0.80$) operating thresholds.
   - **Brier Score, ROC-AUC, and Confusion Matrix**: Documented in `ml/artifacts/metrics.json` and `ml/artifacts/evaluation_report.md`.

## Reproduction Commands

### Run Full End-to-End Training
```bash
python3 -m ml.train
```

### Run Standalone Evaluation on any Dataset
```bash
python3 -m ml.evaluate --dataset ml/data/himalayan_cloudburst_dataset.csv
```

### Run Real-time Inference
```python
from ml.predict import CloudburstPredictor

predictor = CloudburstPredictor()
result = predictor.predict_observation({
    "precipitation": 105.0,
    "relative_humidity_2m": 96.0,
    "surface_pressure": 650.0,
    "pressure_change_3h": -6.0,
    "wind_speed_10m": 25.0,
    "wind_gusts_10m": 70.0,
    "elevation_m": 3584,
})
print(result)
```
