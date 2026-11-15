"""Train a rainfall-intensity baseline on real ERA5 data, with a purged temporal holdout."""
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, log_loss
from features import FEATURES, CLASSES, SCHEMA_VERSION, BOUNDS

ROOT = Path(__file__).resolve().parent

def make_examples(df):
    frames = []
    for _, group in df.groupby('station'):
        group = group.sort_values('time').copy()
        group['time'] = pd.to_datetime(group['time'])
        if group.time.duplicated().any() or not group.time.diff().dropna().eq(pd.Timedelta(hours=1)).all():
            raise ValueError('Duplicate or non-hourly station records')
        future = pd.concat([group.precipitation.shift(-h) for h in (1,2,3)], axis=1)
        group['target_peak'] = future.max(axis=1, skipna=False)
        group['target_end'] = group.time + pd.Timedelta(hours=3)
        group = group.dropna(subset=FEATURES + ['target_peak'])
        for name, (low,high) in zip(FEATURES, BOUNDS):
            group = group[group[name].between(low,high)]
        group['target'] = np.where(group.target_peak >= 10, 2, np.where(group.target_peak >= 2, 1, 0))
        frames.append(group)
    return pd.concat(frames, ignore_index=True)

def metrics(model, frame):
    y = frame.target
    pred = model.predict(frame[FEATURES])
    prob = model.predict_proba(frame[FEATURES])
    return dict(accuracy=float(accuracy_score(y,pred)), balanced_accuracy=float(balanced_accuracy_score(y,pred)), log_loss=float(log_loss(y,prob,labels=[0,1,2])), classification_report=classification_report(y,pred,labels=[0,1,2],target_names=CLASSES,output_dict=True,zero_division=0), confusion_matrix=confusion_matrix(y,pred,labels=[0,1,2]).tolist(), majority_baseline_accuracy=float((y == 0).mean()), class_counts={CLASSES[i]:int((y==i).sum()) for i in range(3)})

def train_and_evaluate():
    path = ROOT / 'dataset/era5_hourly.csv'
    provenance = json.loads((ROOT / 'dataset/provenance.json').read_text())
    if provenance.get('synthetic') is not False or hashlib.sha256(path.read_bytes()).hexdigest() != provenance['dataset_sha256']:
        raise ValueError('Missing real-data provenance or dataset checksum mismatch')
    df = make_examples(pd.read_csv(path))
    train = df[df.target_end < '2023-01-01']
    val = df[(df.time >= '2023-01-01') & (df.target_end < '2024-01-01')]
    test = df[df.time >= '2024-01-01']
    for split in (train,val,test):
        if set(split.target) != {0,1,2}:
            raise ValueError('Each temporal split must contain every rainfall class')
    # Validation selects depth; test years are never used for model selection.
    candidates = []
    for depth in (10,18):
        model = RandomForestClassifier(n_estimators=100,max_depth=depth,min_samples_leaf=10,class_weight='balanced_subsample',random_state=42,n_jobs=-1)
        model.fit(train[FEATURES],train.target)
        candidates.append((metrics(model,val)['balanced_accuracy'],model))
    _, model = max(candidates,key=lambda x:x[0])
    metadata = dict(schema_version=SCHEMA_VERSION, model_name='ERA5 three-hour rainfall intensity baseline', algorithm='RandomForestClassifier', status='experimental_reanalysis_baseline', cloudburst_validated=False, synthetic=False, features=FEATURES, classes=CLASSES, target='Maximum precipitation in t+1 through t+3 hours: Low <2, Watch 2–<10, High >=10 mm/h. These are project rainfall classes, not cloudburst labels.', horizon_hours=3, thresholds_mm=[2,10], training_period='2020–2022',validation_period='2023',test_period='2024', temporal_embargo_hours=3, training_samples=len(train), validation_samples=len(val),test_samples=len(test), validation_metrics=metrics(model,val),metrics=metrics(model,test), trained_at=datetime.now(timezone.utc).isoformat(), provenance=provenance, limitations=['No verified cloudburst event labels; cannot estimate cloudburst probability.', 'ERA5 grid averages smooth localized extremes.', 'Live forecast inputs differ from historical reanalysis; operational skill is unvalidated.', 'Random forest class probabilities are not calibrated confidence estimates.'])
    output = ROOT / 'models'
    output.mkdir(exist_ok=True)
    tmp = output / 'model.tmp'
    joblib.dump(dict(model=model,metadata=metadata),tmp)
    os.replace(tmp, output / 'rainfall_model.joblib')
    (output / 'rainfall_metadata.json').write_text(json.dumps(metadata,indent=2))
    print(json.dumps({k:metadata[k] for k in ['training_samples','validation_samples','test_samples','metrics']},indent=2))

if __name__ == '__main__':
    train_and_evaluate()
