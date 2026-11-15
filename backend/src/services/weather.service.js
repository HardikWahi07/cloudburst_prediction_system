import { getCloudburstEnsemble } from './cloudburst-ensemble.js';
import { getMlPrediction } from "./ml.service.js";

const getMeasurement = (value, min, max = Infinity) =>
  Number.isFinite(value) && value >= min && value <= max ? value : null;

const getRisk = (current, hourly) => {
  // Open-Meteo returns local timestamps and hourly precipitation for the preceding hour.
  const nextHour = hourly.time.findIndex((time) => time > current.time);
  const upcoming = nextHour === -1
    ? []
    : hourly.precipitation.slice(nextHour, nextHour + 3).filter(Number.isFinite);
  const peak = upcoming.length ? Math.max(...upcoming) : null;
  if (upcoming.length !== 3 || !Number.isFinite(current.rain) || !Number.isFinite(current.humidity)) {
    return { level: 'Unavailable', score: null, reason: 'Insufficient current or upcoming rainfall measurements.' };
  }
  const rain = current.rain;
  const humidity = current.humidity;

  // Heuristic points (0–100), not a probability or an official warning.
  const rainPoints = Math.min(25, (rain ?? 0) * 5);
  const humidityPoints = humidity >= 90 ? 15 : humidity >= 80 ? 8 : 0;
  const forecastPoints = Math.min(60, (peak ?? 0) * 4);
  const score = Math.round(rainPoints + humidityPoints + forecastPoints);

  return {
    level: score >= 60 ? "High" : score >= 25 ? "Watch" : "Low",
    score,
    reason: `Current rain: ${Number.isFinite(rain) ? `${rain} mm` : "unavailable"}; humidity: ${Number.isFinite(humidity) ? `${humidity}%` : "unavailable"}; peak in the next three forecast hours: ${peak === null ? "unavailable" : `${peak} mm`}.`,
  };
};

const getForecastSummary = (current, hourly) => {
  const summary = { peakPrecipitationMm: null, peakTime: null, maxProbability: null };

  hourly.time.forEach((time, index) => {
    if (time <= current.time) return;

    const precipitation = hourly.precipitation[index];
    const probability = hourly.precipitationProbability[index];

    if (
      Number.isFinite(precipitation) &&
      (summary.peakPrecipitationMm === null || precipitation > summary.peakPrecipitationMm)
    ) {
      summary.peakPrecipitationMm = precipitation;
      summary.peakTime = time;
    }

    if (
      Number.isFinite(probability) &&
      (summary.maxProbability === null || probability > summary.maxProbability)
    ) {
      summary.maxProbability = probability;
    }
  });

  return summary;
};

export const getWeatherData = async (latitude, longitude) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,pressure_msl,precipitation,wind_speed_10m,cloud_cover,precipitation_probability",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  const { current, hourly } = data;
  if (
    typeof current?.time !== "string" ||
    !Array.isArray(hourly?.time) ||
    !Array.isArray(hourly.precipitation) ||
    !Array.isArray(hourly.precipitation_probability)
  ) {
    throw new Error("Weather API returned an incomplete forecast");
  }

  const weather = {
    location: {
      latitude,
      longitude,
    },
    current: {
      time: current.time,
      temperature: getMeasurement(current.temperature_2m, -90, 65),
      humidity: getMeasurement(current.relative_humidity_2m, 0, 100),
      precipitation: getMeasurement(current.precipitation, 0),
      rain: getMeasurement(current.rain, 0),
      pressure: getMeasurement(current.pressure_msl, 800, 1100),
      cloudCover: getMeasurement(current.cloud_cover, 0, 100),
      windSpeed: getMeasurement(current.wind_speed_10m, 0),
    },
    hourly: {
      time: hourly.time,
      precipitation: hourly.precipitation.map((value) => getMeasurement(value, 0)),
      precipitationProbability: hourly.precipitation_probability.map(
        (value) => getMeasurement(value, 0, 100),
      ),
      humidity: hourly.relative_humidity_2m,
    },
  };

  // Use the latest completed hourly record for the hourly-trained model.
  // Current precipitation has a shorter accumulation and must not be substituted.
  const issueIndex = hourly.time.findLastIndex((time) => time <= current.time);
  const at = (key) => issueIndex < 0 ? null : hourly[key]?.[issueIndex];
  const modelMeasurements = {
    temperature: at('temperature_2m'), humidity: at('relative_humidity_2m'),
    pressure: at('pressure_msl'), precipitation: at('precipitation'),
    windSpeed: at('wind_speed_10m'), cloudCover: at('cloud_cover'),
  };
  const [prediction, cloudburstEnsemble] = await Promise.all([
    getMlPrediction(modelMeasurements),
    getCloudburstEnsemble(latitude, longitude, current.time),
  ]);
  prediction.issueTime = issueIndex < 0 ? null : hourly.time[issueIndex];

  return {
    ...weather,
    risk: getRisk(weather.current, weather.hourly),
    summary: getForecastSummary(weather.current, weather.hourly),
    prediction,
    cloudburstEnsemble,
  };
};
