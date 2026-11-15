"""
Feature Engineering Pipeline for Himalayan Cloudburst ML.

Guarantees:
1. Strict Causal Temporal Alignment: No future data leakage (only historical & current $t$).
2. Group-aware Processing: Rolling windows and lags computed independently per station.
3. Domain-Specific Physical Features: Orographic lift, barometric convective drop,
   dew point depression, moisture flux index, and cyclical time encodings.
"""

import math
import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    # Direct meteorological readings
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "surface_pressure",
    "precipitation",
    "wind_speed_10m",
    "wind_gusts_10m",
    "cloud_cover",
    "cape",
    
    # Station & Topographic features
    "elevation_m",
    "latitude",
    "longitude",
    
    # Engineered Precipitation Accumulations & Dynamics
    "rainfall_accum_3h",
    "rainfall_accum_6h",
    "rainfall_accum_12h",
    "rainfall_accum_24h",
    "rainfall_intensity_accel",
    "rainfall_mean_3h",
    
    # Barometric & Thermal Convective Dynamics
    "pressure_change_1h",
    "pressure_change_3h",
    "pressure_change_6h",
    "temp_change_1h",
    "temp_change_3h",
    "dew_point_depression",
    "rh_trend_3h",
    "is_near_saturation",
    
    # Kinematic & Thermodynamic Advection
    "gust_factor",
    "moisture_flux_index",
    "orographic_lift_index",
    
    # Temporal Cyclical Encodings
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
]


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw hourly meteorological records into an enriched, causal feature table.
    Computes group-wise rolling windows per station to prevent cross-station pollution.
    """
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["dt"] = pd.to_datetime(df["timestamp"])
    else:
        df["dt"] = df["timestamp"]

    # Sort strictly by station and time
    df = df.sort_values(by=["station_id", "dt"]).reset_index(drop=True)

    # 1. Temporal cyclical encodings
    hours = df["dt"].dt.hour
    doys = df["dt"].dt.dayofyear
    df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
    df["doy_sin"] = np.sin(2 * np.pi * doys / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doys / 365.25)

    # Grouped rolling features per station
    grouped = df.groupby("station_id")

    # 2. Precipitation accumulations (rolling sum over past N hours including current)
    df["rainfall_accum_3h"] = grouped["precipitation"].rolling(window=3, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rainfall_accum_6h"] = grouped["precipitation"].rolling(window=6, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rainfall_accum_12h"] = grouped["precipitation"].rolling(window=12, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rainfall_accum_24h"] = grouped["precipitation"].rolling(window=24, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rainfall_mean_3h"] = grouped["precipitation"].rolling(window=3, min_periods=1).mean().reset_index(level=0, drop=True)

    # 3. Rainfall rate acceleration ΔR / Δt (first derivative)
    lagged_precip_1 = grouped["precipitation"].shift(1).fillna(0.0)
    df["rainfall_intensity_accel"] = df["precipitation"] - lagged_precip_1

    # 4. Pressure tendencies (rapid negative drop indicates violent convective cell development)
    lagged_press_1 = grouped["surface_pressure"].shift(1)
    lagged_press_3 = grouped["surface_pressure"].shift(3)
    lagged_press_6 = grouped["surface_pressure"].shift(6)
    df["pressure_change_1h"] = (df["surface_pressure"] - lagged_press_1).fillna(0.0)
    df["pressure_change_3h"] = (df["surface_pressure"] - lagged_press_3).fillna(0.0)
    df["pressure_change_6h"] = (df["surface_pressure"] - lagged_press_6).fillna(0.0)

    # 5. Temperature and Humidity dynamics
    lagged_temp_1 = grouped["temperature_2m"].shift(1)
    lagged_temp_3 = grouped["temperature_2m"].shift(3)
    df["temp_change_1h"] = (df["temperature_2m"] - lagged_temp_1).fillna(0.0)
    df["temp_change_3h"] = (df["temperature_2m"] - lagged_temp_3).fillna(0.0)

    lagged_rh_3 = grouped["relative_humidity_2m"].shift(3)
    df["rh_trend_3h"] = (df["relative_humidity_2m"] - lagged_rh_3).fillna(0.0)
    df["dew_point_depression"] = np.maximum(0.0, df["temperature_2m"] - df["dew_point_2m"])
    df["is_near_saturation"] = (df["relative_humidity_2m"] >= 90.0).astype(float)

    # 6. Wind & Advection indices
    safe_speed = np.maximum(1.0, df["wind_speed_10m"])
    df["gust_factor"] = df["wind_gusts_10m"] / safe_speed
    df["moisture_flux_index"] = df["wind_speed_10m"] * (df["relative_humidity_2m"] / 100.0)
    df["orographic_lift_index"] = (df["elevation_m"] / 1000.0) * df["wind_speed_10m"] * (df["relative_humidity_2m"] / 100.0)

    # Fill any edge NaNs (e.g., initial lags at very start of series) with 0.0
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = df[col].fillna(0.0)

    return df


def prepare_feature_matrix(df: pd.DataFrame, target_col: str = "cloudburst_event"):
    """
    Extracts features and separates design matrix X, target array y, and metadata.
    """
    df_feat = extract_features(df)
    
    missing_cols = [c for c in FEATURE_COLUMNS if c not in df_feat.columns]
    if missing_cols:
        raise ValueError(f"Missing required feature columns: {missing_cols}")

    X = df_feat[FEATURE_COLUMNS].copy()
    y = df_feat[target_col].astype(int).values if target_col in df_feat.columns else None

    metadata = df_feat[["timestamp", "station_id", "station_name", "latitude", "longitude", "elevation_m"]].copy()
    return X, y, metadata, FEATURE_COLUMNS
