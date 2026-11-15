import express from "express";
import {
  getBatchWeather,
  getHistoricalWeather,
  getRainfallAnalytics,
  getWeather,
} from "../controllers/weather.controller.js";

const router = express.Router();

router.get("/", getWeather);
router.get("/historical", getHistoricalWeather);
router.get("/rainfall-analytics", getRainfallAnalytics);
router.post("/rainfall-analytics", getRainfallAnalytics);
router.get("/analytics", getRainfallAnalytics);
router.get("/batch", getBatchWeather);
router.post("/batch", getBatchWeather);

export default router;