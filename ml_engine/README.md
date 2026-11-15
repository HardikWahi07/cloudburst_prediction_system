# Cloudburst occurrence model

The prediction target is **a verified localized cloudburst during (issue time, issue time + 3 hours] at the monitored site**, not a rainfall class. IMD warning guidance describes cloudbursts using rainfall intensity above 100 mm/hour: https://mausam.imd.gov.in/imd_latest/contents/pdf/forecasting_sop.pdf

## Current status

Cloudburst prediction is **unavailable**. The downloaded ERA5 dataset contains 219,240 hourly records but no independently verified cloudburst labels. Its maximum hourly precipitation is 23.6 mm. Training a binary classifier by thresholding this dataset at 100 mm/hour would give zero positive cases. No event probability can be learned from it. Unknown hours are not automatically non-events.

The previous rainfall artifact is preserved as `models/rainfall_model.joblib` with `rainfall_metadata.json`. It is never served as cloudburst risk. Its 2/10 mm rainfall categories and evaluation metrics are not cloudburst classes or cloudburst validation. Offline reproduction remains available through `train_rainfall.py`.

## Required real training inputs

Supply two CSVs with explicit UTC timestamps (`Z` or `+00:00`). Convert ERA5's Asia/Kolkata timestamps to UTC before matching; never just append `Z`.

Weather columns:

```
station,time,temperature_2m,relative_humidity_2m,pressure_msl,precipitation,wind_speed_10m,cloud_cover
```

Labels:

```
station,time,cloudburst_next_3h,verification_source,event_group
```

`cloudburst_next_3h` is 1 only if a quality-controlled station/radar record or independently verified event establishes a localized cloudburst in the next three hours at that station/site. It is 0 only for a monitored window establishing no event. Omit unknown windows. `verification_source` identifies the supporting record, URL or dataset; `event_group` identifies the underlying storm, including associated windows, or the monitored control episode. Do not use fabricated events, rainfall-bin labels, daily totals, or absence of a news report as labels. Complete monitored windows with representative prevalence are required; a case-control sample cannot directly calibrate population probability.

Alongside `cloudburst_labels.csv`, provide `cloudburst_labels.provenance.json`:

```json
{
  "task": "verified_cloudburst_occurrence_next_3h",
  "label_method": "independently_verified_events_and_monitored_controls",
  "synthetic": false,
  "timezone": "UTC",
  "sampling": "complete_monitored_windows",
  "labels_sha256": "SHA-256 of labels CSV",
  "weather_sha256": "SHA-256 of UTC weather CSV"
}
```

Checksums confirm input identity, not scientific quality; human verification of event records is required.

## Train and evaluate

From the repository root:

```
python3 -m venv .venv
.venv/bin/pip install -r ml_engine/requirements.txt
.venv/bin/python ml_engine/train.py --weather /absolute/path/weather_utc.csv --labels /absolute/path/cloudburst_labels.csv
.venv/bin/python -m unittest discover -s ml_engine/tests
```

Training uses issue-time meteorology only. Labels and future precipitation never become features. Chronological splits: before 2022 training; 2022 sigmoid calibration; 2023 alert threshold selection; 2024 onward untouched test. Three-hour label windows are purged at boundaries. Storm/control groups cannot appear in multiple splits. Each split requires at least 20 examples of both classes as a basic guard, not a claim of statistical sufficiency. This pipeline does not establish unseen-location generalization.

Binary event probability is calibrated on a separate chronological sample. Threshold selection maximizes validation F1; an operational alert policy requires further validation. Saved metrics include event average precision, ROC AUC, Brier score, log loss, precision/recall and confusion matrix. Independent spatial and operational validation is still required, so `cloudburst_validated` remains false. A below-threshold estimate is not a safety guarantee.

Inference accepts only schema-3 verified-event artifacts. Missing data, a rainfall artifact, or an absent cloudburst artifact returns unavailable, without a zero probability or Low fallback. Node execution is asynchronous, bounded and timed out. Set `ML_PYTHON_PATH` to override `.venv/bin/python`.

## Reanalysis source

[Open-Meteo historical weather API](https://open-meteo.com/en/docs/historical-weather-api), ERA5 via Copernicus/ECMWF. Original responses, URLs, units and SHA-256 checksums remain in `dataset/era5_raw` and `dataset/provenance.json`. Run `data_pipeline.py` to reproduce downloads. ERA5 grid averages smooth localized extremes and forecast inputs differ from reanalysis; neither limitation is resolved by changing a label or threshold.

### Regional gauge classifier

Run `.venv/bin/python ml_engine/fetch_asos.py` and `.venv/bin/python ml_engine/train_regional.py` from the project root. The regional artifact uses routine hourly airport reports archived by Iowa State. Predictors are temperature, humidity and preceding hourly precipitation. Labels require all three subsequent hourly gauge readings. A positive window contains at least one reading of 100 mm or more. Repeated windows can describe the same storm. Trace rain is treated as zero and missing hours remain unknown.

Training ends before 2022 with three hours purged at the boundary. The later time holdout shares stations with training. Metadata includes input URLs and hashes, class counts, confusion matrices and a comparison against the 11 selected Himalayan gauge days. The balanced logistic classifier produces an experimental classification. Its class weights do not represent local event prevalence.
