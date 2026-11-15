import express from "express";
import {
  getBatchWeather,
  getHistoricalWeather,
  getWeather,
} from "../controllers/weather.controller.js";

const router = express.Router();

router.get("/", getWeather);
router.get("/historical", getHistoricalWeather);
router.get("/batch", getBatchWeather);
router.post("/batch", getBatchWeather);

export default router;