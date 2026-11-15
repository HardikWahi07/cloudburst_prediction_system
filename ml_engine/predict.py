"""Cloudburst-event inference. Rainfall-only artifacts cannot produce event risk."""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
import joblib
import pandas as pd
from features import FEATURES, input_features

MODEL_PATH = Path(__file__).resolve().parent / 'models/cloudburst_model.joblib'
TASK = 'verified_cloudburst_occurrence_next_3h'


def predict_risk(data):
    values = input_features(data)
    if not MODEL_PATH.exists():
        pilot_path = MODEL_PATH.with_name('gauge_pilot.joblib')
        if not pilot_path.is_file():
            return dict(status='unavailable', task=TASK, cloudburstProbability=None, message='No trained event or gauge model installed.')
        pilot = joblib.load(pilot_path)
        meta = pilot['metadata']
        if meta['task'] != 'gauge_cloudburst_intensity_case_comparison' or meta['features'] != FEATURES:
            raise ValueError('Incompatible gauge model')
        row = pd.DataFrame([values], columns=FEATURES)
        classification = int(pilot['model'].predict(row)[0])
        outside = [name for name, value in zip(FEATURES, values)
                   if not meta['ranges'][name][0] <= value <= meta['ranges'][name][1]]
        regional_path = pilot_path.with_name('regional_gauge.joblib')
        regional = None
        if regional_path.is_file():
            artifact = joblib.load(regional_path)
            info = artifact['metadata']
            regional_row = pd.DataFrame([dict(temperature=data['temperature'], humidity=data['humidity'],
                                              log_rain=math.log1p(data['precipitation']))])
            if info['task'] != 'regional_gauge_100mm_next_3h' or list(regional_row) != info['features']:
                raise ValueError('Incompatible regional model')
            regional = dict(matchesEventClass=bool(artifact['model'].predict(regional_row)[0]),
                            trainingWindows=info['train_windows'], positiveWindows=info['train_positive_windows'],
                            stations=info['training_stations'], test=info['test'])
        return dict(status='unavailable', task=TASK, cloudburstProbability=None,
                    message='Local event probability has not been calibrated.', regionalGauge=regional,
                    gaugePilot=dict(matchesEventClass=bool(classification), outsideRange=outside,
                                    examples=meta['examples'], positives=meta['positives']))
    artifact = joblib.load(MODEL_PATH)
    if not isinstance(artifact, dict):
        raise ValueError('Legacy synthetic model disabled; event-labeled retraining required')
    model, meta = artifact['model'], artifact['metadata']
    if meta.get('schema_version') != 3 or meta.get('task') != TASK or meta.get('synthetic') is not False or meta.get('features') != FEATURES or meta.get('provenance', {}).get('label_method') != 'independently_verified_events_and_monitored_controls':
        raise ValueError('Artifact is not a verified-event cloudburst model')
    if set(model.classes_) != {0,1}:
        raise ValueError('Cloudburst classifier must have event and non-event classes')
    probability = float(model.predict_proba(pd.DataFrame([values], columns=FEATURES))[0, list(model.classes_).index(1)])
    threshold = meta['decision_threshold']
    return dict(status='success', task=TASK, cloudburstProbability=probability,
                riskLevel='High' if probability >= threshold else 'Low', decisionThreshold=threshold, confidence=None,
                topFactors=['Probability of a labeled cloudburst event within the next three hours.', *meta['limitations']],
                modelMetadata=dict(algorithm=meta['algorithm'], trainedAt=meta['trained_at'], status=meta['status'],
                                   cloudburstValidated=meta['cloudburst_validated'], target=meta['target'],
                                   testPeriod=meta['test_period'], metrics=meta['metrics']),
                timestamp=datetime.now(timezone.utc).isoformat())


if __name__ == '__main__':
    try:
        result = predict_risk(json.loads(sys.argv[1]))
    except Exception as error:
        result = dict(status='unavailable', task=TASK, cloudburstProbability=None, message=str(error))
    print(json.dumps(result, allow_nan=False))
