import express from "express";
import {
  getBatchWeather,
  getHistoricalWeather,
  getMLModelInfo,
  getProbabilisticRiskAssessment,
  getRainfallAnalytics,
  getRiskThresholdProfiles,
  getWeather,
  predictCloudburstML,
} from "../controllers/weather.controller.js";

const router = express.Router();

router.get("/", getWeather);
router.get("/historical", getHistoricalWeather);
router.get("/rainfall-analytics", getRainfallAnalytics);
router.post("/rainfall-analytics", getRainfallAnalytics);
router.get("/analytics", getRainfallAnalytics);
router.get("/probabilistic-risk", getProbabilisticRiskAssessment);
router.post("/probabilistic-risk", getProbabilisticRiskAssessment);
router.get("/threshold-profiles", getRiskThresholdProfiles);
router.get("/ml-model-info", getMLModelInfo);
router.get("/ml-predict", predictCloudburstML);
router.post("/ml-predict", predictCloudburstML);
router.get("/batch", getBatchWeather);
router.post("/batch", getBatchWeather);

export default router;