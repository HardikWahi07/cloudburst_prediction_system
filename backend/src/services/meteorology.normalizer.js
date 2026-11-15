/**
 * Meteorological Data Normalizer
 * Normalizes, validates, and standardizes weather telemetry for cloudburst prediction:
 * - Rainfall (mm/h, accumulation, IMD hazard tiers, cloudburst threshold)
 * - Humidity (relative humidity %, moisture saturation state, dew point depression)
 * - Temperature (Celsius, Fahrenheit, Kelvin, boundary checks)
 * - Wind (speed in km/h & m/s, gusts, Beaufort scale, cardinal direction)
 * - Pressure (hPa/mbar, inHg, mmHg, 3h barometric drop trend & convective trigger)
 */

// Cardinal compass points corresponding to 16-wind compass rose
const CARDINAL_DIRECTIONS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW"
];

// Beaufort wind scale classification
const BEAUFORT_TABLE = [
  { maxKmh: 1, scale: 0, desc: "Calm", effect: "Smoke rises vertically." },
  { maxKmh: 5, scale: 1, desc: "Light Air", effect: "Smoke drift indicates wind direction." },
  { maxKmh: 11, scale: 2, desc: "Light Breeze", effect: "Leaves rustle; wind felt on face." },
  { maxKmh: 19, scale: 3, desc: "Gentle Breeze", effect: "Leaves & twigs in constant motion." },
  { maxKmh: 28, scale: 4, desc: "Moderate Breeze", effect: "Dust and loose paper raised; small branches move." },
  { maxKmh: 38, scale: 5, desc: "Fresh Breeze", effect: "Small trees begin to sway." },
  { maxKmh: 49, scale: 6, desc: "Strong Breeze", effect: "Large branches in motion; whistling in telegraph wires." },
  { maxKmh: 61, scale: 7, desc: "High Wind / Moderate Gale", effect: "Whole trees in motion; resistance walking against wind." },
  { maxKmh: 74, scale: 8, desc: "Gale", effect: "Twigs break off trees; progress impeded." },
  { maxKmh: 88, scale: 9, desc: "Strong Gale", effect: "Slight structural damage occurs (roof slates blow off)." },
  { maxKmh: 102, scale: 10, desc: "Storm", effect: "Trees uprooted; considerable structural damage." },
  { maxKmh: 117, scale: 11, desc: "Violent Storm", effect: "Widespread severe damage." },
  { maxKmh: Infinity, scale: 12, desc: "Hurricane Force", effect: "Devastation." },
];

/**
 * Normalizes temperature measurement across international units
 * @param {number|null} tempC Temperature in Celsius
 * @returns {object} Normalized temperature representation
 */
export function normalizeTemperature(tempC) {
  if (!Number.isFinite(tempC) || tempC < -90 || tempC > 65) {
    return {
      celsius: null,
      fahrenheit: null,
      kelvin: null,
      state: "unknown",
      isValid: false,
    };
  }

  const c = Number(tempC.toFixed(1));
  const f = Number(((c * 9) / 5 + 32).toFixed(1));
  const k = Number((c + 273.15).toFixed(2));

  let state = "mild";
  if (c <= 0) state = "freezing";
  else if (c <= 12) state = "cold";
  else if (c <= 22) state = "mild";
  else if (c <= 32) state = "warm";
  else state = "hot";

  return {
    celsius: c,
    fahrenheit: f,
    kelvin: k,
    state,
    isValid: true,
  };
}

/**
 * Normalizes rainfall/precipitation rate and classifies IMD cloudburst criteria
 * Cloudburst threshold: >= 100 mm/h over a geographical area (~20-30 sq km)
 * @param {number|null} rainMm Rainfall rate in mm or mm/h
 * @returns {object} Normalized rainfall object
 */
export function normalizeRainfall(rainMm) {
  if (!Number.isFinite(rainMm) || rainMm < 0) {
    return {
      mmPerHour: 0,
      inchesPerHour: 0,
      category: "Dry / Trace",
      tierCode: "DRY",
      isCloudburst: false,
      isSevereHazard: false,
      isValid: false,
    };
  }

  const mm = Number(Math.max(0, rainMm).toFixed(2));
  const inches = Number((mm / 25.4).toFixed(3));

  let category = "Dry / Trace";
  let tierCode = "DRY";
  let isCloudburst = false;
  let isSevereHazard = false;

  if (mm >= 100) {
    category = "Cloudburst Threshold (>=100 mm/h)";
    tierCode = "CLOUDBURST";
    isCloudburst = true;
    isSevereHazard = true;
  } else if (mm >= 64.5) {
    category = "Very Heavy Rain (64.5-99.9 mm/h)";
    tierCode = "VERY_HEAVY";
    isSevereHazard = true;
  } else if (mm >= 15.6) {
    category = "Heavy Rain (15.6-64.4 mm/h)";
    tierCode = "HEAVY";
  } else if (mm >= 2.5) {
    category = "Moderate Rain (2.5-15.5 mm/h)";
    tierCode = "MODERATE";
  } else if (mm > 0) {
    category = "Light Rain (<2.5 mm/h)";
    tierCode = "LIGHT";
  }

  return {
    mmPerHour: mm,
    inchesPerHour: inches,
    category,
    tierCode,
    isCloudburst,
    isSevereHazard,
    isValid: true,
  };
}

/**
 * Normalizes relative humidity percentage and calculates saturation index
 * @param {number|null} rh Relative humidity [0, 100]
 * @returns {object} Normalized humidity object
 */
export function normalizeHumidity(rh) {
  if (!Number.isFinite(rh)) {
    return {
      percentage: null,
      saturationState: "unknown",
      isCriticalSaturation: false,
      isValid: false,
    };
  }

  const clamped = Number(Math.min(100, Math.max(0, rh)).toFixed(1));

  let saturationState = "moderate";
  let isCriticalSaturation = false;

  if (clamped >= 95) {
    saturationState = "Near-Saturation (Critical Cloudburst Vulnerability)";
    isCriticalSaturation = true;
  } else if (clamped >= 85) {
    saturationState = "Very High Moisture";
    isCriticalSaturation = true;
  } else if (clamped >= 70) {
    saturationState = "High Moisture";
  } else if (clamped >= 40) {
    saturationState = "Moderate";
  } else {
    saturationState = "Dry";
  }

  return {
    percentage: clamped,
    saturationState,
    isCriticalSaturation,
    isValid: true,
  };
}

/**
 * Normalizes wind telemetry into m/s, km/h, knots, and Beaufort scale
 * @param {number|null} speedKmh Wind speed in km/h
 * @param {number|null} gustsKmh Wind gusts in km/h
 * @param {number|null} directionDeg Direction in degrees [0, 360)
 * @returns {object} Normalized wind object
 */
export function normalizeWind(speedKmh, gustsKmh = null, directionDeg = null) {
  const validSpeed = Number.isFinite(speedKmh) && speedKmh >= 0;
  const sKmh = validSpeed ? Number(speedKmh.toFixed(1)) : 0;
  const sMs = Number((sKmh / 3.6).toFixed(1));
  const sKnots = Number((sKmh / 1.852).toFixed(1));

  const validGusts = Number.isFinite(gustsKmh) && gustsKmh >= 0;
  const gKmh = validGusts ? Number(gustsKmh.toFixed(1)) : null;
  const gMs = validGusts ? Number((gustsKmh / 3.6).toFixed(1)) : null;

  // Cardinal direction
  let cardinal = "VRB"; // Variable
  let deg = null;
  if (Number.isFinite(directionDeg)) {
    deg = ((directionDeg % 360) + 360) % 360;
    const idx = Math.round(deg / 22.5) % 16;
    cardinal = CARDINAL_DIRECTIONS[idx] || "N";
  }

  // Beaufort scale calculation
  const beaufort = BEAUFORT_TABLE.find((b) => sKmh <= b.maxKmh) || BEAUFORT_TABLE[0];

  return {
    speedKmh: sKmh,
    speedMs: sMs,
    speedKnots: sKnots,
    gustsKmh: gKmh,
    gustsMs: gMs,
    directionDegrees: deg,
    cardinalDirection: cardinal,
    beaufortScale: beaufort.scale,
    beaufortDescription: beaufort.desc,
    beaufortEffect: beaufort.effect,
    isValid: validSpeed,
  };
}

/**
 * Normalizes atmospheric pressure and evaluates 3-hour barometric drop trend
 * Rapid 3h drop >= 2.0-3.0 hPa indicates severe convective atmospheric destabilization
 * @param {number|null} pressureHpa Atmospheric pressure at sea level in hPa/mbar
 * @param {number|null} drop3h 3-hour pressure drop (p_prev - p_now) in hPa
 * @returns {object} Normalized barometric pressure object
 */
export function normalizePressure(pressureHpa, drop3h = null) {
  if (!Number.isFinite(pressureHpa) || pressureHpa < 800 || pressureHpa > 1100) {
    return {
      hPa: null,
      inHg: null,
      mmHg: null,
      pressureDrop3h: null,
      trend: "Unknown",
      isConvectiveDestabilization: false,
      isValid: false,
    };
  }

  const hPa = Number(pressureHpa.toFixed(1));
  const inHg = Number((hPa * 0.02953).toFixed(2));
  const mmHg = Number((hPa * 0.750062).toFixed(1));

  let trend = "Steady";
  let isConvectiveDestabilization = false;

  if (Number.isFinite(drop3h)) {
    const d = Number(drop3h.toFixed(1));
    if (d >= 3.0) {
      trend = "Rapid Fall (Severe Convective Destabilization)";
      isConvectiveDestabilization = true;
    } else if (d >= 1.5) {
      trend = "Moderate Fall (Approaching Storm System)";
      isConvectiveDestabilization = true;
    } else if (d <= -1.5) {
      trend = "Rising (Atmospheric Stabilization)";
    } else {
      trend = "Steady";
    }
  }

  return {
    hPa,
    inHg,
    mmHg,
    pressureDrop3h: Number.isFinite(drop3h) ? Number(drop3h.toFixed(1)) : null,
    trend,
    isConvectiveDestabilization,
    isValid: true,
  };
}

/**
 * Normalizes a full meteorological observation snapshot (current conditions)
 * @param {object} rawCurrent Raw current conditions from Open-Meteo
 * @param {number|null} pressureDrop3h Calculated 3-hour pressure drop
 * @returns {object} Standardized, multi-unit meteorological record
 */
export function normalizeCurrentObservation(rawCurrent, pressureDrop3h = null) {
  if (!rawCurrent) return null;

  const tempNorm = normalizeTemperature(rawCurrent.temperature_2m);
  const rainRate = rawCurrent.rain ?? rawCurrent.precipitation ?? 0;
  const rainNorm = normalizeRainfall(rainRate);
  const humidityNorm = normalizeHumidity(rawCurrent.relative_humidity_2m);
  const windNorm = normalizeWind(
    rawCurrent.wind_speed_10m,
    rawCurrent.wind_gusts_10m,
    rawCurrent.wind_direction_10m
  );
  const pressureNorm = normalizePressure(rawCurrent.pressure_msl, pressureDrop3h);

  // Dew point spread (temperature - dew point)
  let dewPointSpread = null;
  if (
    Number.isFinite(rawCurrent.temperature_2m) &&
    Number.isFinite(rawCurrent.dew_point_2m)
  ) {
    dewPointSpread = Number(
      (rawCurrent.temperature_2m - rawCurrent.dew_point_2m).toFixed(1)
    );
  }

  return {
    observedAt: rawCurrent.time,
    temperature: tempNorm,
    rainfall: rainNorm,
    humidity: humidityNorm,
    wind: windNorm,
    pressure: pressureNorm,
    dewPointSpreadC: dewPointSpread,
    cloudCoverPercent: Number.isFinite(rawCurrent.cloud_cover)
      ? Math.min(100, Math.max(0, rawCurrent.cloud_cover))
      : null,
  };
}

/**
 * Normalizes an hourly forecast or historical timeseries array
 * @param {object} rawHourly Raw hourly object from Open-Meteo
 * @returns {object} Standardized hourly arrays with guaranteed alignment
 */
export function normalizeHourlyTimeseries(rawHourly) {
  if (!rawHourly || !Array.isArray(rawHourly.time)) {
    return {
      timestamps: [],
      temperatureC: [],
      precipitationMm: [],
      precipitationProbability: [],
      humidityPercent: [],
      pressureHpa: [],
      windSpeedKmh: [],
      capeJkg: [],
    };
  }

  const times = rawHourly.time;
  const length = times.length;

  const getArray = (src) => (Array.isArray(src) ? src : new Array(length).fill(null));

  const temps = getArray(rawHourly.temperature_2m);
  const precips = getArray(rawHourly.precipitation);
  const probs = getArray(rawHourly.precipitation_probability);
  const humids = getArray(rawHourly.relative_humidity_2m);
  const pressures = getArray(rawHourly.pressure_msl);
  const winds = getArray(rawHourly.wind_speed_10m);
  const capes = getArray(rawHourly.cape);

  return {
    timestamps: times,
    temperatureC: temps.map((v) => (Number.isFinite(v) ? Number(v.toFixed(1)) : null)),
    precipitationMm: precips.map((v) =>
      Number.isFinite(v) ? Number(Math.max(0, v).toFixed(1)) : 0
    ),
    precipitationProbability: probs.map((v) =>
      Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0
    ),
    humidityPercent: humids.map((v) =>
      Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null
    ),
    pressureHpa: pressures.map((v) =>
      Number.isFinite(v) ? Number(v.toFixed(1)) : null
    ),
    windSpeedKmh: winds.map((v) =>
      Number.isFinite(v) ? Number(Math.max(0, v).toFixed(1)) : 0
    ),
    capeJkg: capes.map((v) =>
      Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0
    ),
  };
}

