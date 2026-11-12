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

  return {
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
};