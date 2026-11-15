"""
Reproducible Cloudburst ML Training & Evaluation Pipeline.

Key Properties:
1. Strict Chronological Train/Val/Test Split: Zero temporal lookahead or data leakage.
2. Comprehensive Scikit-Learn Baselines Comparison.
3. Imbalanced Metrics Evaluation: Precision, Recall, F1, and PR-AUC (Average Precision).
4. Threshold Optimization for High-Recall Disaster Early Warning.
5. Persistent Model Artifacts and Markdown Evaluation Summary.
"""

import argparse
import json
import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

from ml.dataset import load_dataset
from ml.features import FEATURE_COLUMNS, prepare_feature_matrix
from ml.models import get_baseline_models


def split_by_time(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15):
    """
    Splits the dataset strictly chronologically.
    Guarantees max(train_time) < min(val_time) < min(test_time).
    """
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["dt"] = pd.to_datetime(df["timestamp"])
    else:
        df["dt"] = df["timestamp"]

    unique_times = np.sort(df["dt"].unique())
    n_times = len(unique_times)

    train_end_idx = int(n_times * train_ratio)
    val_end_idx = int(n_times * (train_ratio + val_ratio))

    train_cutoff = unique_times[train_end_idx]
    val_cutoff = unique_times[val_end_idx]

    train_mask = df["dt"] < train_cutoff
    val_mask = (df["dt"] >= train_cutoff) & (df["dt"] < val_cutoff)
    test_mask = df["dt"] >= val_cutoff

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()
    test_df = df[test_mask].copy()

    print(f"\n[Temporal Split Diagnostics]")
    print(f"  Total Observations: {len(df):,}")
    print(f"  Train: {len(train_df):,} rows | {train_df['dt'].min()} -> {train_df['dt'].max()}")
    print(f"  Val:   {len(val_df):,} rows | {val_df['dt'].min()} -> {val_df['dt'].max()}")
    print(f"  Test:  {len(test_df):,} rows | {test_df['dt'].min()} -> {test_df['dt'].max()}")

    # Assert strict temporal ordering to mathematically prove no leakage
    assert train_df["dt"].max() < val_df["dt"].min(), "Temporal Leakage detected between Train and Val!"
    assert val_df["dt"].max() < test_df["dt"].min(), "Temporal Leakage detected between Val and Test!"

    return train_df, val_df, test_df


def evaluate_predictions(y_true: np.ndarray, y_proba: np.ndarray, threshold: float = 0.5) -> dict:
    """
    Computes rigorous classification performance metrics, emphasizing PR-AUC and F1.
    """
    y_pred = (y_proba >= threshold).astype(int)

    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    # Rare class checks
    if len(np.unique(y_true)) > 1:
        pr_auc = float(average_precision_score(y_true, y_proba))
        roc_auc = float(roc_auc_score(y_true, y_proba))
    else:
        pr_auc = 0.0
        roc_auc = 0.5

    brier = float(brier_score_loss(y_true, y_proba))
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    false_alarm_rate = float(fp / (fp + tp)) if (fp + tp) > 0 else 0.0

    return {
        "threshold": round(float(threshold), 3),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "brier_score": round(brier, 4),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "specificity": round(specificity, 4),
        "false_alarm_rate": round(false_alarm_rate, 4),
    }


def find_optimal_threshold(y_true: np.ndarray, y_proba: np.ndarray, min_recall: float = 0.80):
    """
    Finds:
    1. Threshold that maximizes F1 score.
    2. Threshold that satisfies safety-critical minimum recall constraint.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_proba)
    # Thresholds has len = len(precisions) - 1
    f1s = np.zeros(len(thresholds))
    for i in range(len(thresholds)):
        p = precisions[i]
        r = recalls[i]
        f1s[i] = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0

    best_f1_idx = int(np.argmax(f1s)) if len(f1s) > 0 else 0
    best_f1_threshold = float(thresholds[best_f1_idx]) if len(thresholds) > 0 else 0.5

    # High-recall operating point
    qualifying_indices = np.where(recalls[:-1] >= min_recall)[0]
    if len(qualifying_indices) > 0:
        # Pick the one with the highest precision among those meeting recall constraint
        best_safety_idx = qualifying_indices[np.argmax(precisions[qualifying_indices])]
        safety_threshold = float(thresholds[best_safety_idx])
    else:
        safety_threshold = best_f1_threshold

    return best_f1_threshold, safety_threshold


def run_training_pipeline(
    dataset_path: str = "ml/data/himalayan_cloudburst_dataset.csv",
    artifacts_dir: str = "ml/artifacts",
    random_seed: int = 42,
):
    """
    Executes the complete reproducible end-to-end training and evaluation pipeline.
    """
    os.makedirs(artifacts_dir, exist_ok=True)
    print(f"\n{'='*70}")
    print(" Himalayan Cloudburst ML Training Pipeline (Reproducible & Causal)")
    print(f"{'='*70}")

    # 1. Dataset loading and feature preparation
    df = load_dataset(dataset_path, auto_generate=True)
    train_df, val_df, test_df = split_by_time(df, train_ratio=0.70, val_ratio=0.15)

    X_train, y_train, _, _ = prepare_feature_matrix(train_df)
    X_val, y_val, _, _ = prepare_feature_matrix(val_df)
    X_test, y_test, test_meta, feature_names = prepare_feature_matrix(test_df)

    print(f"\n[Class Balance Across Splits]")
    print(f"  Train: {np.sum(y_train)} / {len(y_train)} ({np.mean(y_train)*100:.2f}% positive)")
    print(f"  Val:   {np.sum(y_val)} / {len(y_val)} ({np.mean(y_val)*100:.2f}% positive)")
    print(f"  Test:  {np.sum(y_test)} / {len(y_test)} ({np.mean(y_test)*100:.2f}% positive)")

    # 2. Model definitions
    models = get_baseline_models(random_state=random_seed)
    results = {}
    best_model_name = None
    best_val_prauc = -1.0
    fitted_models = {}

    print(f"\n[Training Baseline Models...]")
    for name, model in models.items():
        print(f"  -> Fitting: {name}...")
        model.fit(X_train, y_train)
        fitted_models[name] = model

        # Val evaluation for model selection
        val_proba = model.predict_proba(X_val)[:, 1]
        val_metrics = evaluate_predictions(y_val, val_proba, threshold=0.5)

        # Unseen Chronological Test evaluation
        test_proba = model.predict_proba(X_test)[:, 1]
        test_metrics_default = evaluate_predictions(y_test, test_proba, threshold=0.5)

        # Tuned operating threshold
        best_f1_th, safety_th = find_optimal_threshold(y_val, val_proba, min_recall=0.80)
        test_metrics_optimized = evaluate_predictions(y_test, test_proba, threshold=best_f1_th)
        test_metrics_safety = evaluate_predictions(y_test, test_proba, threshold=safety_th)

        results[name] = {
            "validation": val_metrics,
            "test_default_0.5": test_metrics_default,
            "test_f1_optimal": test_metrics_optimized,
            "test_safety_high_recall": test_metrics_safety,
            "optimal_threshold_f1": round(best_f1_th, 3),
            "optimal_threshold_safety": round(safety_th, 3),
        }

        print(f"     [Val]  PR-AUC: {val_metrics['pr_auc']:.4f} | F1: {val_metrics['f1_score']:.4f}")
        print(f"     [Test] PR-AUC: {test_metrics_default['pr_auc']:.4f} | F1: {test_metrics_default['f1_score']:.4f} | Precision: {test_metrics_default['precision']:.4f} | Recall: {test_metrics_default['recall']:.4f}")

        # Select champion ML model (prefer ML classifier over heuristic rule on tie)
        is_ml_better = (
            val_metrics["pr_auc"] > best_val_prauc
            or (val_metrics["pr_auc"] == best_val_prauc and name != "Heuristic Rule Baseline" and best_model_name == "Heuristic Rule Baseline")
            or (val_metrics["pr_auc"] == best_val_prauc and name == "Random Forest (Balanced)")
        )
        if is_ml_better:
            best_val_prauc = val_metrics["pr_auc"]
            best_model_name = name

    print(f"\n[Model Selection] Best Model based on Validation PR-AUC: {best_model_name} (PR-AUC={best_val_prauc:.4f})")
    best_model = fitted_models[best_model_name]

    # 3. Save feature names and model artifacts
    feature_path = os.path.join(artifacts_dir, "feature_names.json")
    with open(feature_path, "w") as f:
        json.dump(feature_names, f, indent=2)

    model_path = os.path.join(artifacts_dir, "cloudburst_model.joblib")
    joblib.dump({
        "model_name": best_model_name,
        "model": best_model,
        "feature_names": feature_names,
        "optimal_threshold": results[best_model_name]["optimal_threshold_f1"],
        "safety_threshold": results[best_model_name]["optimal_threshold_safety"],
    }, model_path)
    print(f"  -> Model artifact saved to {model_path}")

    # 4. Save metrics JSON
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump({
            "best_model": best_model_name,
            "train_size": len(train_df),
            "val_size": len(val_df),
            "test_size": len(test_df),
            "comparison": results
        }, f, indent=2)
    print(f"  -> Metrics saved to {metrics_path}")

    # 5. Extract Feature Importances (from champion or Random Forest)
    feature_importances = {}
    rf_candidate = best_model if (hasattr(best_model, "named_steps") and hasattr(best_model.named_steps.get("clf"), "feature_importances_")) else fitted_models.get("Random Forest (Balanced)")
    if rf_candidate and hasattr(rf_candidate, "named_steps") and hasattr(rf_candidate.named_steps["clf"], "feature_importances_"):
        fi = rf_candidate.named_steps["clf"].feature_importances_
        sorted_fi = sorted(zip(feature_names, fi), key=lambda x: x[1], reverse=True)
        feature_importances = {name: round(float(val), 4) for name, val in sorted_fi}
    elif hasattr(best_model, "feature_importances_"):
        fi = best_model.feature_importances_
        sorted_fi = sorted(zip(feature_names, fi), key=lambda x: x[1], reverse=True)
        feature_importances = {name: round(float(val), 4) for name, val in sorted_fi}

    if feature_importances:
        with open(os.path.join(artifacts_dir, "feature_importances.json"), "w") as f:
            json.dump(feature_importances, f, indent=2)

    # 6. Generate Markdown Evaluation Report
    report_path = os.path.join(artifacts_dir, "evaluation_report.md")
    generate_markdown_report(report_path, results, best_model_name, feature_importances, len(train_df), len(test_df))
    print(f"  -> Evaluation report written to {report_path}")

    return results, best_model_name


def generate_markdown_report(report_path: str, results: dict, best_model: str, feature_importances: dict, train_len: int, test_len: int):
    """
    Renders an audit-ready evaluation report markdown table.
    """
    md = []
    md.append("# Himalayan Cloudburst ML Training & Evaluation Report\n")
    md.append(f"**Split Protocol**: Strict Chronological Time Separation (Train $N={train_len:,}$, Test $N={test_len:,}$)\n")
    md.append(f"**Selected Champion Model**: `{best_model}`\n\n")

    md.append("## 1. Test Set Baseline Performance Comparison (Threshold = 0.50)\n")
    md.append("| Model | Precision | Recall | F1 Score | PR-AUC | ROC-AUC | Brier Score |")
    md.append("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |")

    for name, data in results.items():
        m = data["test_default_0.5"]
        md.append(f"| **{name}** | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | **{m['pr_auc']:.4f}** | {m['roc_auc']:.4f} | {m['brier_score']:.4f} |")

    md.append("\n## 2. Decision Threshold Calibration for Champion Model\n")
    champ = results[best_model]
    md.append(f"- **Balanced Operating Point (F1-Optimal, Threshold={champ['optimal_threshold_f1']})**:")
    opt = champ["test_f1_optimal"]
    md.append(f"  - Precision: `{opt['precision']:.4f}`, Recall: `{opt['recall']:.4f}`, F1: `{opt['f1_score']:.4f}`")
    md.append(f"  - Confusion Matrix: TP=`{opt['true_positives']}`, FP=`{opt['false_positives']}`, TN=`{opt['true_negatives']}`, FN=`{opt['false_negatives']}`")

    md.append(f"- **Safety-Critical Alert Point (Recall $\\ge 0.80$, Threshold={champ['optimal_threshold_safety']})**:")
    safe = champ["test_safety_high_recall"]
    md.append(f"  - Precision: `{safe['precision']:.4f}`, Recall: `{safe['recall']:.4f}`, F1: `{safe['f1_score']:.4f}`")
    md.append(f"  - Confusion Matrix: TP=`{safe['true_positives']}`, FP=`{safe['false_positives']}`, TN=`{safe['true_negatives']}`, FN=`{safe['false_negatives']}`")

    if feature_importances:
        md.append("\n## 3. Top Engineered Feature Importances\n")
        md.append("| Feature | Importance Score | Domain Significance |")
        md.append("| :--- | :---: | :--- |")
        top_10 = list(feature_importances.items())[:10]
        domain_notes = {
            "precipitation": "Direct instantaneous rainfall intensity (mm/h)",
            "rainfall_accum_3h": "Short-term convective moisture loading",
            "rainfall_accum_6h": "Mid-range hydrologic saturation accumulation",
            "pressure_change_3h": "Mesoscale barometric depression signaling severe convection",
            "rainfall_intensity_accel": "First-derivative rainfall acceleration (ΔR/Δt)",
            "orographic_lift_index": "Topographic slope wind-moisture convergence",
            "moisture_flux_index": "Advective moisture transport rate",
            "dew_point_depression": "Cloud-base saturation proximity (T - Td)",
            "cape": "Atmospheric convective available potential energy",
            "elevation_m": "Hypsometric mountain height",
        }
        for feat, score in top_10:
            note = domain_notes.get(feat, "Engineered thermodynamic / kinematic parameter")
            md.append(f"| `{feat}` | `{score:.4f}` | {note} |")

    with open(report_path, "w") as f:
        f.write("\n".join(md))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Cloudburst ML Training Pipeline")
    parser.add_argument("--dataset", type=str, default="ml/data/himalayan_cloudburst_dataset.csv")
    parser.add_argument("--artifacts", type=str, default="ml/artifacts")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    run_training_pipeline(dataset_path=args.dataset, artifacts_dir=args.artifacts, random_seed=args.seed)
