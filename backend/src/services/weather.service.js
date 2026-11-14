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
  if (level === "High") {
    return {
      status: "Emergency Reservoir & Grid Alert",
      action:
        "Alert upstream hydro control rooms, initiate controlled spillway pre-release, inspect silt-flushing gates, and prepare 220/400 kV substation islanding.",
    };
  }
  if (level === "Watch") {
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

const getRisk = (current, hourly) => {
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

  // Multi-parameter meteorological risk index (0–100) combining rainfall intensity,
  // moisture saturation, convective instability (CAPE), and barometric pressure drop.
  const rainPoints = Math.min(25, (rain ?? 0) * 3.5);
  const forecastPoints = Math.min(40, (peakRain ?? 0) * 2.5);
  const humidityPoints =
    humidity >= 92 ? 12 : humidity >= 85 ? 8 : humidity >= 75 ? 4 : 0;
  const dewSpreadPoints =
    dewPointSpread !== null && dewPointSpread <= 1.5
      ? 8
      : dewPointSpread !== null && dewPointSpread <= 3
        ? 4
        : 0;
  const capePoints =
    peakCape !== null && peakCape >= 1500
      ? 10
      : peakCape !== null && peakCape >= 800
        ? 6
        : peakCape !== null && peakCape >= 300
          ? 2
          : 0;
  const pressurePoints =
    pressureDrop3h !== null && pressureDrop3h >= 2.5
      ? 5
      : pressureDrop3h !== null && pressureDrop3h >= 1.2
        ? 3
        : 0;

  const score = Math.min(
    100,
    Math.round(
      rainPoints +
        forecastPoints +
        humidityPoints +
        dewSpreadPoints +
        capePoints +
        pressurePoints,
    ),
  );
  const level = score >= 60 ? "High" : score >= 25 ? "Watch" : "Low";
  const observedOrPeak = Math.max(rain ?? 0, peakRain ?? 0);

  return {
    level,
    score,
    imdTier: getImdRainfallTier(observedOrPeak),
    pressureDrop3h,
    dewPointSpread,
    peakCape,
    peakRain3h: peakRain,
    powerAdvisory: getPowerAdvisory(level),
    reason: `Rain: ${Number.isFinite(rain) ? `${rain} mm` : "N/A"}; 3h peak forecast: ${peakRain === null ? "N/A" : `${peakRain} mm`}; humidity: ${Number.isFinite(humidity) ? `${humidity}%` : "N/A"}; CAPE: ${peakCape === null ? "N/A" : `${Math.round(peakCape)} J/kg`}; 3h pressure drop: ${pressureDrop3h === null ? "N/A" : `${pressureDrop3h} hPa`}.`,
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

const formatSingleWeather = (data, fallbackLat, fallbackLon) => {
  const { current, hourly } = data || {};
  if (!current || !hourly || !Array.isArray(hourly.time)) {
    throw new Error("Weather API returned an incomplete forecast");
  }

  const latitude = Number.isFinite(data.latitude) ? data.latitude : fallbackLat;
  const longitude = Number.isFinite(data.longitude) ? data.longitude : fallbackLon;

  const dewPoint = Number.isFinite(current.dew_point_2m) ? current.dew_point_2m : null;
  const temperature = Number.isFinite(current.temperature_2m) ? current.temperature_2m : null;

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
  };

  return {
    ...weather,
    risk: getRisk(weather.current, weather.hourly),
    summary: getForecastSummary(weather.current, weather.hourly),
  };
};

export const getWeatherData = async (latitude, longitude) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,pressure_msl,cloud_cover,wind_speed_10m,cape",
    forecast_days: "2",
    timezone: "auto",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();
  return formatSingleWeather(data, latitude, longitude);
};

export const getBatchWeatherData = async (locations) => {
  if (!Array.isArray(locations) || locations.length === 0) return [];

  const targets = locations.slice(0, 60);
  const lats = targets.map((l) => Number(l.latitude).toFixed(4)).join(",");
  const lons = targets.map((l) => Number(l.longitude).toFixed(4)).join(",");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lats,
    longitude: lons,
    current:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,pressure_msl,cloud_cover,wind_speed_10m,cape",
    forecast_days: "2",
    timezone: "auto",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Weather API batch error: ${response.status}`);
  }

  const raw = await response.json();
  const dataList = Array.isArray(raw) ? raw : [raw];

  return targets
    .map((loc, idx) => {
      const item = dataList[idx];
      if (!item) return null;
      try {
        const weather = formatSingleWeather(item, loc.latitude, loc.longitude);
        return {
          id: loc.id || `city-${idx}`,
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
};
