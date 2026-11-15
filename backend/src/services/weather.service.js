import {
  normalizeCurrentObservation,
  normalizeHourlyTimeseries,
  normalizeHumidity,
  normalizePressure,
  normalizeRainfall,
  normalizeTemperature,
  normalizeWind,
} from "./meteorology.normalizer.js";
import { evaluateProbabilisticRisk } from "./probabilisticRisk.service.js";
import { resilientFetchJson, weatherCache } from "./resilientFetch.js";
import { evaluateLocationAlert } from "./alertEngine.service.js";

const getMeasurement = (value, min, max = Infinity) =>
  Number.isFinite(value) && value >= min && value <= max ? value : null;

const getPressureDrop3h = (current, hourly) => {
  const currentIdx = hourly.time.findIndex((time) => time >= current.time);
  const idx = currentIdx === -1 ? hourly.time.length - 1 : currentIdx;
  if (idx < 3) return null;

  const pNow = hourly.pressure[idx];
  const pPrev = hourly.pressure[idx - 3];
  if (!Number.isFinite(pNow) || !Number.isFinite(pPrev)) return null;
  return Number((pPrev - pNow).toFixed(1));
};

const getImdRainfallTier = (hourlyPeakMm) => {
  if (!Number.isFinite(hourlyPeakMm)) return "Data Unavailable";
  if (hourlyPeakMm >= 100) return "Cloudburst Threshold (>=100 mm/h)";
  if (hourlyPeakMm >= 64.5) return "Very Heavy Rain (64.5-99.9 mm/h)";
  if (hourlyPeakMm >= 15.6) return "Heavy Rain (15.6-64.4 mm/h)";
  if (hourlyPeakMm >= 2.5) return "Moderate Rain (2.5-15.5 mm/h)";
  if (hourlyPeakMm > 0) return "Light Rain (<2.5 mm/h)";
  return "Dry / Trace";
};

const getPowerAdvisory = (level) => {
  if (level === "Critical") {
    return {
      status: "Emergency Spillway & Grid Islanding Directive",
      action:
        "CRITICAL CLOUDBURST ALERT: Immediately alert downstream civil defense, open emergency spillway gates, halt turbine intake to prevent severe silt erosion, and isolate vulnerable 400kV substations.",
    };
  }
  if (level === "High") {
    return {
      status: "Emergency Reservoir & Grid Alert",
      action:
        "Alert upstream hydro control rooms, initiate controlled spillway pre-release, inspect silt-flushing gates, and prepare 220/400 kV substation islanding.",
    };
  }
  if (level === "Moderate" || level === "Watch") {
    return {
      status: "Elevated Hydrological Watch",
      action:
        "Notify dam safety engineers and local IMD center, verify telemetry redundancy on intake weirs, and stage standby spillway crews.",
    };
  }
  return {
    status: "Normal Grid Operations",
    action:
      "Continue standard generation schedules and routine 3-hour meteorological bulletin logging.",
  };
};

const getRisk = (current, hourly, options = {}) => {
  // Open-Meteo returns local timestamps and hourly precipitation for the preceding hour.
  const nextHour = hourly.time.findIndex((time) => time > current.time);
  const upcomingRain = nextHour === -1
    ? []
    : hourly.precipitation.slice(nextHour, nextHour + 3).filter(Number.isFinite);
  const upcomingCape = nextHour === -1
    ? []
    : hourly.cape.slice(nextHour, nextHour + 3).filter(Number.isFinite);

  const peakRain = upcomingRain.length ? Math.max(...upcomingRain) : null;
  const peakCape = upcomingCape.length ? Math.max(...upcomingCape) : null;
  const rain = current.rain;
  const humidity = current.humidity;
  const dewPointSpread =
    Number.isFinite(current.temperature) && Number.isFinite(current.dewPoint)
      ? Number((current.temperature - current.dewPoint).toFixed(1))
      : null;
  const pressureDrop3h = getPressureDrop3h(current, hourly);

  const probRisk = evaluateProbabilisticRisk(
    {
      rain,
      peakRain3h: peakRain,
      humidity,
      pressureDrop3h,
      dewPointSpread,
      cape: peakCape,
      windGust: current.windGust,
      elevation: current.elevation,
      timestamp: current.time,
    },
    options,
  );

  const observedOrPeak = Math.max(rain ?? 0, peakRain ?? 0);
  const level = probRisk.category; // "Low" | "Moderate" | "High" | "Critical"

  return {
    level,
    category: probRisk.category,
    score: Math.round(probRisk.probability * 100),
    probability: probRisk.probability,
    probabilityPercentage: probRisk.probabilityPercentage,
    alertCode: probRisk.alertCode,
    confidence: probRisk.confidence,
    freshness: probRisk.freshness,
    thresholds: probRisk.thresholds,
    imdTier: getImdRainfallTier(observedOrPeak),
    pressureDrop3h,
    dewPointSpread,
    peakCape,
    peakRain3h: peakRain,
    powerAdvisory: getPowerAdvisory(level),
    probabilistic: probRisk,
    reason: `Rain: ${Number.isFinite(rain) ? `${rain} mm` : "N/A"}; 3h peak forecast: ${peakRain === null ? "N/A" : `${peakRain} mm`}; humidity: ${Number.isFinite(humidity) ? `${humidity}%` : "N/A"}; CAPE: ${peakCape === null ? "N/A" : `${Math.round(peakCape)} J/kg`}; 3h pressure drop: ${pressureDrop3h === null ? "N/A" : `${pressureDrop3h} hPa`}; Calibrated Prob: ${probRisk.probabilityPercentage}% (${level}).`,
  };
};

const getForecastSummary = (current, hourly) => {
  const summary = {
    peakPrecipitationMm: null,
    peakTime: null,
    maxProbability: null,
    maxCape: null,
    totalForecastRainMm: 0,
  };

  hourly.time.forEach((time, index) => {
    if (time <= current.time) return;

    const precipitation = hourly.precipitation[index];
    const probability = hourly.precipitationProbability[index];
    const cape = hourly.cape[index];

    if (Number.isFinite(precipitation)) {
      summary.totalForecastRainMm = Number(
        (summary.totalForecastRainMm + precipitation).toFixed(1),
      );
      if (
        summary.peakPrecipitationMm === null ||
        precipitation > summary.peakPrecipitationMm
      ) {
        summary.peakPrecipitationMm = precipitation;
        summary.peakTime = time;
      }
    }

    if (
      Number.isFinite(probability) &&
      (summary.maxProbability === null || probability > summary.maxProbability)
    ) {
      summary.maxProbability = probability;
    }

    if (
      Number.isFinite(cape) &&
      (summary.maxCape === null || cape > summary.maxCape)
    ) {
      summary.maxCape = Math.round(cape);
    }
  });

  return summary;
};

const formatSingleWeather = (data, fallbackLat, fallbackLon, provenance = null, options = {}) => {
  const { current, hourly } = data || {};
  if (!current || !hourly || !Array.isArray(hourly.time)) {
    throw new Error("Weather API returned an incomplete forecast");
  }

  const latitude = Number.isFinite(data.latitude) ? data.latitude : fallbackLat;
  const longitude = Number.isFinite(data.longitude) ? data.longitude : fallbackLon;

  const dewPoint = Number.isFinite(current.dew_point_2m) ? current.dew_point_2m : null;
  const temperature = Number.isFinite(current.temperature_2m) ? current.temperature_2m : null;
  const pressureDrop3h = getPressureDrop3h(
    { time: current.time },
    {
      time: hourly.time,
      pressure: Array.isArray(hourly.pressure_msl) ? hourly.pressure_msl : [],
    }
  );

  // Normalized multi-unit sub-objects
  const normalizedCurrent = normalizeCurrentObservation(current, pressureDrop3h);
  const normalizedHourly = normalizeHourlyTimeseries(hourly);

  const weather = {
    location: {
      latitude,
      longitude,
      elevation: Number.isFinite(data.elevation) ? Math.round(data.elevation) : null,
      timezone: data.timezone || "UTC",
      timezoneAbbreviation: data.timezone_abbreviation || "Local",
      utcOffsetSeconds: Number.isFinite(data.utc_offset_seconds)
        ? data.utc_offset_seconds
        : 0,
    },
    current: {
      time: current.time,
      temperature,
      dewPoint,
      dewPointSpread:
        temperature !== null && dewPoint !== null
          ? Number((temperature - dewPoint).toFixed(1))
          : null,
      humidity: getMeasurement(current.relative_humidity_2m, 0, 100),
      precipitation: getMeasurement(current.precipitation, 0),
      rain: getMeasurement(current.rain, 0),
      pressure: Number.isFinite(current.pressure_msl) ? current.pressure_msl : null,
      cloudCover: getMeasurement(current.cloud_cover, 0, 100),
      windSpeed: getMeasurement(current.wind_speed_10m, 0),
      windGusts: getMeasurement(current.wind_gusts_10m, 0),
    },
    hourly: {
      time: hourly.time,
      temperature: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [],
      precipitation: Array.isArray(hourly.precipitation)
        ? hourly.precipitation.map((value) => getMeasurement(value, 0))
        : [],
      precipitationProbability: Array.isArray(hourly.precipitation_probability)
        ? hourly.precipitation_probability.map((value) => getMeasurement(value, 0, 100))
        : [],
      humidity: Array.isArray(hourly.relative_humidity_2m) ? hourly.relative_humidity_2m : [],
      pressure: Array.isArray(hourly.pressure_msl) ? hourly.pressure_msl : [],
      windSpeed: Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : [],
      cape: Array.isArray(hourly.cape)
        ? hourly.cape.map((value) => getMeasurement(value, 0))
        : [],
    },
    // Enhanced normalized meteorological models
    normalized: {
      current: normalizedCurrent,
      hourly: normalizedHourly,
    },
    // Ingestion provenance & source timestamps
    ingestion: provenance || {
      source: "Open-Meteo",
      ingestedAt: new Date().toISOString(),
      sourceTimestamp: current.time,
      cached: false,
    },
  };

  // 1. Daily Rainfall & Forecast Model
  const daily = data.daily || {};
  const dailyData = {
    time: Array.isArray(daily.time) ? daily.time : [],
    precipitationSum: Array.isArray(daily.precipitation_sum)
      ? daily.precipitation_sum.map((v) => getMeasurement(v, 0))
      : [],
    precipitationHours: Array.isArray(daily.precipitation_hours)
      ? daily.precipitation_hours.map((v) => getMeasurement(v, 0))
      : [],
    precipitationProbabilityMax: Array.isArray(daily.precipitation_probability_max)
      ? daily.precipitation_probability_max.map((v) => getMeasurement(v, 0, 100))
      : [],
    temperatureMax: Array.isArray(daily.temperature_2m_max)
      ? daily.temperature_2m_max
      : [],
    temperatureMin: Array.isArray(daily.temperature_2m_min)
      ? daily.temperature_2m_min
      : [],
    windSpeedMax: Array.isArray(daily.wind_speed_10m_max)
      ? daily.wind_speed_10m_max.map((v) => getMeasurement(v, 0))
      : [],
  };

  // 2. Historical versus Forecast Comparison Analytics
  const currentIdx = hourly.time ? hourly.time.findIndex((t) => t >= current.time) : -1;
  const pivotIdx = currentIdx === -1 ? (hourly.time?.length || 0) - 1 : currentIdx;

  // Past 24 hours (observed)
  const past24StartIdx = Math.max(0, pivotIdx - 24);
  const past24Precip = hourly.precipitation?.slice(past24StartIdx, pivotIdx) || [];
  const past24Cape = hourly.cape?.slice(past24StartIdx, pivotIdx) || [];
  const past24Accum = Number(past24Precip.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0).toFixed(1));
  const past24PeakRate = past24Precip.length ? Number(Math.max(...past24Precip.filter(Number.isFinite), 0).toFixed(1)) : 0;
  const past24AvgCape = past24Cape.length ? Math.round(past24Cape.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0) / (past24Cape.length || 1)) : 0;
  const past24RainyHours = past24Precip.filter((v) => v > 0.1).length;

  // Next 24 hours (forecast)
  const next24EndIdx = Math.min(hourly.time?.length || 0, pivotIdx + 24);
  const next24Precip = hourly.precipitation?.slice(pivotIdx, next24EndIdx) || [];
  const next24Prob = hourly.precipitationProbability?.slice(pivotIdx, next24EndIdx) || [];
  const next24Cape = hourly.cape?.slice(pivotIdx, next24EndIdx) || [];
  const next24Accum = Number(next24Precip.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0).toFixed(1));
  const next24PeakRate = next24Precip.length ? Number(Math.max(...next24Precip.filter(Number.isFinite), 0).toFixed(1)) : 0;
  const next24MaxProb = next24Prob.length ? Math.max(...next24Prob.filter(Number.isFinite), 0) : 0;
  const next24MaxCape = next24Cape.length ? Math.round(Math.max(...next24Cape.filter(Number.isFinite), 0)) : 0;
  const next24RainyHours = next24Precip.filter((v) => v > 0.1).length;

  const rainDeltaMm = Number((next24Accum - past24Accum).toFixed(1));
  const rainDeltaPct = past24Accum > 0 ? Math.round(((next24Accum - past24Accum) / past24Accum) * 100) : (next24Accum > 0 ? 100 : 0);
  const intensityTrend =
    next24Accum >= 30 && next24Accum >= past24Accum * 1.5
      ? "SURGING"
      : next24Accum > past24Accum + 5
      ? "INTENSIFYING"
      : next24Accum < past24Accum - 5
      ? "SUBSIDING"
      : "STABLE";

  const convectiveTrend =
    next24MaxCape >= 1200 && next24MaxCape > past24AvgCape * 1.3
      ? "ESCALATING"
      : next24MaxCape >= 600
      ? "ELEVATED"
      : "NORMAL";

  const historicalVsForecast = {
    observedPast24h: {
      accumRainMm: past24Accum,
      peakRainRateMmH: past24PeakRate,
      avgCape: past24AvgCape,
      rainyHours: past24RainyHours,
      periodLabel: "Past 24 Hours (Observed)",
    },
    forecastNext24h: {
      accumRainMm: next24Accum,
      peakRainRateMmH: next24PeakRate,
      maxProbability: next24MaxProb,
      maxCape: next24MaxCape,
      rainyHours: next24RainyHours,
      periodLabel: "Next 24 Hours (Forecast)",
    },
    delta: {
      rainDeltaMm,
      rainDeltaPercent: rainDeltaPct,
      intensityTrend,
      convectiveTrend,
      summaryText:
        intensityTrend === "SURGING"
          ? `Significant rainfall surge forecasted (+${rainDeltaMm} mm / +${rainDeltaPct}% vs past 24h). Convective energy ${convectiveTrend.toLowerCase()}.`
          : intensityTrend === "INTENSIFYING"
          ? `Precipitation accumulating higher than recent baseline (+${rainDeltaMm} mm vs past 24h).`
          : intensityTrend === "SUBSIDING"
          ? `Precipitation tapering off (${rainDeltaMm} mm vs past 24h).`
          : `Precipitation patterns remaining stable relative to past 24 hours (${rainDeltaMm >= 0 ? "+" : ""}${rainDeltaMm} mm).`,
    },
  };

  const risk = getRisk(weather.current, weather.hourly, options);
  const locationMeta = {
    id: options.locationId || options.id || `loc-${Number(latitude).toFixed(2)}-${Number(longitude).toFixed(2)}`,
    name: options.name || options.locationName || `Monitoring Station (${Number(latitude).toFixed(2)}, ${Number(longitude).toFixed(2)})`,
    state: options.state || options.region || "Indian Himalayan Region",
    district: options.district || options.state,
    latitude,
    longitude,
    elevationM: current.elevation ?? null,
    basin: options.basin || "Regional Catchment Basin",
    powerAsset: options.powerAsset || "Hydropower Grid",
  };

  // 3. Location-Specific Weather Summaries
  const elevationVal = Number(data.elevation || current.elevation || locationMeta.elevationM || 0);
  const altitudeZone =
    elevationVal >= 3000
      ? "High-Altitude Glaciated Alpine Zone (>3000m AMSL)"
      : elevationVal >= 1800
      ? "Mid-Himalayan Ridge & Orographic Escarpment (1800–3000m AMSL)"
      : elevationVal >= 800
      ? "Lower Himalayan Valley & Foothills (800–1800m AMSL)"
      : "Sub-Himalayan Riverine Catchment (<800m AMSL)";

  const locationSummary = {
    stationName: locationMeta.name,
    state: locationMeta.state,
    basin: locationMeta.basin,
    elevationM: elevationVal,
    altitudeZone,
    criticalPowerAsset: locationMeta.powerAsset,
    metAgency: options.metAgency || "IMD Meteorological Centre",
    synopsis: `${locationMeta.name} is situated in the ${altitudeZone} within the ${locationMeta.basin}. Currently recording ${weather.current.precipitation ?? 0} mm/h rainfall with ${weather.current.humidity ?? 50}% relative humidity at ${weather.current.temperature ?? 15}°C. Next 24h rainfall is projected at ${next24Accum} mm (${intensityTrend.toLowerCase()}) with peak rain rate of ${next24PeakRate} mm/h. Critical hydropower infrastructure: ${locationMeta.powerAsset}.`,
    orographicVulnerability:
      elevationVal >= 2500
        ? "High vulnerability to localized cloudburst cloud condensation and moraine debris mobilization."
        : "Moderate vulnerability to sudden valley flash flooding and siltation load.",
    actionableBriefing: risk.powerAdvisory.action,
  };

  // 4. Live Data Freshness Indicators
  const nowMs = Date.now();
  const obsTimeMs = new Date(current.time || provenance?.sourceTimestamp || nowMs).getTime();
  const latencyMinutes = Math.max(0, Math.round((nowMs - obsTimeMs) / 60000));
  const freshnessStatus = latencyMinutes <= 15 ? "REAL_TIME" : latencyMinutes <= 60 ? "RECENT" : "STALE";

  const liveFreshness = {
    status: freshnessStatus,
    label:
      freshnessStatus === "REAL_TIME"
        ? "Real-Time Telemetry (Live)"
        : freshnessStatus === "RECENT"
        ? "Recent Sensor Ingestion"
        : "Stale Feed (>1 hr latency)",
    ageMinutes: latencyMinutes,
    relativeAgeText: latencyMinutes <= 1 ? "Just now" : `${latencyMinutes} minutes ago`,
    sourceTimestamp: current.time,
    ingestedAt: provenance?.ingestedAt || new Date().toISOString(),
    isCached: !!provenance?.cached,
    cacheAgeSeconds: provenance?.cacheAgeMs ? Math.round(provenance.cacheAgeMs / 1000) : 0,
    provider: "Open-Meteo High-Resolution Numerical Model (ECMWF IFS / DWD ICON / GFS)",
    upstreamStatus: "HEALTHY",
  };

  const earlyWarningAlert = evaluateLocationAlert(locationMeta, {
    rainRate: weather.current.rain,
    rainAccum3h: risk.peakRain3h,
    pressureDrop3h: risk.pressureDrop3h,
    cape: risk.peakCape,
    humidity: weather.current.humidity,
    dewPointSpread: risk.dewPointSpread,
    probabilisticScore: risk.probability,
  }, options);

  return {
    ...weather,
    daily: dailyData,
    historicalVsForecast,
    locationSummary,
    liveFreshness,
    risk,
    earlyWarningAlert,
    summary: getForecastSummary(weather.current, weather.hourly),
  };
};

/**
 * Ingests live forecast and recent historical observation data with retries, timeouts, and caching
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} options Options: pastDays (default 1), forecastDays (default 2), forceRefresh
 * @returns {Promise<object>} Complete normalized meteorological record
 */
export const getWeatherData = async (latitude, longitude, options = {}) => {
  const pastDays = Math.min(7, Math.max(0, Number(options.pastDays ?? 2)));
  const forecastDays = Math.min(7, Math.max(1, Number(options.forecastDays ?? 5)));

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,pressure_msl,cloud_cover,wind_speed_10m,cape",
    daily:
      "precipitation_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,temperature_2m_max,temperature_2m_min",
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
    timezone: "auto",
  }).toString();

  const cacheKey = `forecast:${Number(latitude).toFixed(3)}:${Number(longitude).toFixed(3)}:p${pastDays}:f${forecastDays}`;

  const { data, provenance } = await resilientFetchJson(
    url,
    {},
    {
      cacheKey: options.forceRefresh ? null : cacheKey,
      ttlMs: 4 * 60 * 1000, // 4-minute cache
      retries: 3,
      timeoutMs: 12000,
    }
  );

  return formatSingleWeather(data, latitude, longitude, provenance, options);
};

/**
 * Ingests historical reanalysis/archive meteorological data for a geographical point
 * Integrates Open-Meteo Historical Archive API: https://archive-api.open-meteo.com/v1/archive
 * @param {number} latitude Latitude (-90 to 90)
 * @param {number} longitude Longitude (-180 to 180)
 * @param {string} startDate Format YYYY-MM-DD
 * @param {string} endDate Format YYYY-MM-DD
 * @returns {Promise<object>} Normalized historical series and deluge indicators
 */
export const getHistoricalWeatherData = async (
  latitude,
  longitude,
  startDate,
  endDate,
  options = {}
) => {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    hourly:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,pressure_msl,wind_speed_10m,wind_gusts_10m",
    daily: "precipitation_sum,precipitation_hours,wind_speed_10m_max",
    timezone: "auto",
  }).toString();

  const cacheKey = `archive:${Number(latitude).toFixed(3)}:${Number(longitude).toFixed(3)}:${startDate}:${endDate}`;

  const { data, provenance } = await resilientFetchJson(
    url,
    {},
    {
      cacheKey: options.forceRefresh ? null : cacheKey,
      ttlMs: 24 * 60 * 60 * 1000, // 24-hour cache for immutable historical data
      retries: 3,
      timeoutMs: 15000,
    }
  );

  const hourly = data?.hourly || {};
  const daily = data?.daily || {};
  const normalizedHourly = normalizeHourlyTimeseries(hourly);

  // Compute historical cloudburst indicators
  const hourlyPrecip = normalizedHourly.precipitationMm;
  const peakHourlyRain = hourlyPrecip.length ? Math.max(...hourlyPrecip) : 0;
  const totalRain = hourlyPrecip.reduce((acc, v) => acc + (v || 0), 0);
  const cloudburstEpisodes = hourlyPrecip.filter((v) => v >= 100).length;

  return {
    location: {
      latitude: data.latitude ?? latitude,
      longitude: data.longitude ?? longitude,
      elevation: data.elevation ?? null,
      timezone: data.timezone || "UTC",
    },
    interval: {
      startDate,
      endDate,
      totalHours: normalizedHourly.timestamps.length,
    },
    metrics: {
      totalPrecipitationMm: Number(totalRain.toFixed(1)),
      peakHourlyRainMm: Number(peakHourlyRain.toFixed(1)),
      cloudburstEpisodesCount: cloudburstEpisodes,
      exceededCloudburstThreshold: peakHourlyRain >= 100,
      imdClassification: getImdRainfallTier(peakHourlyRain),
    },
    daily: {
      time: daily.time || [],
      precipitationSum: daily.precipitation_sum || [],
      precipitationHours: daily.precipitation_hours || [],
      maxWindSpeedKmh: daily.wind_speed_10m_max || [],
    },
    hourly: normalizedHourly,
    ingestion: provenance,
  };
};

/**
 * Ingests batch weather data across multiple worldwide locations simultaneously
 * Chunks queries into batches of up to 50 locations per request with parallel fetching and caching
 * @param {Array<object>} locations Array of { latitude, longitude, ... }
 * @returns {Promise<Array<object>>} Array of normalized weather & risk snapshots
 */
export const getBatchWeatherData = async (locations) => {
  if (!Array.isArray(locations) || locations.length === 0) return [];

  // Support up to 350 world stations in parallel chunked queries
  const targets = locations.slice(0, 350);
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    chunks.push(targets.slice(i, i + CHUNK_SIZE));
  }

  const chunkPromises = chunks.map(async (chunk) => {
    try {
      const lats = chunk.map((l) => Number(l.latitude).toFixed(4)).join(",");
      const lons = chunk.map((l) => Number(l.longitude).toFixed(4)).join(",");

      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: lats,
        longitude: lons,
        current:
          "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m,wind_gusts_10m",
        hourly:
          "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,pressure_msl,cloud_cover,wind_speed_10m,cape",
        past_days: "1",
        forecast_days: "2",
        timezone: "auto",
      }).toString();

      // Chunk cache key based on hashed first and last coordinate
      const firstLoc = chunk[0];
      const lastLoc = chunk[chunk.length - 1];
      const chunkCacheKey = `batch:${firstLoc.latitude.toFixed(2)},${firstLoc.longitude.toFixed(2)}:${lastLoc.latitude.toFixed(2)},${lastLoc.longitude.toFixed(2)}:n${chunk.length}`;

      const { data, provenance } = await resilientFetchJson(
        url,
        {},
        {
          cacheKey: chunkCacheKey,
          ttlMs: 3 * 60 * 1000, // 3-minute batch cache
          retries: 3,
          timeoutMs: 15000,
        }
      );

      const dataList = Array.isArray(data) ? data : [data];

      return chunk
        .map((loc, idx) => {
          const item = dataList[idx];
          if (!item) return null;
          try {
            const weather = formatSingleWeather(item, loc.latitude, loc.longitude, provenance);
            return {
              id: loc.id || `city-${loc.name}-${loc.latitude}`,
              name: loc.name,
              state: loc.state,
              country: loc.country,
              countryCode: loc.countryCode,
              elevationM: loc.elevationM,
              basin: loc.basin,
              powerAsset: loc.powerAsset,
              metAgency: loc.metAgency,
              population: loc.population,
              ...weather,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  });

  const results = await Promise.allSettled(chunkPromises);
  return results
    .filter((r) => r.status === "fulfilled" && Array.isArray(r.value))
    .flatMap((r) => r.value);
};

export { weatherCache };
