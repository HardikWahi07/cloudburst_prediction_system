// ICON global ensemble hourly rain accumulations, aligned to the app's IST clock.
export function summarizeEnsemble(hourly, issueTime) {
  const hours = hourly?.time;
  const issue = Date.parse(issueTime + '+05:30');
  if (!Array.isArray(hours) || !Number.isFinite(issue)) return null;
  const start = hours.findIndex(time => time > issueTime);
  const endTimes = hours.slice(start, start + 3);
  if (start < 0 || endTimes.length !== 3) return null;
  const firstEnd = Date.parse(endTimes[0] + '+05:30');
  if (!(firstEnd > issue && firstEnd <= issue + 3600000)) return null;
  if (!endTimes.every((time, i) => Date.parse(time + '+05:30') === firstEnd + i * 3600000)) return null;
  let exceeding = 0;
  for (let member = 0; member < 40; member++) {
    const key = member === 0 ? 'rain' : 'rain_member' + String(member).padStart(2, '0');
    const rain = hourly[key]?.slice(start, start + 3);
    if (rain?.length !== 3 || !rain.every(mm => Number.isFinite(mm) && mm >= 0)) return null;
    if (Math.max(...rain) >= 100) exceeding++;
  }
  return { exceeding, members: 40, endTimes, thresholdMm: 100 };
}

export async function getCloudburstEnsemble(latitude, longitude, issueTime) {
  const url = new URL('https://ensemble-api.open-meteo.com/v1/ensemble');
  url.search = new URLSearchParams({ latitude, longitude, models: 'icon_global', hourly: 'rain', timezone: 'Asia/Kolkata', forecast_days: '2' });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    return summarizeEnsemble((await response.json()).hourly, issueTime);
  } catch {
    return null;
  }
}
