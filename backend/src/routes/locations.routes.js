import express from "express";
import {
  getCountries,
  getLocations,
  getRiskMapStations,
  searchLocations,
} from "../controllers/locations.controller.js";

const router = express.Router();

router.get("/", getLocations);
router.get("/countries", getCountries);
router.get("/search", searchLocations);
router.get("/risk-map", getRiskMapStations);

export default router;
