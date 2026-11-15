# Himalayan Cloudburst ML Training & Evaluation Report

**Split Protocol**: Strict Chronological Time Separation (Train $N=93,732$, Test $N=20,088$)

**Selected Champion Model**: `Random Forest (Balanced)`


## 1. Test Set Baseline Performance Comparison (Threshold = 0.50)

| Model | Precision | Recall | F1 Score | PR-AUC | ROC-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Heuristic Rule Baseline** | 1.0000 | 1.0000 | 1.0000 | **1.0000** | 1.0000 | 0.0000 |
| **Logistic Regression (Balanced)** | 1.0000 | 1.0000 | 1.0000 | **1.0000** | 1.0000 | 0.0000 |
| **Random Forest (Balanced)** | 1.0000 | 1.0000 | 1.0000 | **1.0000** | 1.0000 | 0.0000 |
| **HistGradientBoosting** | 1.0000 | 1.0000 | 1.0000 | **1.0000** | 1.0000 | 0.0000 |
| **Extra Trees (Balanced)** | 1.0000 | 1.0000 | 1.0000 | **1.0000** | 1.0000 | 0.0000 |

## 2. Decision Threshold Calibration for Champion Model

- **Balanced Operating Point (F1-Optimal, Threshold=0.87)**:
  - Precision: `1.0000`, Recall: `1.0000`, F1: `1.0000`
  - Confusion Matrix: TP=`3`, FP=`0`, TN=`20085`, FN=`0`
- **Safety-Critical Alert Point (Recall $\ge 0.80$, Threshold=0.87)**:
  - Precision: `1.0000`, Recall: `1.0000`, F1: `1.0000`
  - Confusion Matrix: TP=`3`, FP=`0`, TN=`20085`, FN=`0`

## 3. Top Engineered Feature Importances

| Feature | Importance Score | Domain Significance |
| :--- | :---: | :--- |
| `wind_gusts_10m` | `0.1570` | Engineered thermodynamic / kinematic parameter |
| `pressure_change_6h` | `0.1401` | Engineered thermodynamic / kinematic parameter |
| `precipitation` | `0.1217` | Direct instantaneous rainfall intensity (mm/h) |
| `rainfall_accum_6h` | `0.1106` | Mid-range hydrologic saturation accumulation |
| `rainfall_accum_3h` | `0.1074` | Short-term convective moisture loading |
| `rainfall_mean_3h` | `0.1067` | Engineered thermodynamic / kinematic parameter |
| `gust_factor` | `0.1000` | Engineered thermodynamic / kinematic parameter |
| `rainfall_accum_12h` | `0.0522` | Engineered thermodynamic / kinematic parameter |
| `relative_humidity_2m` | `0.0301` | Engineered thermodynamic / kinematic parameter |
| `rainfall_accum_24h` | `0.0200` | Engineered thermodynamic / kinematic parameter |