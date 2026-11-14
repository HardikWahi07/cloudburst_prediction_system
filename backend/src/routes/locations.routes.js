import express from "express";
import {
  getCountries,
  getLocations,
  searchLocations,
} from "../controllers/locations.controller.js";

const router = express.Router();

router.get("/", getLocations);
router.get("/countries", getCountries);
router.get("/search", searchLocations);

export default router;
