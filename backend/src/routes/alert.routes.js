import express from "express";
import {
  acknowledgeAlertHandler,
  evaluateAlertsHandler,
  getAlertByIdHandler,
  getAlertRulesHandler,
  getAlertSummaryHandler,
  getAlertsHandler,
  resolveAlertHandler,
  updateAlertRulesHandler,
} from "../controllers/alert.controller.js";

const router = express.Router();

router.get("/", getAlertsHandler);
router.get("/summary", getAlertSummaryHandler);
router.get("/rules", getAlertRulesHandler);
router.put("/rules", updateAlertRulesHandler);
router.post("/evaluate", evaluateAlertsHandler);
router.get("/:id", getAlertByIdHandler);
router.post("/:id/acknowledge", acknowledgeAlertHandler);
router.put("/:id/acknowledge", acknowledgeAlertHandler);
router.post("/:id/resolve", resolveAlertHandler);
router.put("/:id/resolve", resolveAlertHandler);

export default router;
