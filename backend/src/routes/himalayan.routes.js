import express from "express";
import {
  getDbStatus,
  getDistricts,
  getLocationById,
  getLocations,
  getStates,
  lookupLocation,
  queryBoundingBox,
} from "../controllers/himalayan.controller.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts", getDistricts);
router.get("/bbox", queryBoundingBox);
router.get("/lookup", lookupLocation);
router.get("/status", getDbStatus);
router.get("/:id", getLocationById);
router.get("/", getLocations);

export default router;
