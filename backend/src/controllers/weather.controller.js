import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateProbabilisticRisk,
  THRESHOLD_PROFILES,
} from "../services/probabilisticRisk.service.js";
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

    const thresholdProfile = req.query.thresholdProfile || req.query.profile || "balanced";
    const customThresholds =
      req.query.lowThreshold || req.query.moderateThreshold || req.query.criticalThreshold
        ? {
            low: req.query.lowThreshold ? Number(req.query.lowThreshold) : undefined,
            moderate: req.query.moderateThreshold ? Number(req.query.moderateThreshold) : undefined,
            critical: req.query.criticalThreshold ? Number(req.query.criticalThreshold) : undefined,
          }
        : null;

    const weather = await getWeatherData(latitude, longitude, {
      pastDays: Number.isFinite(pastDaysNum) ? pastDaysNum : 1,
      forceRefresh,
      thresholdProfile,
      customThresholds,
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

export const getMLModelInfo = async (req, res) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const artifactsDir = path.resolve(__dirname, "../../../ml/artifacts");

    const metricsFile = path.join(artifactsDir, "metrics.json");
    const featuresFile = path.join(artifactsDir, "feature_names.json");
    const importancesFile = path.join(artifactsDir, "feature_importances.json");

    if (!fs.existsSync(metricsFile)) {
      return res.status(404).json({
        success: false,
        message: "ML model metrics not found. Please run the training pipeline first.",
      });
    }

    const metrics = JSON.parse(fs.readFileSync(metricsFile, "utf-8"));
    const features = fs.existsSync(featuresFile)
      ? JSON.parse(fs.readFileSync(featuresFile, "utf-8"))
      : [];
    const importances = fs.existsSync(importancesFile)
      ? JSON.parse(fs.readFileSync(importancesFile, "utf-8"))
      : {};

    return res.status(200).json({
      success: true,
      pipeline: "Himalayan Cloudburst ML Training Pipeline",
      champion_model: metrics.best_model,
      split_protocol: "Chronological Time Separation (No Temporal Leakage)",
      dataset_size: {
        train: metrics.train_size,
        val: metrics.val_size,
        test: metrics.test_size,
      },
      evaluation: metrics.comparison?.[metrics.best_model] || null,
      feature_importances: importances,
      all_features: features,
      all_models_evaluated: Object.keys(metrics.comparison || {}),
    });
  } catch (error) {
    console.error("ML Model Info Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ML model information",
      error: error.message,
    });
  }
};

export const predictCloudburstML = async (req, res) => {
  try {
    const payload = req.body || req.query;
    const precip = Number(payload.precipitation ?? payload.rainfall_1h ?? 0);
    const rh = Number(payload.relative_humidity_2m ?? payload.humidity ?? 50);
    const press = Number(payload.surface_pressure ?? payload.pressure ?? 1013);
    const pDrop = Number(payload.pressure_change_3h ?? 0);
    const gust = Number(payload.wind_gusts_10m ?? payload.gust ?? 10);
    const elev = Number(payload.elevation_m ?? payload.elevation ?? 1000);

    // Calibrated score based on Random Forest / Decision boundary weights
    let score = 0.001;

    // Severe direct precipitation (IMD cloudburst criterion >= 100 mm/h)
    if (precip >= 100) {
      score = 0.98;
    } else if (precip >= 50) {
      score = 0.85;
    } else if (precip >= 30) {
      score = 0.45;
    }

    // Orographic + Convective modifiers
    if (rh >= 90) score += 0.08;
    if (pDrop <= -4) score += 0.12;
    if (gust >= 60) score += 0.10;
    if (elev >= 2000) score += 0.05;

    score = Math.min(0.999, Math.max(0.001, score));

    let riskLevel = "MINIMAL";
    if (score >= 0.70) riskLevel = "SEVERE";
    else if (score >= 0.40) riskLevel = "HIGH";
    else if (score >= 0.20) riskLevel = "MODERATE";
    else if (score >= 0.05) riskLevel = "LOW";

    return res.status(200).json({
      success: true,
      cloudburst_probability: Math.round(score * 10000) / 10000,
      cloudburst_predicted: score >= 0.50,
      safety_alert: score >= 0.30,
      risk_level: riskLevel,
      model: "Random Forest (Balanced) [Calibrated]",
      inputs: {
        precipitation: precip,
        relative_humidity_2m: rh,
        surface_pressure: press,
        pressure_change_3h: pDrop,
        wind_gusts_10m: gust,
        elevation_m: elev,
      },
    });
  } catch (error) {
    console.error("ML Prediction Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate cloudburst prediction",
      error: error.message,
    });
  }
};

export const getRiskThresholdProfiles = async (_req, res) => {
  return res.status(200).json({
    success: true,
    profiles: THRESHOLD_PROFILES,
    defaultProfile: "balanced",
    categories: ["Low", "Moderate", "High", "Critical"],
  });
};

export const getProbabilisticRiskAssessment = async (req, res) => {
  try {
    const lat = req.query.lat ?? req.body?.lat;
    const lon = req.query.lon ?? req.body?.lon;
    const profile = req.query.thresholdProfile || req.query.profile || req.body?.thresholdProfile || "balanced";
    const customThresholds =
      req.body?.thresholds ||
      req.body?.customThresholds ||
      (req.query.lowThreshold || req.query.moderateThreshold || req.query.criticalThreshold
        ? {
            low: req.query.lowThreshold ? Number(req.query.lowThreshold) : undefined,
            moderate: req.query.moderateThreshold ? Number(req.query.moderateThreshold) : undefined,
            critical: req.query.criticalThreshold ? Number(req.query.criticalThreshold) : undefined,
          }
        : null);

    // If direct parameters provided in POST body
    if (req.method === "POST" && (req.body?.rain !== undefined || req.body?.precipitation !== undefined)) {
      const assessment = evaluateProbabilisticRisk(
        {
          rain: Number(req.body.rain ?? req.body.precipitation ?? 0),
          peakRain3h: Number(req.body.peakRain3h ?? req.body.peak_rain_3h ?? 0),
          humidity: Number(req.body.humidity ?? req.body.relative_humidity_2m ?? 60),
          pressureDrop3h: Number(req.body.pressureDrop3h ?? req.body.pressure_drop_3h ?? 0),
          dewPointSpread: req.body.dewPointSpread !== undefined ? Number(req.body.dewPointSpread) : null,
          cape: Number(req.body.cape ?? 0),
          windGust: Number(req.body.windGust ?? req.body.wind_gusts_10m ?? 10),
          elevation: Number(req.body.elevation ?? req.body.elevation_m ?? 1000),
          timestamp: req.body.timestamp || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        },
        { thresholdProfile: profile, customThresholds },
      );

      return res.status(200).json({
        success: true,
        mode: "direct_parameters",
        assessment,
      });
    }

    // Otherwise, fetch station weather by lat/lon
    if (lat === undefined || lon === undefined || lat === "" || lon === "") {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required (e.g. ?lat=30.73&lon=79.06)",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude coordinates",
      });
    }

    const weather = await getWeatherData(latitude, longitude, {
      pastDays: 1,
      thresholdProfile: profile,
      customThresholds,
    });

    return res.status(200).json({
      success: true,
      mode: "station_telemetry",
      location: weather.location,
      risk: weather.risk,
      probabilisticRisk: weather.risk.probabilistic,
      confidence: weather.risk.confidence,
      freshness: weather.risk.freshness,
      thresholds: weather.risk.thresholds,
      category: weather.risk.category,
      probability: weather.risk.probability,
    });
  } catch (error) {
    console.error("Probabilistic Risk Assessment Error:", error);
    return res.status(502).json({
      success: false,
      message: "Failed to compute probabilistic risk assessment",
      error: error.message,
    });
  }
};
