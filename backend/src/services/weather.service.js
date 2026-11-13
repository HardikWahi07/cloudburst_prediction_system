const getRisk = (current, hourly) => {
  // Open-Meteo returns local timestamps and hourly precipitation for the preceding hour.
  const nextHour = hourly.time.findIndex((time) => time > current.time);
  const upcoming = nextHour === -1
    ? []
    : hourly.precipitation.slice(nextHour, nextHour + 3).filter(Number.isFinite);
  const peak = upcoming.length ? Math.max(...upcoming) : null;
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

export const getWeatherData = async (latitude, longitude) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,rain,pressure_msl,cloud_cover,wind_speed_10m",
    hourly:
      "precipitation,precipitation_probability,relative_humidity_2m",
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

  const weather = {
    location: {
      latitude,
      longitude,
    },
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      pressure: data.current.pressure_msl,
      cloudCover: data.current.cloud_cover,
      windSpeed: data.current.wind_speed_10m,
    },
    hourly: {
      time: data.hourly.time,
      precipitation: data.hourly.precipitation,
      precipitationProbability:
        data.hourly.precipitation_probability,
      humidity: data.hourly.relative_humidity_2m,
    },
  };

  return { ...weather, risk: getRisk(weather.current, weather.hourly) };
};
