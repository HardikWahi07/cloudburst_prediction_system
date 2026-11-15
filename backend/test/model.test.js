import test from 'node:test';
import assert from 'node:assert/strict';
import { getMlPrediction } from '../src/services/ml.service.js';
import { getWeatherData } from '../src/services/weather.service.js';

test('missing model inputs return unavailable', async () => {
  assert.equal((await getMlPrediction({ humidity: 90 })).status, 'unavailable');
});
test('missing precipitation never means low risk', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ok:true,json:async()=>({current:{time:'2024-01-01T12:00'},hourly:{time:['2024-01-01T13:00'],precipitation:[null],precipitation_probability:[null]}})});
  try {
    const result = await getWeatherData(30,78);
    assert.equal(result.risk.level,'Unavailable');
    assert.equal(result.risk.score,null);
    assert.equal(result.prediction.status,'unavailable');
  } finally { globalThis.fetch=original; }
});
test('rainfall artifact cannot supply cloudburst probability', async () => {
  const promise = getMlPrediction({temperature:20,humidity:80,pressure:1010,precipitation:2,windSpeed:10,cloudCover:70});
  assert.ok(promise instanceof Promise);
  const result=await promise;
  assert.equal(result.status,'unavailable');
  assert.equal(typeof result.gaugePilot.matchesEventClass,'boolean');
  assert.equal(typeof result.regionalGauge.matchesEventClass,'boolean');
  assert.ok(result.regionalGauge.stations.includes('ISP'));
  assert.ok(result.gaugePilot.outsideRange.includes('temperature_2m'));
  assert.equal(result.cloudburstProbability,null);
  assert.equal(result.task,'verified_cloudburst_occurrence_next_3h');
});
test('inference consumes completed hourly inputs rather than current accumulation', async () => {
  const original=globalThis.fetch;
  const time=['2024-01-01T12:00','2024-01-01T13:00','2024-01-01T14:00','2024-01-01T15:00'];
  const hourly={time,temperature_2m:[20,20,20,20],relative_humidity_2m:[80,80,80,80],pressure_msl:[1010,1010,1010,1010],precipitation:[2,3,4,5],wind_speed_10m:[10,10,10,10],cloud_cover:[70,70,70,70],precipitation_probability:[50,50,50,50]};
  globalThis.fetch=async()=>({ok:true,json:async()=>({current:{time:'2024-01-01T12:15',rain:0,relative_humidity_2m:80,precipitation:null},hourly})});
  try {
    const result=await getWeatherData(30,78);
    assert.equal(result.prediction.status,'unavailable');
    assert.equal(result.prediction.issueTime,'2024-01-01T12:00');
    const direct=await getMlPrediction({temperature:20,humidity:80,pressure:1010,precipitation:2,windSpeed:10,cloudCover:70});
    assert.equal(result.prediction.task,direct.task);
    assert.equal(result.prediction.cloudburstProbability,null);
  } finally { globalThis.fetch=original; }
});
