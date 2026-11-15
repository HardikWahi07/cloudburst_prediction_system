import json
import sys
import unittest
from unittest.mock import patch
import numpy as np
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from features import input_features, FEATURES
from train_rainfall import make_examples
from train import load_labeled_examples, split_examples, train_and_evaluate
from predict import predict_risk

class ContractTests(unittest.TestCase):
    def test_zero_is_preserved_and_missing_rejected(self):
        data=dict(temperature=0,humidity=0,pressure=1000,precipitation=0,windSpeed=0,cloudCover=0)
        self.assertEqual(input_features(data),[0,0,1000,0,0,0])
        for bad in (None,float('nan'),True,-1):
            with self.assertRaises(ValueError):
                input_features({**data,'precipitation':bad})

    def test_future_is_label_only_and_tail_removed(self):
        frame=pd.DataFrame({k:[0]*8 for k in FEATURES})
        frame['station']='test'
        frame['time']=pd.date_range('2022-12-31T20:00',periods=8,freq='h')
        frame['pressure_msl']=1000
        frame['precipitation']=[0,1,2,12,0,0,0,0]
        rows=make_examples(frame)
        self.assertEqual(len(rows),5)
        self.assertEqual(rows.iloc[0].target,2)
        self.assertEqual(rows.iloc[0].precipitation,0)
        self.assertNotIn('target_peak',FEATURES)
        self.assertEqual(len(rows[rows.target_end < '2023-01-01']),1)

    def test_missing_event_model_does_not_return_rainfall_risk(self):
        result=predict_risk(dict(temperature=20,humidity=80,pressure=1010,precipitation=2,windSpeed=10,cloudCover=70))
        self.assertEqual(result['status'],'unavailable')
        self.assertIsNone(result['cloudburstProbability'])
        self.assertNotIn('riskLevel',result)

    def test_event_probability_uses_actual_positive_class(self):
        class Model:
            classes_ = np.array([1,0])
            def predict_proba(self, frame): return np.array([[0.8,0.2]])
        meta=dict(schema_version=3,task='verified_cloudburst_occurrence_next_3h',synthetic=False,features=FEATURES,
                  provenance=dict(label_method='independently_verified_events_and_monitored_controls'),decision_threshold=0.6,
                  limitations=[],algorithm='test',trained_at='test',status='experimental_event_model',cloudburst_validated=False,target='event',test_period='2024',metrics={})
        with patch('predict.MODEL_PATH') as path, patch('predict.joblib.load',return_value=dict(model=Model(),metadata=meta)):
            path.exists.return_value=True
            result=predict_risk(dict(temperature=20,humidity=80,pressure=1010,precipitation=2,windSpeed=10,cloudCover=70))
        self.assertEqual(result['cloudburstProbability'],0.8)
        self.assertEqual(result['riskLevel'],'High')

    def test_rainfall_artifact_is_rejected(self):
        with patch('predict.MODEL_PATH') as path, patch('predict.joblib.load',return_value=dict(model=None,metadata=dict(schema_version=2))):
            path.exists.return_value=True
            with self.assertRaises(ValueError):
                predict_risk(dict(temperature=20,humidity=80,pressure=1010,precipitation=2,windSpeed=10,cloudCover=70))

    def test_cloudburst_training_requires_verified_labels(self):
        with self.assertRaisesRegex(ValueError,'missing'):
            train_and_evaluate(labels_path='/tmp/no-cloudburst-labels-exist.csv')

    def test_all_negative_training_is_rejected(self):
        rows=pd.DataFrame(dict(time=pd.date_range('2020-01-01',periods=80,freq='h',tz='UTC'),cloudburst_next_3h=[0]*80,event_group=['a']*80))
        rows['target_end']=rows.time + pd.Timedelta(hours=3)
        with self.assertRaisesRegex(ValueError,'each class'): split_examples(rows)

    def test_non_hourly_data_rejected(self):
        frame=pd.DataFrame({k:[0,0] for k in FEATURES})
        frame['station']='test'
        frame['time']=['2020-01-01T00:00','2020-01-01T02:00']
        with self.assertRaises(ValueError): make_examples(frame)

if __name__ == '__main__': unittest.main()
