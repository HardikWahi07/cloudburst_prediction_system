/**
 * Historical Rainfall Analytics Engine
 * Provides multi-horizon accumulation analysis, rolling intensity acceleration,
 * extreme-value hydrological statistics, and robust missing-data imputation.
 */

import { getHistoricalWeatherData, getWeatherData } from "./weather.service.js";

/**
 * Handles missing data in rainfall timeseries:
 * - Detects nulls, NaNs, and negative readings
 * - Applies linear interpolation for small gaps (<= 2 consecutive hours)
 * - Applies conservative zero-fill for long missing blocks
 * - Produces data quality assessment (completeness index & gap metrics)
 * 
 * @param {Array<string>} timestamps Hourly ISO timestamps
 * @param {Array<number|null>} values Raw hourly rainfall measurements in mm
 * @returns {object} { cleanedValues, imputedFlags, quality }
 */
export function cleanAndImputeTimeseries(timestamps, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      cleanedValues: [],
      imputedFlags: [],
      quality: {
        totalReadings: 0,
        validReadings: 0,
        missingReadings: 0,
        imputedReadings: 0,
        completenessPercent: 0,
        longestGapHours: 0,
        qualityGrade: "N/A",
      },
    };
  }

  const n = values.length;
  const cleaned = new Array(n);
  const imputed = new Array(n).fill(false);

  let validCount = 0;
  let missingCount = 0;
  let imputedCount = 0;
  let maxGap = 0;
  let currentGap = 0;

  // First pass: identify missing values
  for (let i = 0; i < n; i += 1) {
    const val = values[i];
    if (Number.isFinite(val) && val >= 0) {
      cleaned[i] = Number(val.toFixed(2));
      validCount += 1;
      if (currentGap > maxGap) maxGap = currentGap;
      currentGap = 0;
    } else {
      cleaned[i] = null;
      missingCount += 1;
      currentGap += 1;
    }
  }
  if (currentGap > maxGap) maxGap = currentGap;

  // Second pass: linear interpolation for small gaps (<= 2 hours)
  let i = 0;
  while (i < n) {
    if (cleaned[i] === null) {
      const gapStart = i;
      while (i < n && cleaned[i] === null) {
        i += 1;
      }
      const gapEnd = i; // first non-null index or n
      const gapLength = gapEnd - gapStart;

      const prevVal = gapStart > 0 ? cleaned[gapStart - 1] : null;
      const nextVal = gapEnd < n ? cleaned[gapEnd] : null;

      if (gapLength <= 2 && prevVal !== null && nextVal !== null) {
        // Linear interpolation: y = y0 + (y1 - y0) * (k / (gapLength + 1))
        for (let k = 1; k <= gapLength; k += 1) {
          const interpVal = prevVal + ((nextVal - prevVal) * k) / (gapLength + 1);
          cleaned[gapStart + k - 1] = Number(Math.max(0, interpVal).toFixed(2));
          imputed[gapStart + k - 1] = true;
          imputedCount += 1;
        }
      } else {
        // Zero-fill trace assumptions for edge or large gaps
        for (let k = gapStart; k < gapEnd; k += 1) {
          cleaned[k] = 0.0;
          imputed[k] = true;
          imputedCount += 1;
        }
      }
    } else {
      i += 1;
    }
  }

  const completeness = Number(((validCount / n) * 100).toFixed(1));
  let qualityGrade = "A (Excellent)";
  if (completeness < 75) qualityGrade = "D (Degraded)";
  else if (completeness < 90) qualityGrade = "C (Moderate)";
  else if (completeness < 98) qualityGrade = "B (Good)";

  return {
    cleanedValues: cleaned,
    imputedFlags: imputed,
    quality: {
      totalReadings: n,
      validReadings: validCount,
      missingReadings: missingCount,
      imputedReadings: imputedCount,
      completenessPercent: completeness,
      longestGapHours: maxGap,
      qualityGrade,
    },
  };
}

/**
 * Computes 1-hour, 3-hour, 6-hour, and 24-hour rainfall accumulations
 * Both rolling timeseries and final window totals are calculated
 * 
 * @param {Array<number>} values Cleaned rainfall values in mm
 * @returns {object} Accumulation series and current totals
 */
export function computeAccumulations(values) {
  const n = values.length;
  const rolling1h = new Array(n);
  const rolling3h = new Array(n);
  const rolling6h = new Array(n);
  const rolling24h = new Array(n);

  for (let i = 0; i < n; i += 1) {
    rolling1h[i] = Number(values[i].toFixed(1));

    // 3-hour accumulation: sum of values[i-2 .. i]
    let sum3 = 0;
    const start3 = Math.max(0, i - 2);
    for (let k = start3; k <= i; k += 1) sum3 += values[k];
    rolling3h[i] = Number(sum3.toFixed(1));

    // 6-hour accumulation: sum of values[i-5 .. i]
    let sum6 = 0;
    const start6 = Math.max(0, i - 5);
    for (let k = start6; k <= i; k += 1) sum6 += values[k];
    rolling6h[i] = Number(sum6.toFixed(1));

    // 24-hour accumulation: sum of values[i-23 .. i]
    let sum24 = 0;
    const start24 = Math.max(0, i - 23);
    for (let k = start24; k <= i; k += 1) sum24 += values[k];
    rolling24h[i] = Number(sum24.toFixed(1));
  }

  const lastIdx = Math.max(0, n - 1);
  return {
    timeseries: {
      rolling1h,
      rolling3h,
      rolling6h,
      rolling24h,
    },
    latest: {
      accumulation1hMm: n > 0 ? rolling1h[lastIdx] : 0,
      accumulation3hMm: n > 0 ? rolling3h[lastIdx] : 0,
      accumulation6hMm: n > 0 ? rolling6h[lastIdx] : 0,
      accumulation24hMm: n > 0 ? rolling24h[lastIdx] : 0,
      totalAccumulationMm: Number(values.reduce((acc, v) => acc + v, 0).toFixed(1)),
    },
  };
}

/**
 * Computes rolling rainfall intensity dynamics:
 * - 3-hour moving average intensity rate (mm/h)
 * - Rate of acceleration ΔR/Δt (mm/h per hour) to detect sudden convective bursts
 * - Flash surge detection triggers (ΔR >= 15 mm/h^2)
 * 
 * @param {Array<number>} values Cleaned rainfall values
 * @returns {object} Rolling intensity telemetry
 */
export function computeRollingIntensity(values) {
  const n = values.length;
  const movingAvg3h = new Array(n);
  const acceleration = new Array(n);
  const flashSurgeFlags = new Array(n);

  for (let i = 0; i < n; i += 1) {
    // 3-hour moving average
    const start = Math.max(0, i - 2);
    const count = i - start + 1;
    let sum = 0;
    for (let k = start; k <= i; k += 1) sum += values[k];
    movingAvg3h[i] = Number((sum / count).toFixed(2));

    // Acceleration ΔR = R(t) - R(t-1)
    const prev = i > 0 ? values[i - 1] : 0;
    const accel = Number((values[i] - prev).toFixed(2));
    acceleration[i] = accel;

    // Flash surge trigger: acceleration >= 15 mm/h or rate >= 30 mm/h
    flashSurgeFlags[i] = accel >= 15.0 || values[i] >= 30.0;
  }

  // Count detected flash surges
  const totalSurges = flashSurgeFlags.filter(Boolean).length;
  const peakIntensityRate = n > 0 ? Math.max(...values) : 0;
  const peakAcceleration = n > 0 ? Math.max(...acceleration) : 0;

  return {
    movingAverage3h: movingAvg3h,
    acceleration: acceleration,
    flashSurgeFlags: flashSurgeFlags,
    peakIntensityMmH: Number(peakIntensityRate.toFixed(1)),
    peakAccelerationMmH2: Number(peakAcceleration.toFixed(1)),
    totalFlashSurgesDetected: totalSurges,
    hasSevereConvectiveBurst: peakIntensityRate >= 64.5 || peakAcceleration >= 25.0,
  };
}

/**
 * Calculates percentile from an unsorted array of numbers
 */
function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2));
}

/**
 * Computes comprehensive extreme-rainfall statistics:
 * - Peak 1h, 3h, 6h, and 24h deluges with exact time windows
 * - Rain spell durations (continuous precipitation spells)
 * - Frequency distribution across IMD intensity tiers
 * - Statistical percentiles (P50, P75, P90, P95, P99)
 * - Cloudburst events catalog (>= 100 mm/h)
 * 
 * @param {Array<string>} timestamps ISO timestamps
 * @param {Array<number>} values Cleaned rainfall values
 * @param {object} accumulations Result from computeAccumulations
 * @returns {object} Extreme statistics summary
 */
export function computeExtremeStatistics(timestamps, values, accumulations) {
  const n = values.length;
  if (n === 0) {
    return {
      peakDeluges: {},
      spells: {},
      frequencyDistribution: {},
      percentiles: {},
      cloudburstEpisodes: [],
    };
  }

  const { rolling1h, rolling3h, rolling6h, rolling24h } = accumulations.timeseries;

  // 1. Peak Deluges with exact timestamps
  let max1h = { value: 0, timestamp: timestamps[0] || null };
  let max3h = { value: 0, startTimestamp: null, endTimestamp: null };
  let max6h = { value: 0, startTimestamp: null, endTimestamp: null };
  let max24h = { value: 0, startTimestamp: null, endTimestamp: null };

  for (let i = 0; i < n; i += 1) {
    if (rolling1h[i] > max1h.value) {
      max1h = { value: rolling1h[i], timestamp: timestamps[i] };
    }
    if (rolling3h[i] > max3h.value) {
      const startIdx = Math.max(0, i - 2);
      max3h = {
        value: rolling3h[i],
        startTimestamp: timestamps[startIdx],
        endTimestamp: timestamps[i],
      };
    }
    if (rolling6h[i] > max6h.value) {
      const startIdx = Math.max(0, i - 5);
      max6h = {
        value: rolling6h[i],
        startTimestamp: timestamps[startIdx],
        endTimestamp: timestamps[i],
      };
    }
    if (rolling24h[i] > max24h.value) {
      const startIdx = Math.max(0, i - 23);
      max24h = {
        value: rolling24h[i],
        startTimestamp: timestamps[startIdx],
        endTimestamp: timestamps[i],
      };
    }
  }

  // 2. Frequency distribution across IMD tiers
  const distribution = {
    dry: 0, // 0 mm
    light: 0, // 0.1 - 2.4 mm
    moderate: 0, // 2.5 - 15.5 mm
    heavy: 0, // 15.6 - 64.4 mm
    veryHeavy: 0, // 64.5 - 99.9 mm
    cloudburst: 0, // >= 100 mm
  };

  const cloudburstEpisodes = [];
  let inCloudburst = false;
  let currentEpisode = null;

  for (let i = 0; i < n; i += 1) {
    const r = values[i];
    if (r === 0) distribution.dry += 1;
    else if (r < 2.5) distribution.light += 1;
    else if (r < 15.6) distribution.moderate += 1;
    else if (r < 64.5) distribution.heavy += 1;
    else if (r < 100.0) distribution.veryHeavy += 1;
    else distribution.cloudburst += 1;

    // Track cloudburst episodes
    if (r >= 100.0) {
      if (!inCloudburst) {
        inCloudburst = true;
        currentEpisode = {
          startTime: timestamps[i],
          endTime: timestamps[i],
          durationHours: 1,
          peakRateMmH: r,
          totalRainfallMm: r,
        };
      } else {
        currentEpisode.endTime = timestamps[i];
        currentEpisode.durationHours += 1;
        currentEpisode.totalRainfallMm += r;
        if (r > currentEpisode.peakRateMmH) currentEpisode.peakRateMmH = r;
      }
    } else if (inCloudburst) {
      inCloudburst = false;
      currentEpisode.totalRainfallMm = Number(currentEpisode.totalRainfallMm.toFixed(1));
      cloudburstEpisodes.push(currentEpisode);
      currentEpisode = null;
    }
  }
  if (inCloudburst && currentEpisode) {
    currentEpisode.totalRainfallMm = Number(currentEpisode.totalRainfallMm.toFixed(1));
    cloudburstEpisodes.push(currentEpisode);
  }

  // 3. Continuous spells
  let maxWetSpell = 0;
  let currentWetSpell = 0;
  let maxDrySpell = 0;
  let currentDrySpell = 0;
  let totalWetHours = 0;

  for (let i = 0; i < n; i += 1) {
    if (values[i] > 0) {
      totalWetHours += 1;
      currentWetSpell += 1;
      if (currentDrySpell > maxDrySpell) maxDrySpell = currentDrySpell;
      currentDrySpell = 0;
    } else {
      currentDrySpell += 1;
      if (currentWetSpell > maxWetSpell) maxWetSpell = currentWetSpell;
      currentWetSpell = 0;
    }
  }
  if (currentWetSpell > maxWetSpell) maxWetSpell = currentWetSpell;
  if (currentDrySpell > maxDrySpell) maxDrySpell = currentDrySpell;

  // 4. Statistical percentiles
  const wetValues = values.filter((v) => v > 0);
  const p50 = calculatePercentile(values, 50);
  const p75 = calculatePercentile(values, 75);
  const p90 = calculatePercentile(values, 90);
  const p95 = calculatePercentile(values, 95);
  const p99 = calculatePercentile(values, 99);
  const wetP95 = calculatePercentile(wetValues, 95);

  const meanAll = Number((values.reduce((a, b) => a + b, 0) / n).toFixed(2));
  const meanWet = wetValues.length > 0
    ? Number((wetValues.reduce((a, b) => a + b, 0) / wetValues.length).toFixed(2))
    : 0;

  return {
    peakDeluges: {
      peak1h: {
        rateMmH: max1h.value,
        timestamp: max1h.timestamp,
        isCloudburstThreshold: max1h.value >= 100.0,
      },
      peak3h: {
        accumulationMm: max3h.value,
        startTimestamp: max3h.startTimestamp,
        endTimestamp: max3h.endTimestamp,
      },
      peak6h: {
        accumulationMm: max6h.value,
        startTimestamp: max6h.startTimestamp,
        endTimestamp: max6h.endTimestamp,
      },
      peak24h: {
        accumulationMm: max24h.value,
        startTimestamp: max24h.startTimestamp,
        endTimestamp: max24h.endTimestamp,
      },
    },
    spells: {
      totalHours: n,
      wetHours: totalWetHours,
      dryHours: n - totalWetHours,
      maxContinuousRainSpellHours: maxWetSpell,
      maxContinuousDrySpellHours: maxDrySpell,
      wetHourPercentage: Number(((totalWetHours / n) * 100).toFixed(1)),
    },
    frequencyDistribution: distribution,
    percentiles: {
      allHours: { p50, p75, p90, p95, p99, meanMm: meanAll },
      wetHoursOnly: { meanMm: meanWet, p95: wetP95, count: wetValues.length },
    },
    cloudburstEpisodes: {
      totalEpisodes: cloudburstEpisodes.length,
      hasHistoricalCloudburst: cloudburstEpisodes.length > 0,
      episodes: cloudburstEpisodes,
    },
  };
}

/**
 * Master analytics runner for an arbitrary rainfall timeseries
 * @param {Array<string>} timestamps Array of ISO timestamps
 * @param {Array<number|null>} rawValues Array of hourly precipitation in mm
 * @returns {object} Complete historical rainfall analytics dossier
 */
export function analyzeRainfallSeries(timestamps, rawValues) {
  // 1. Missing data cleaning & linear interpolation
  const { cleanedValues, imputedFlags, quality } = cleanAndImputeTimeseries(
    timestamps,
    rawValues
  );

  // 2. Accumulations across multiple sliding windows
  const accumulations = computeAccumulations(cleanedValues);

  // 3. Rolling intensity & convective acceleration
  const intensity = computeRollingIntensity(cleanedValues);

  // 4. Extreme-value statistics & cloudburst detection
  const extremes = computeExtremeStatistics(timestamps, cleanedValues, accumulations);

  return {
    dataQuality: quality,
    accumulations: {
      latest: accumulations.latest,
      series: accumulations.timeseries,
    },
    intensityDynamics: {
      peakIntensityMmH: intensity.peakIntensityMmH,
      peakAccelerationMmH2: intensity.peakAccelerationMmH2,
      totalFlashSurgesDetected: intensity.totalFlashSurgesDetected,
      hasSevereConvectiveBurst: intensity.hasSevereConvectiveBurst,
      movingAverage3h: intensity.movingAverage3h,
      acceleration: intensity.acceleration,
    },
    extremeStatistics: extremes,
    timeseries: {
      timestamps,
      observedRainMm: rawValues,
      cleanedRainMm: cleanedValues,
      imputed: imputedFlags,
    },
  };
}

/**
 * End-to-end station analytics: Ingests weather/historical data and runs analytics pipeline
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} options { pastDays, startDate, endDate, forecastDays }
 * @returns {Promise<object>}
 */
export async function analyzeStationRainfall(latitude, longitude, options = {}) {
  const { startDate, endDate, pastDays = 3, forecastDays = 2 } = options;

  let rawHourlyData = null;
  let mode = "forecast_and_recent_observations";

  if (startDate && endDate) {
    // 1. Ingest from Historical Archive API
    mode = "historical_archive";
    const historical = await getHistoricalWeatherData(latitude, longitude, startDate, endDate);
    rawHourlyData = {
      time: historical.hourly.timestamps,
      precipitation: historical.hourly.precipitationMm,
    };
  } else {
    // 2. Ingest from Forecast + Past Observations API
    const weather = await getWeatherData(latitude, longitude, {
      pastDays,
      forecastDays,
    });
    rawHourlyData = {
      time: weather.hourly.time,
      precipitation: weather.hourly.precipitation,
    };
  }

  const analysis = analyzeRainfallSeries(
    rawHourlyData.time || [],
    rawHourlyData.precipitation || []
  );

  return {
    location: {
      latitude,
      longitude,
    },
    mode,
    interval: {
      startTime: rawHourlyData.time?.[0] || null,
      endTime: rawHourlyData.time?.[rawHourlyData.time.length - 1] || null,
      totalHours: rawHourlyData.time?.length || 0,
    },
    ...analysis,
  };
}
