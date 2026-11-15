"""Shared train/serve contract. Only measurements available at issue time."""
import math
FEATURES = ['temperature_2m', 'relative_humidity_2m', 'pressure_msl', 'precipitation', 'wind_speed_10m', 'cloud_cover']
INPUT_KEYS = ['temperature', 'humidity', 'pressure', 'precipitation', 'windSpeed', 'cloudCover']
BOUNDS = [(-90,65), (0,100), (800,1100), (0,1000), (0,500), (0,100)]
CLASSES = ['Low', 'Watch', 'High']
SCHEMA_VERSION = 2

def validate_values(values):
    for name, value, (low, high) in zip(FEATURES, values, BOUNDS):
        if isinstance(value, bool) or not isinstance(value, (int,float)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f'Missing or invalid measurement: {name}')
    return values

def input_features(data):
    return validate_values([data.get(k) for k in INPUT_KEYS])
