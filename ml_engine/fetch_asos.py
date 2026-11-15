"""Download routine hourly US airport observations from the Iowa Environmental Mesonet."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
import subprocess

ROOT = Path(__file__).resolve().parent / 'dataset/asos'
STATIONS = 'HOU IAH FLL MIA MSY PBI TPA AUS BTR MOB CRP SJU ISP PNS'.split()
def url(station):
    return 'https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?' + urlencode(dict(station=station, data=['tmpf','relh','p01i'], year1=2010 if station in ("ISP","PNS") else 2015, month1=1, day1=1, year2=2025, month2=1, day2=1, tz='Etc/UTC',format='onlycomma',missing='M',trace='T',report_type=3), doseq=True)
def fetch(station):
    dest = ROOT / (station+'.csv')
    if dest.exists(): return
    tmp=dest.with_suffix('.tmp')
    subprocess.run(['curl','-fsSL','--retry','2','--max-time','240',url(station),'-o',str(tmp)],check=True)
    if not tmp.read_bytes().startswith(b'station,valid,'): raise ValueError(tmp.read_text()[:300])
    tmp.replace(dest)
    print(station,flush=True)
if __name__=='__main__':
    ROOT.mkdir(exist_ok=True)
    with ThreadPoolExecutor(3) as pool: list(pool.map(fetch,STATIONS))
