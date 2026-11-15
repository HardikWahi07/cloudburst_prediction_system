"""Train a small case-comparison model on Dimri et al., Table 2."""
import argparse
import json
import subprocess
from pathlib import Path
from urllib.parse import urlencode

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.metrics import confusion_matrix
from features import FEATURES

ROOT = Path(__file__).resolve().parent
SOURCE = 'https://centaur.reading.ac.uk/69722/1/Dimri%20et%20al%202017%20%28in%20Press%29.pdf'
# Station, date, hour of peak, observed daily maximum hourly rain (Table 2).
RECORDS = [
    ('Dehradun','1970-06-14',10,101.1), ('Dehradun','2010-07-31',0,74.8),
    ('Dehradun','2008-08-10',14,97), ('Dehradun','2007-07-31',20,70),
    ('Dehradun','2006-08-02',14,72.5), ('Dehradun','2001-06-02',4,70.2),
    ('Dehradun','1999-09-22',7,84.3), ('Dehradun','1997-07-14',0,72.4),
    ('Dharamshala','1983-07-26',10,191.2), ('Dharamshala','1975-08-04',21,72.5),
    ('Dharamshala','1980-07-25',0,70), ('Dharamshala','1985-07-14',10,78),
    ('Dharamshala','1991-08-14',20,86), ('Dharamshala','1995-08-02',4,74)]
COORD = {'Dehradun':(30.3165,78.0322),'Dharamshala':(32.219,76.323)}

def download_records():
    rows = []
    for station, date, hour, peak in RECORDS:
        # Exclude midnight peaks: the preceding issue window spans an unverified day.
        if hour < 3:
            continue
        lat, lon = COORD[station]
        url = 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(dict(
            latitude=lat, longitude=lon, start_date=date, end_date=date,
            timezone='Asia/Kolkata', hourly=','.join(FEATURES), models='era5'))
        data = json.loads(subprocess.check_output(['curl','-fsSL','--retry','2','--max-time','45',url]))
        hourly = pd.DataFrame(data['hourly']).set_index('time')
        time = f'{date}T{hour-3:02}:00'
        rows.append(dict(station=station, time=time, gauge_peak_mm=peak, source_url=url, **hourly.loc[time].to_dict()))
    df = pd.DataFrame(rows)
    df.to_csv(ROOT/'dataset/gauge_pilot.csv',index=False)
    return df

def train(df):
    x = df[FEATURES]
    y = (df.gauge_peak_mm >= 100).astype(int)
    model = make_pipeline(StandardScaler(), LogisticRegression(C=0.1,class_weight='balanced'))
    pred = cross_val_predict(model, x, y, cv=LeaveOneOut())
    model.fit(x,y)
    metadata = dict(task='gauge_cloudburst_intensity_case_comparison', source=SOURCE,
                    examples=len(y), positives=int(y.sum()), features=FEATURES,
                    ranges={name: [float(x[name].min()), float(x[name].max())] for name in FEATURES},
                    leave_one_day_out_confusion=confusion_matrix(y,pred).tolist(),
                    assumption='Reported gauge peak hour interpreted as local IST. Issue time three hours before peak.',
                    selection='Published severe storm days only. No population probability or operational alert threshold.')
    joblib.dump(dict(model=model,metadata=metadata),ROOT/'models/gauge_pilot.joblib')
    print(json.dumps(metadata))
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Rebuild the gauge/weather CSV from the archive')
    args = parser.parse_args()
    train(download_records() if args.download else pd.read_csv(ROOT/'dataset/gauge_pilot.csv'))
