import {
  analyzeRainfallSeries,
  analyzeStationRainfall,
} from "../services/rainfallAnalytics.service.js";
import {
  getBatchWeatherData,
  getHistoricalWeatherData,
  getWeatherData,
  weatherCache,
} from "../services/weather.service.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getWeather = async (req, res) => {
  try {
    const { lat, lon, pastDays, past_days, refresh } = req.query;

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

    const pastDaysNum = Number.parseInt(String(pastDays ?? past_days ?? "1"), 10);
    const forceRefresh = refresh === "true" || refresh === "1";

    const weather = await getWeatherData(latitude, longitude, {
      pastDays: Number.isFinite(pastDaysNum) ? pastDaysNum : 1,
      forceRefresh,
    });

    return res.status(200).json({
      success: true,
      ...weather,
    });
  } catch (error) {
    console.error("Weather Controller Error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Failed to fetch weather data",
      error: error.message,
    });
  }
};

export const getHistoricalWeather = async (req, res) => {
  try {
    const { lat, lon, startDate, start_date, endDate, end_date, refresh } = req.query;

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

    const start = String(startDate ?? start_date ?? "").trim();
    const end = String(endDate ?? end_date ?? "").trim();

    if (!DATE_REGEX.test(start) || !DATE_REGEX.test(end)) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required in YYYY-MM-DD format (e.g. startDate=2024-07-01&endDate=2024-07-07)",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "startDate must be earlier than or equal to endDate",
      });
    }

    const forceRefresh = refresh === "true" || refresh === "1";
    const data = await getHistoricalWeatherData(latitude, longitude, start, end, {
      forceRefresh,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Historical Weather Controller Error:", error.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch historical weather data",
      error: error.message,
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
      cacheStats: weatherCache.getStats(),
      results,
    });
  } catch (error) {
    console.error("Batch Weather Controller Error:", error.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch batch weather data",
      error: error.message,
    });
  }
};

export const getRainfallAnalytics = async (req, res) => {
  try {
    // 1. Direct timeseries payload via POST
    if (req.method === "POST" && Array.isArray(req.body?.values)) {
      const { timestamps = [], values = [] } = req.body;
      const ts =
        Array.isArray(timestamps) && timestamps.length === values.length
          ? timestamps
          : values.map((_, i) => `T+${i}h`);

      const analysis = analyzeRainfallSeries(ts, values);
      return res.status(200).json({
        success: true,
        mode: "custom_timeseries",
        ...analysis,
      });
    }

    // 2. Station coordinate query via GET or POST
    const lat = req.query.lat ?? req.body?.lat;
    const lon = req.query.lon ?? req.body?.lon;

    if (lat === undefined || lon === undefined || lat === "" || lon === "") {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required (e.g. /api/weather/rainfall-analytics?lat=30.73&lon=79.06)",
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
        message: "Invalid latitude or longitude coordinates",
      });
    }

    const pastDays = req.query.pastDays ? Number(req.query.pastDays) : 3;
    const forecastDays = req.query.forecastDays ? Number(req.query.forecastDays) : 2;
    const startDate = req.query.startDate || req.query.start_date || null;
    const endDate = req.query.endDate || req.query.end_date || null;

    const analysis = await analyzeStationRainfall(latitude, longitude, {
      pastDays,
      forecastDays,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      ...analysis,
    });
  } catch (error) {
    console.error("Rainfall Analytics Controller Error:", error);
    return res.status(502).json({
      success: false,
      message: "Failed to generate rainfall analytics",
      error: error.message,
    });
  }
};
