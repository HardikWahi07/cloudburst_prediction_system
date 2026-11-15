"""Cloudburst occurrence training. Requires independently verified three-hour labels.

Rainfall bins and ERA5 threshold exceedances are not accepted as event labels.
"""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import (average_precision_score, brier_score_loss,
                             classification_report, confusion_matrix, log_loss,
                             precision_recall_curve, roc_auc_score)
from features import FEATURES, BOUNDS

ROOT = Path(__file__).resolve().parent
TASK = 'verified_cloudburst_occurrence_next_3h'
SCHEMA_VERSION = 3
MIN_CLASS_EXAMPLES = 20
REQUIRED = ['station', 'time', 'cloudburst_next_3h', 'verification_source', 'event_group']


def load_labeled_examples(weather_path, labels_path):
    weather = pd.read_csv(weather_path)
    labels = pd.read_csv(labels_path)
    if set(REQUIRED) - set(labels):
        raise ValueError(f'Labels must include {REQUIRED}')
    if labels.empty or labels[REQUIRED].isna().any().any():
        raise ValueError('Labels and verification fields must be nonempty')
    for key in ['verification_source', 'event_group', 'station']:
        if labels[key].astype(str).str.strip().eq('').any():
            raise ValueError(f'Empty {key}')
    if not labels.cloudburst_next_3h.isin([0, 1]).all():
        raise ValueError('Cloudburst labels must be 0 or 1; unknown windows must be omitted')
    # Weather and labels must share explicit timestamps. Reject timezone ambiguity.
    for frame in (weather, labels):
        frame['time'] = pd.to_datetime(frame.time, utc=True, errors='raise')
        if frame.duplicated(['station', 'time']).any():
            raise ValueError('Duplicate station/timestamp records')
    rows = labels.merge(weather, on=['station', 'time'], how='left', validate='one_to_one', indicator=True)
    if not rows['_merge'].eq('both').all():
        raise ValueError('Some labeled windows have no matching weather observations')
    for name, (low, high) in zip(FEATURES, BOUNDS):
        if not pd.to_numeric(rows[name], errors='coerce').between(low, high).all():
            raise ValueError(f'Missing/invalid training feature: {name}')
    rows['target_end'] = rows.time + pd.Timedelta(hours=3)
    return rows.sort_values('time')


def split_examples(rows):
    # Fixed chronological splits prevent retrospective event windows entering training.
    train = rows[rows.target_end < '2022-01-01T00:00:00Z']
    calibration = rows[(rows.time >= '2022-01-01T00:00:00Z') & (rows.target_end < '2023-01-01T00:00:00Z')]
    validation = rows[(rows.time >= '2023-01-01T00:00:00Z') & (rows.target_end < '2024-01-01T00:00:00Z')]
    test = rows[rows.time >= '2024-01-01T00:00:00Z']
    splits = dict(train=train, calibration=calibration, validation=validation, test=test)
    used_groups = set()
    for name, frame in splits.items():
        counts = frame.cloudburst_next_3h.value_counts()
        if any(counts.get(label, 0) < MIN_CLASS_EXAMPLES for label in (0, 1)):
            raise ValueError(f'{name} requires at least {MIN_CLASS_EXAMPLES} verified examples of each class')
        groups = set(frame.event_group)
        if groups & used_groups:
            raise ValueError('Storm/control groups overlap chronological splits; exclude crossing groups')
        used_groups.update(groups)
    return splits


def evaluate(model, frame, threshold):
    y = frame.cloudburst_next_3h
    probabilities = model.predict_proba(frame[FEATURES])[:, list(model.classes_).index(1)]
    pred = (probabilities >= threshold).astype(int)
    return dict(average_precision=float(average_precision_score(y, probabilities)),
                roc_auc=float(roc_auc_score(y, probabilities)),
                brier_score=float(brier_score_loss(y, probabilities)),
                log_loss=float(log_loss(y, probabilities, labels=[0, 1])),
                event_prevalence=float(y.mean()), threshold=threshold,
                classification_report=classification_report(y, pred, labels=[0, 1], target_names=['No event', 'Cloudburst'], output_dict=True, zero_division=0),
                confusion_matrix=confusion_matrix(y, pred, labels=[0, 1]).tolist())


def train_and_evaluate(weather_path=None, labels_path=None):
    weather_path = Path(weather_path or ROOT / 'dataset/era5_hourly.csv')
    labels_path = Path(labels_path or ROOT / 'dataset/cloudburst_labels.csv')
    if not labels_path.exists():
        raise ValueError('Verified cloudburst_labels.csv is missing. Rainfall classes cannot substitute for cloudburst labels. See ml_engine/README.md.')
    provenance_path = labels_path.with_suffix('.provenance.json')
    if not provenance_path.exists():
        raise ValueError('Label provenance manifest is required')
    provenance = json.loads(provenance_path.read_text())
    if provenance.get('task') != TASK or provenance.get('label_method') != 'independently_verified_events_and_monitored_controls' or provenance.get('synthetic') is not False:
        raise ValueError('Labels must describe independently verified events and monitored controls')
    for key, path in [('labels_sha256', labels_path), ('weather_sha256', weather_path)]:
        if provenance.get(key) != hashlib.sha256(path.read_bytes()).hexdigest():
            raise ValueError(f'Provenance mismatch: {key}')
    if provenance.get('timezone') != 'UTC' or provenance.get('sampling') != 'complete_monitored_windows':
        raise ValueError('UTC timestamps and complete monitored sampling are required for probability estimation')
    # ERA5 archive uses local time; the supplied weather table must first be explicitly converted to UTC.
    for path in (weather_path, labels_path):
        times = pd.read_csv(path, usecols=['time']).time.astype(str)
        if not times.str.contains(r'(?:Z|\+00:00)$').all():
            raise ValueError('Training and label timestamps must explicitly use UTC (Z or +00:00)')
    splits = split_examples(load_labeled_examples(weather_path, labels_path))
    train, cal, val, test = [splits[k] for k in ('train', 'calibration', 'validation', 'test')]
    forest = RandomForestClassifier(n_estimators=150, max_depth=12, min_samples_leaf=10, class_weight='balanced_subsample', random_state=42, n_jobs=-1)
    forest.fit(train[FEATURES], train.cloudburst_next_3h)
    model = CalibratedClassifierCV(FrozenEstimator(forest), method='sigmoid')
    model.fit(cal[FEATURES], cal.cloudburst_next_3h)
    probabilities = model.predict_proba(val[FEATURES])[:, list(model.classes_).index(1)]
    precision, recall, thresholds = precision_recall_curve(val.cloudburst_next_3h, probabilities)
    f1 = 2 * precision[:-1] * recall[:-1] / np.maximum(precision[:-1] + recall[:-1], 1e-12)
    threshold = float(thresholds[int(np.argmax(f1))])
    meta = dict(schema_version=SCHEMA_VERSION, task=TASK, model_name='Three-hour cloudburst occurrence classifier', algorithm='RandomForestClassifier + sigmoid calibration', synthetic=False,
                cloudburst_validated=False, status='experimental_event_model', features=FEATURES, horizon_hours=3,
                target='Independently verified localized cloudburst occurs during (issue_time, issue_time + 3h] at the labeled site.',
                decision_threshold=threshold, calibration_period='2022', training_period='before 2022', validation_period='2023', test_period='2024 onward',
                metrics=evaluate(model, test, threshold), validation_metrics=evaluate(model, val, threshold),
                split_samples={k:len(v) for k,v in splits.items()}, provenance=provenance,
                trained_at=datetime.now(timezone.utc).isoformat(), limitations=['Independent operational and spatial validation is required.', 'Reanalysis to live forecast distribution shift remains unvalidated.'])
    output = ROOT / 'models'
    output.mkdir(exist_ok=True)
    tmp = output / 'cloudburst.tmp'
    joblib.dump(dict(model=model, metadata=meta), tmp)
    os.replace(tmp, output / 'cloudburst_model.joblib')
    (output / 'model_metadata.json').write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--weather')
    parser.add_argument('--labels')
    args = parser.parse_args()
    try:
        train_and_evaluate(args.weather, args.labels)
    except ValueError as error:
        parser.exit(1, f'Cloudburst training unavailable: {error}\n')
