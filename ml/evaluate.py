"""
Standalone Evaluation Module for Himalayan Cloudburst ML.

Computes precision, recall, F1, PR-AUC, ROC-AUC, Brier score, and Confusion Matrix
on any evaluation dataset using a serialized model bundle.
"""

import argparse
import json
import os
import joblib
import pandas as pd
from ml.features import prepare_feature_matrix
from ml.train import evaluate_predictions


def evaluate_dataset(
    dataset_path: str,
    model_path: str = "ml/artifacts/cloudburst_model.joblib",
    threshold: float = None,
    output_metrics_path: str = None
):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    
    bundle = joblib.load(model_path)
    model = bundle["model"]
    feature_names = bundle["feature_names"]
    default_th = threshold if threshold is not None else bundle.get("optimal_threshold", 0.5)

    df = pd.read_csv(dataset_path)
    X, y, meta, _ = prepare_feature_matrix(df)

    # Ensure feature alignment
    for col in feature_names:
        if col not in X.columns:
            X[col] = 0.0
    X = X[feature_names]

    y_proba = model.predict_proba(X)[:, 1]
    metrics = evaluate_predictions(y, y_proba, threshold=default_th)

    print(f"\n{'='*60}")
    print(f" Evaluation Results on: {os.path.basename(dataset_path)}")
    print(f" Model: {bundle.get('model_name', 'Unknown')}")
    print(f" Operating Threshold: {metrics['threshold']}")
    print(f"{'='*60}")
    print(f"  Precision:   {metrics['precision']:.4f}")
    print(f"  Recall:      {metrics['recall']:.4f}")
    print(f"  F1 Score:    {metrics['f1_score']:.4f}")
    print(f"  PR-AUC:      {metrics['pr_auc']:.4f}")
    print(f"  ROC-AUC:     {metrics['roc_auc']:.4f}")
    print(f"  Brier Score: {metrics['brier_score']:.4f}")
    print(f"  Confusion Matrix: TP={metrics['true_positives']} | FP={metrics['false_positives']} | TN={metrics['true_negatives']} | FN={metrics['false_negatives']}")
    print(f"{'='*60}\n")

    if output_metrics_path:
        with open(output_metrics_path, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"Saved evaluation metrics to {output_metrics_path}")

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Cloudburst ML Model")
    parser.add_argument("--dataset", type=str, default="ml/data/himalayan_cloudburst_dataset.csv")
    parser.add_argument("--model", type=str, default="ml/artifacts/cloudburst_model.joblib")
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    evaluate_dataset(args.dataset, args.model, args.threshold, args.output)
