import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEnsemble } from '../src/services/cloudburst-ensemble.js';

test('counts each crossing member once and rejects missing hours and incomplete members', () => {
  const hourly = { time: ['2026-11-15T01:00','2026-11-15T02:00','2026-11-15T03:00'], rain: [100,102,0] };
  for (let i = 1; i < 40; i++) hourly['rain_member' + String(i).padStart(2,'0')] = [0,0,99];
  const issue = '2026-11-15T00:15';
  assert.equal(summarizeEnsemble(hourly, issue).exceeding, 1);
  assert.equal(summarizeEnsemble(hourly, '2026-11-14T20:00'), null);
  hourly.rain_member39[0] = null;
  assert.equal(summarizeEnsemble(hourly, issue), null);
});
