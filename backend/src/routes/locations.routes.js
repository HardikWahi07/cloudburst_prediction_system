import express from "express";
import { getLocations } from "../controllers/locations.controller.js";

const router = express.Router();

router.get("/", getLocations);

export default router;
