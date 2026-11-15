import {
  acknowledgeAlert,
  evaluateBatchLocations,
  evaluateLocationAlert,
  getAlertRules,
  getAlertSummary,
  getAlerts,
  resolveAlert,
  updateAlertRules,
} from "../services/alertEngine.service.js";

/**
 * GET /api/alerts
 * Lists active and historical early-warning alerts.
 */
export async function getAlertsHandler(req, res) {
  try {
    const { status, severity, state, basin, locationId, limit } = req.query;
    const alerts = getAlerts({
      status: status || "active",
      severity,
      state,
      basin,
      locationId,
      limit: limit ? Number.parseInt(limit, 10) : 50,
    });

    res.json({
      success: true,
      count: alerts.length,
      filters: { status: status || "active", severity, state, basin, locationId },
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve alerts",
    });
  }
}

/**
 * GET /api/alerts/summary
 * Executive summary statistics of active alerts, severity breakdown, and affected basins.
 */
export async function getAlertSummaryHandler(req, res) {
  try {
    const summary = getAlertSummary();
    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate alert summary",
    });
  }
}

/**
 * GET /api/alerts/rules
 * Current threshold rules, cooldown policies, and severity definitions.
 */
export async function getAlertRulesHandler(req, res) {
  try {
    const rules = getAlertRules();
    res.json({
      success: true,
      rules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve alert rules",
    });
  }
}

/**
 * PUT /api/alerts/rules
 * Update threshold configuration or cooldown parameters.
 */
export async function updateAlertRulesHandler(req, res) {
  try {
    const result = updateAlertRules(req.body || {});
    res.json({
      success: true,
      message: "Alert rules updated successfully",
      config: result.config,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update alert rules",
    });
  }
}

/**
 * POST /api/alerts/evaluate
 * Evaluates live meteorological telemetry against threshold rules.
 * Accepts single `{ location, telemetry, options }` or batch `{ locations: [...] }`.
 */
export async function evaluateAlertsHandler(req, res) {
  try {
    const body = req.body || {};

    if (Array.isArray(body.locations)) {
      const result = evaluateBatchLocations(body.locations, body.options || {});
      return res.json({
        success: true,
        batch: true,
        ...result,
      });
    }

    if (!body.location && !body.telemetry) {
      return res.status(400).json({
        success: false,
        error: "Missing location or telemetry payload for alert evaluation",
      });
    }

    const result = evaluateLocationAlert(body.location, body.telemetry, body.options || {});
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to evaluate alert telemetry",
    });
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledges an active early-warning alert.
 */
export async function acknowledgeAlertHandler(req, res) {
  try {
    const { id } = req.params;
    const { acknowledgedBy, notes } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing alert ID" });
    }

    const result = acknowledgeAlert(id, { acknowledgedBy, notes });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: `Alert ${id} acknowledged successfully`,
      alert: result.alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to acknowledge alert",
    });
  }
}

/**
 * POST /api/alerts/:id/resolve
 * Resolves an alert manually with an operational explanation.
 */
export async function resolveAlertHandler(req, res) {
  try {
    const { id } = req.params;
    const { resolvedBy, reason } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing alert ID" });
    }

    const result = resolveAlert(id, { resolvedBy, reason });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: `Alert ${id} marked as resolved`,
      alert: result.alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to resolve alert",
    });
  }
}

/**
 * GET /api/alerts/:id
 * Retrieve a specific alert by ID.
 */
export async function getAlertByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const all = getAlerts({ status: "all", limit: 200 });
    const match = all.find((a) => a.id === id);

    if (!match) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }

    res.json({
      success: true,
      alert: match,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch alert",
    });
  }
}
