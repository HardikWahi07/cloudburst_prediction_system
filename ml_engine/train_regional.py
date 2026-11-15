"""Train a three-hour gauge exceedance classifier from routine ASOS observations."""
import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from fetch_asos import ROOT, STATIONS, url

MODEL_DIR = ROOT.parent.parent / 'models'
COLS = ['temperature', 'humidity', 'log_rain']
def features(temp, humidity, rain):
    return pd.DataFrame(dict(temperature=temp, humidity=humidity, log_rain=np.log1p(rain)))

def station_examples(path):
    raw = pd.read_csv(path, na_values='M', dtype={'p01i':str})
    times = pd.to_datetime(raw.valid)
    # Keep a routine end-of-hour report. Missing and ambiguous hours stay unknown.
    raw = raw.loc[times.dt.minute >= 50].copy()
    raw.index = times.loc[raw.index].dt.floor('h')
    raw = raw.loc[~raw.index.duplicated(keep=False)].sort_index().asfreq('h')
    mm = pd.to_numeric(raw.p01i.replace('T','0'), errors='coerce') * 25.4
    mm = mm.where(mm.between(0, 400))
    temp = (raw.tmpf - 32) / 1.8
    df = features(temp.where(temp.between(-70,60)),raw.relh.where(raw.relh.between(0,100)),mm)
    future = pd.concat([mm.shift(-i) for i in (1,2,3)],axis=1).max(axis=1,skipna=False)
    df['target'] = (future >= 100).where(future.notna())
    df['station'] = path.stem
    return df.dropna().astype({'target':int})

def evaluate(model, x, y):
    scores = model.decision_function(x)
    return dict(windows=len(y),positive_windows=int(y.sum()),confusion=confusion_matrix(y,scores>=0,labels=[0,1]).tolist(),average_precision=float(average_precision_score(y,scores)) if y.sum() else None)

def main():
    paths = [ROOT/(s+'.csv') for s in STATIONS]
    data = pd.concat([station_examples(p) for p in paths])
    train = data[data.index < pd.Timestamp('2022-01-01') - pd.Timedelta(hours=3)]
    test = data[data.index >= '2022-01-01']
    if train.target.nunique()!=2: raise ValueError('Insufficient positive training windows')
    model = make_pipeline(StandardScaler(),LogisticRegression(class_weight='balanced',C=0.1,max_iter=500))
    model.fit(train[COLS],train.target)
    pilot = pd.read_csv(ROOT.parent / 'gauge_pilot.csv')
    comparison = evaluate(model,features(pilot.temperature_2m,pilot.relative_humidity_2m,pilot.precipitation),pilot.gauge_peak_mm>=100)
    meta = dict(task='regional_gauge_100mm_next_3h', features=COLS, sources={p.stem:dict(url=url(p.stem),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in paths},training_stations=sorted(train.station.unique().tolist()),train_windows=len(train),train_positive_windows=int(train.target.sum()),test=evaluate(model,test[COLS],test.target),himalayan_comparison=comparison,train_positive_station_days=len(train[train.target.eq(1)].groupby(['station',train[train.target.eq(1)].index.date])),threshold=100)
    # Evaluate rare positives at stations absent from each fit.
    station_confusion = np.zeros((2,2),dtype=int)
    for station in train.station.unique():
        held = train.station == station
        other = train.loc[~held]
        candidate = clone(model).fit(other[COLS],other.target)
        station_confusion += confusion_matrix(train.loc[held,'target'],
            candidate.predict(train.loc[held,COLS]),labels=[0,1])
    meta['held_station_confusion'] = station_confusion.tolist()
    joblib.dump(dict(model=model,metadata=meta),MODEL_DIR/'regional_gauge.joblib')
    (MODEL_DIR/'regional_gauge.json').write_text(json.dumps(meta,indent=2)+'\n')
    print({k:v for k,v in meta.items() if k!='sources'})
if __name__=='__main__': main()
