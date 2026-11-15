import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const python = process.env.ML_PYTHON_PATH || path.join(root, '.venv/bin/python');
const script = path.join(root, 'ml_engine/predict.py');
const inFlight = new Map();
const unavailable = (message) => ({ status: 'unavailable', task: 'verified_cloudburst_occurrence_next_3h', cloudburstProbability: null, message });

export async function getMlPrediction(current) {
  const keys = ['temperature', 'humidity', 'pressure', 'precipitation', 'windSpeed', 'cloudCover'];
  if (keys.some((key) => !Number.isFinite(current?.[key]))) {
    return unavailable('Complete current weather measurements are required for ML inference');
  }
  const input = JSON.stringify(Object.fromEntries(keys.map((key) => [key, current[key]])));
  if (inFlight.has(input)) return inFlight.get(input);
  if (inFlight.size >= 2) return unavailable('ML capacity reached; retry shortly');
  const task = (async () => {
    try {
      const { stdout } = await run(python, [script, input], {
        cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
        env: { ...process.env, OMP_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1', LOKY_MAX_CPU_COUNT: '1' },
      });
      const result = JSON.parse(stdout);
      if (result.status === 'unavailable' && typeof result.gaugePilot?.matchesEventClass === 'boolean' &&
          Array.isArray(result.gaugePilot.outsideRange) && result.cloudburstProbability === null) {
        return { ...unavailable(result.message), gaugePilot: result.gaugePilot, regionalGauge: result.regionalGauge };
      }
      if (result.status !== 'success') return unavailable(result.message || 'ML model unavailable');
      if (result.task !== 'verified_cloudburst_occurrence_next_3h' ||
          !['Low', 'High'].includes(result.riskLevel) ||
          !Number.isFinite(result.cloudburstProbability) || result.cloudburstProbability < 0 || result.cloudburstProbability > 1 ||
          !Number.isFinite(result.decisionThreshold) || result.decisionThreshold <= 0 || result.decisionThreshold > 1 ||
          result.riskLevel !== (result.cloudburstProbability >= result.decisionThreshold ? 'High' : 'Low')) {
        return unavailable('Invalid model response');
      }
      return result;
    } catch {
      return unavailable('ML inference unavailable or timed out');
    }
  })();
  inFlight.set(input, task);
  try { return await task; } finally { inFlight.delete(input); }
}
