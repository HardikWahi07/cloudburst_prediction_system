import { getWeatherData } from "../services/weather.service.js";

export const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined || lat === "" || lon === "") {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    const weather = await getWeatherData(latitude, longitude);

    return res.status(200).json({
      success: true,
      ...weather,
    });
  } catch (error) {
    console.error("Weather Controller Error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Failed to fetch weather data",
    });
  }
};