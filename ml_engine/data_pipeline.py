"""Download original ERA5 reanalysis; retain raw responses and provenance."""
import hashlib
import json
import subprocess
import time
from pathlib import Path
from urllib.parse import urlencode
import pandas as pd

ROOT = Path(__file__).resolve().parent
VARIABLES = ['temperature_2m', 'relative_humidity_2m', 'pressure_msl', 'precipitation', 'wind_speed_10m', 'cloud_cover']
STATIONS = {'dehradun': (30.3165,78.0322), 'shimla': (31.1048,77.1734), 'manali': (32.2396,77.1887), 'joshimath': (30.5506,79.5658), 'gangtok': (27.3389,88.6065)}

def download():
    raw = ROOT / 'dataset' / 'era5_raw'
    raw.mkdir(parents=True, exist_ok=True)
    frames, sources = [], []
    for station, (lat, lon) in STATIONS.items():
        params = dict(latitude=lat, longitude=lon, start_date='2020-01-01', end_date='2024-12-31', hourly=','.join(VARIABLES), models='era5', timezone='Asia/Kolkata', wind_speed_unit='kmh')
        url = 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(params)
        dest = raw / f'{station}.json'
        if not dest.exists():
            subprocess.run(['curl', '-fsSL', '--retry', '3', '--max-time', '180', url, '-o', str(dest)], check=True)
            time.sleep(1)
        data = json.loads(dest.read_text())
        frame = pd.DataFrame(data['hourly'])
        if set(VARIABLES) - set(frame):
            raise ValueError(f'Incomplete response for {station}')
        frame['station'] = station
        frame['latitude'], frame['longitude'] = lat, lon
        frames.append(frame)
        sources.append(dict(station=station, url=url, sha256=hashlib.sha256(dest.read_bytes()).hexdigest(), elevation=data.get('elevation'), units=data['hourly_units']))
        print(station, len(frame), flush=True)
    dataset = ROOT / 'dataset' / 'era5_hourly.csv'
    pd.concat(frames).to_csv(dataset, index=False)
    manifest = dict(source='Open-Meteo ERA5 reanalysis', documentation='https://open-meteo.com/en/docs/historical-weather-api', synthetic=False, limitations='Gridded reanalysis, not rain-gauge observations or verified cloudburst event labels.', sources=sources, dataset_sha256=hashlib.sha256(dataset.read_bytes()).hexdigest())
    (ROOT / 'dataset' / 'provenance.json').write_text(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    download()
