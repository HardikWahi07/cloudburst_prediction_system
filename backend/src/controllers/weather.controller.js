import {
  getBatchWeatherData,
  getWeatherData,
} from "../services/weather.service.js";

export const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined || lat === "" || lon === "") {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const latitude = typeof lat === "string" && lat.trim() ? Number(lat) : NaN;
    const longitude = typeof lon === "string" && lon.trim() ? Number(lon) : NaN;

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

export const getBatchWeather = async (req, res) => {
  try {
    let locations = [];
    if (req.method === "POST" && Array.isArray(req.body?.locations)) {
      locations = req.body.locations;
    } else if (typeof req.query.coords === "string") {
      locations = req.query.coords
        .split(";")
        .map((pair, idx) => {
          const [lat, lon] = pair.split(",").map(Number);
          return { id: `loc-${idx}`, latitude: lat, longitude: lon };
        })
        .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude));
    }

    if (locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Locations array or coords query required",
      });
    }

    const results = await getBatchWeatherData(locations);

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Batch Weather Controller Error:", error.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch batch weather data",
    });
  }
};