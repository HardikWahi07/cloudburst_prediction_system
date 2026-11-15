/**
 * Location-Based Early-Warning and Alert Engine
 * 
 * Features:
 * 1. Multi-parameter threshold-triggered alerts (Rain rate, 3h accum, CAPE, Pressure drop, Probabilistic risk).
 * 2. Alert severity hierarchy: CRITICAL (Red), WARNING (Orange), WATCH (Amber), ADVISORY (Yellow).
 * 3. Affected location metadata (State, District, Basin, Elevation, Downstream hydro assets, Radius).
 * 4. Duplicate suppression and configurable cooldown periods (prevents alarm fatigue).
 * 5. Immediate severity escalation override (bypasses cooldown when conditions worsen).
 * 6. Alert lifecycle management: ACTIVE -> ACKNOWLEDGED -> RESOLVED / EXPIRED.
 * 7. Persistent history logging with in-memory ring-buffer + PostgreSQL fallback.
 */

import crypto from "node:crypto";
import { queryPostgres } from "../db/postgres.js";

export const SEVERITY_LEVELS = {
  CRITICAL: {
    rank: 4,
    code: "RED_ALERT",
    name: "Critical Cloudburst Emergency",
    color: "#dc2626",
    badgeBg: "bg-red-600 text-white",
    imdTier: "Cloudburst / Extremely Heavy Rain",
    defaultValidHours: 3,
  },
  WARNING: {
    rank: 3,
    code: "ORANGE_ALERT",
    name: "Torrential Downpour Warning",
    color: "#ea580c",
    badgeBg: "bg-orange-600 text-white",
    imdTier: "Very Heavy Rain (>50 mm/h)",
    defaultValidHours: 6,
  },
  WATCH: {
    rank: 2,
    code: "AMBER_ALERT",
    name: "Convective Storm Watch",
    color: "#d97706",
    badgeBg: "bg-amber-600 text-white",
    imdTier: "Heavy Rain / Elevated Convective Risk",
    defaultValidHours: 12,
  },
  ADVISORY: {
    rank: 1,
    code: "YELLOW_ALERT",
    name: "Hydrological Advisory",
    color: "#059669",
    badgeBg: "bg-emerald-600 text-white",
    imdTier: "Moderate Rain / Saturation Advisory",
    defaultValidHours: 24,
  },
};

export const DEFAULT_THRESHOLDS = {
  cooldownMinutes: 60, // duplicate suppression cooldown
  critical: {
    rainRate1h: 100.0, // mm/h (standard IMD cloudburst definition)
    rainAccum3h: 75.0, // mm
    probabilisticScore: 0.75, // 75%
    combinedRainRate: 50.0, // mm/h if accompanied by rapid pressure drop
    pressureDrop3h: 2.5, // hPa in 3 hours
  },
  warning: {
    rainRate1h: 50.0, // mm/h
    rainAccum3h: 40.0, // mm
    probabilisticScore: 0.50, // 50%
    combinedRainRate: 25.0, // mm/h with high CAPE
    cape: 1200.0, // J/kg
    pressureDrop3h: 1.8, // hPa in 3 hours
  },
  watch: {
    rainRate1h: 20.0, // mm/h
    rainAccum3h: 25.0, // mm
    probabilisticScore: 0.30, // 30%
    cape: 750.0, // J/kg
    humidity: 85.0, // %
  },
  advisory: {
    rainRate1h: 10.0, // mm/h
    humidity: 90.0, // %
    dewPointSpread: 1.2, // °C
    probabilisticScore: 0.15, // 15%
  },
};

// In-Memory Alert Store & Suppression State Tracker
class AlertEngineStore {
  constructor(maxHistory = 500) {
    this.alerts = new Map(); // id -> alert object
    this.activeAlertsByLocation = new Map(); // locationKey -> alertId
    this.suppressionTracker = new Map(); // dedupKey -> { lastTriggeredAt, count, lastSuppressedAt }
    this.config = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
    this.maxHistory = maxHistory;
    this.seedInitialHistoricalAlerts();
  }

  seedInitialHistoricalAlerts() {
    const now = Date.now();
    const samples = [
      {
        id: "alert-demo-kedarnath-01",
        locationId: "loc-uttarakhand-kedarnath",
        locationName: "Kedarnath Temple Shrine Catchment",
        district: "Rudraprayag",
        state: "Uttarakhand",
        latitude: 30.7346,
        longitude: 79.0669,
        elevationM: 3584,
        basin: "Mandakini River Valley",
        powerAsset: "Mandakini Small Hydel Cascades",
        severity: "CRITICAL",
        alertCode: "RED_ALERT",
        title: "CRITICAL CLOUDBURST ALERT: Mandakini Catchment",
        description: "Intense convective cloudburst cluster detected over Chorabari Glacier catchment. Rain rate 104.2 mm/h with extreme pressure collapse.",
        triggers: [
          { parameter: "rainRate1h", value: 104.2, threshold: 100.0, label: "Cloudburst Rain Rate > 100 mm/h" },
          { parameter: "pressureDrop3h", value: 3.4, threshold: 2.5, label: "Rapid Barometric Drop > 2.5 hPa/3h" },
          { parameter: "probabilisticScore", value: 0.88, threshold: 0.75, label: "Calibrated Risk Probability 88%" },
        ],
        metricsSnapshot: {
          rainRate1h: 104.2,
          rainAccum3h: 118.5,
          pressureDrop3h: 3.4,
          cape: 1650,
          humidity: 96,
        },
        recommendedActions: [
          "Activate emergency siren in Rambara and Gaurikund settlements.",
          "Immediate suspension of Char Dham Yatra trekking corridors.",
          "Alert State Disaster Response Force (SDRF) post at Lincholi.",
          "Notify downstream run-of-the-river hydel intake gates.",
        ],
        status: "ACTIVE",
        triggeredAt: new Date(now - 25 * 60 * 1000).toISOString(),
        validUntil: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        cooldownUntil: new Date(now + 35 * 60 * 1000).toISOString(),
        suppressionStats: { suppressedCount: 3, lastSuppressedAt: new Date(now - 5 * 60 * 1000).toISOString() },
        escalationHistory: [{ from: "WARNING", to: "CRITICAL", at: new Date(now - 25 * 60 * 1000).toISOString() }],
      },
      {
        id: "alert-demo-joshimath-02",
        locationId: "loc-uttarakhand-joshimath",
        locationName: "Joshimath - Tapovan Slopes",
        district: "Chamoli",
        state: "Uttarakhand",
        latitude: 30.5568,
        longitude: 79.5678,
        elevationM: 1875,
        basin: "Alaknanda - Dhauliganga Basin",
        powerAsset: "Tapovan Vishnugad Hydropower Project (520 MW)",
        severity: "WARNING",
        alertCode: "ORANGE_ALERT",
        title: "TORRENTIAL RAINFALL WARNING: Alaknanda Basin",
        description: "Heavy orographic downpour accumulation threatening vulnerable moraine slopes and NTPC hydel barrage.",
        triggers: [
          { parameter: "rainRate1h", value: 58.4, threshold: 50.0, label: "Rain Rate > 50 mm/h" },
          { parameter: "rainAccum3h", value: 68.0, threshold: 40.0, label: "3-Hour Rainfall Accumulation > 40 mm" },
        ],
        metricsSnapshot: { rainRate1h: 58.4, rainAccum3h: 68.0, cape: 1100, humidity: 91 },
        recommendedActions: [
          "Inspect Tapovan barrage trash-racks and sediment bypass gates.",
          "Warn Border Roads Organisation (BRO) regarding Joshimath-Badrinath highway slips.",
        ],
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(now - 45 * 60 * 1000).toISOString(),
        acknowledgedBy: "Duty Officer - Chamoli Disaster Management Cell",
        acknowledgmentNotes: "BRO road teams alerted at Helang and Vishnuprayag; intake gates in monitoring mode.",
        triggeredAt: new Date(now - 90 * 60 * 1000).toISOString(),
        validUntil: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
        cooldownUntil: new Date(now - 30 * 60 * 1000).toISOString(),
        suppressionStats: { suppressedCount: 1, lastSuppressedAt: new Date(now - 60 * 60 * 1000).toISOString() },
        escalationHistory: [],
      },
      {
        id: "alert-demo-kinnaur-03",
        locationId: "loc-hp-recong-peo",
        locationName: "Reckong Peo / Karcham",
        district: "Kinnaur",
        state: "Himachal Pradesh",
        latitude: 31.5404,
        longitude: 78.2755,
        elevationM: 2290,
        basin: "Sutlej River Basin",
        powerAsset: "Karcham Wangtoo Hydroelectric Plant (1000 MW)",
        severity: "WATCH",
        alertCode: "AMBER_ALERT",
        title: "CONVECTIVE WATCH: Sutlej Gorge Corridor",
        description: "Atmospheric instability with high CAPE (950 J/kg) and rapid moisture influx along Sutlej valley.",
        triggers: [
          { parameter: "cape", value: 950, threshold: 750, label: "Elevated CAPE > 750 J/kg" },
          { parameter: "humidity", value: 88, threshold: 85, label: "Relative Humidity > 85%" },
        ],
        metricsSnapshot: { rainRate1h: 22.0, rainAccum3h: 28.0, cape: 950, humidity: 88 },
        recommendedActions: [
          "Keep hydel plant generation logs synchronized with Nathpa Jhakri dam.",
        ],
        status: "RESOLVED",
        resolvedAt: new Date(now - 120 * 60 * 1000).toISOString(),
        resolvedBy: "IMD Shimla Senior Forecaster",
        resolutionReason: "Convective cloud band shifted eastward into Spiti Valley; rain subsided to < 5 mm/h.",
        triggeredAt: new Date(now - 360 * 60 * 1000).toISOString(),
        validUntil: new Date(now - 120 * 60 * 1000).toISOString(),
        cooldownUntil: new Date(now - 300 * 60 * 1000).toISOString(),
        suppressionStats: { suppressedCount: 0 },
        escalationHistory: [],
      },
    ];

    samples.forEach((alert) => {
      this.alerts.set(alert.id, alert);
      const locKey = this.getLocationKey(alert.locationId, alert.latitude, alert.longitude);
      if (alert.status === "ACTIVE") {
        this.activeAlertsByLocation.set(locKey, alert.id);
      }
    });
  }

  getLocationKey(locationId, lat, lon) {
    if (locationId) return String(locationId).toLowerCase();
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
    }
    return "unknown-location";
  }

  getDedupKey(locKey, severity) {
    return `${locKey}:${severity}`;
  }
}

// Global in-memory singleton
const store = new AlertEngineStore();

/**
 * Evaluates telemetry against threshold rules to determine if an alert should trigger.
 * Handles duplicate suppression, cooldowns, and automatic severity escalation.
 * 
 * @param {object} location Target station/location metadata
 * @param {object} telemetry Meteorological readings (rain, accum, cape, pressure drop, etc.)
 * @param {object} [options] Threshold overrides and evaluation flags
 * @returns {object} Evaluation result containing alert, isNew, isEscalated, isSuppressed
 */
export function evaluateLocationAlert(location, telemetry, options = {}) {
  if (!location || !telemetry) {
    return { triggered: false, reason: "Missing location or telemetry input" };
  }

  const config = { ...store.config, ...options };
  const locKey = store.getLocationKey(location.id, location.latitude, location.longitude);

  // Normalize incoming meteorological parameters
  const rainRate = Number(telemetry.rainRate ?? telemetry.rainfallRate ?? telemetry.rain ?? 0);
  const rainAccum3h = Number(telemetry.rainAccum3h ?? telemetry.rainfall3h ?? telemetry.precipitation3h ?? 0);
  const rainAccum24h = Number(telemetry.rainAccum24h ?? telemetry.rainfall24h ?? 0);
  const pressureDrop3h = Number(telemetry.pressureDrop3h ?? telemetry.pressureDrop ?? 0);
  const cape = Number(telemetry.cape ?? telemetry.peakCape ?? 0);
  const humidity = Number(telemetry.humidity ?? 0);
  const dewPointSpread = Number(telemetry.dewPointSpread ?? 99);
  const probabilisticScore = Number(telemetry.probabilisticScore ?? telemetry.riskScore ? (telemetry.riskScore / 100) : 0);

  // Evaluate against rule hierarchy (CRITICAL -> WARNING -> WATCH -> ADVISORY)
  let matchedSeverity = null;
  const triggers = [];

  // 1. Critical Cloudburst Threshold Check
  const crit = config.critical;
  if (rainRate >= crit.rainRate1h) {
    matchedSeverity = "CRITICAL";
    triggers.push({ parameter: "rainRate1h", value: rainRate, threshold: crit.rainRate1h, label: `Extreme Cloudburst Rain Rate (${rainRate.toFixed(1)} mm/h >= ${crit.rainRate1h} mm/h)` });
  } else if (rainAccum3h >= crit.rainAccum3h) {
    matchedSeverity = "CRITICAL";
    triggers.push({ parameter: "rainAccum3h", value: rainAccum3h, threshold: crit.rainAccum3h, label: `Extreme 3-Hour Accumulation (${rainAccum3h.toFixed(1)} mm >= ${crit.rainAccum3h} mm)` });
  } else if (probabilisticScore >= crit.probabilisticScore && rainRate >= 30) {
    matchedSeverity = "CRITICAL";
    triggers.push({ parameter: "probabilisticScore", value: probabilisticScore, threshold: crit.probabilisticScore, label: `Severe Calibrated Probability (${(probabilisticScore * 100).toFixed(0)}%) with Rain (${rainRate.toFixed(1)} mm/h)` });
  } else if (rainRate >= crit.combinedRainRate && pressureDrop3h >= crit.pressureDrop3h) {
    matchedSeverity = "CRITICAL";
    triggers.push({ parameter: "combinedConvective", value: `${rainRate} mm/h & -${pressureDrop3h} hPa`, label: `Violent Convective Front: Rain ${rainRate.toFixed(1)} mm/h + Pressure Drop ${pressureDrop3h.toFixed(1)} hPa/3h` });
  }

  // 2. Warning Threshold Check (if not already Critical)
  if (!matchedSeverity) {
    const warn = config.warning;
    if (rainRate >= warn.rainRate1h) {
      matchedSeverity = "WARNING";
      triggers.push({ parameter: "rainRate1h", value: rainRate, threshold: warn.rainRate1h, label: `Torrential Rain Rate (${rainRate.toFixed(1)} mm/h >= ${warn.rainRate1h} mm/h)` });
    } else if (rainAccum3h >= warn.rainAccum3h) {
      matchedSeverity = "WARNING";
      triggers.push({ parameter: "rainAccum3h", value: rainAccum3h, threshold: warn.rainAccum3h, label: `Heavy 3-Hour Accumulation (${rainAccum3h.toFixed(1)} mm >= ${warn.rainAccum3h} mm)` });
    } else if (probabilisticScore >= warn.probabilisticScore) {
      matchedSeverity = "WARNING";
      triggers.push({ parameter: "probabilisticScore", value: probabilisticScore, threshold: warn.probabilisticScore, label: `Elevated Calibrated Probability (${(probabilisticScore * 100).toFixed(0)}%)` });
    } else if (rainRate >= warn.combinedRainRate && (cape >= warn.cape || pressureDrop3h >= warn.pressureDrop3h)) {
      matchedSeverity = "WARNING";
      triggers.push({ parameter: "combinedRainCape", value: `${rainRate} mm/h + CAPE ${cape}`, label: `Heavy Downpour (${rainRate.toFixed(1)} mm/h) with High Convective Energy (CAPE ${cape} J/kg)` });
    }
  }

  // 3. Watch Threshold Check (if not already Critical or Warning)
  if (!matchedSeverity) {
    const wat = config.watch;
    if (rainRate >= wat.rainRate1h) {
      matchedSeverity = "WATCH";
      triggers.push({ parameter: "rainRate1h", value: rainRate, threshold: wat.rainRate1h, label: `Moderate-to-Heavy Rain Rate (${rainRate.toFixed(1)} mm/h >= ${wat.rainRate1h} mm/h)` });
    } else if (rainAccum3h >= wat.rainAccum3h) {
      matchedSeverity = "WATCH";
      triggers.push({ parameter: "rainAccum3h", value: rainAccum3h, threshold: wat.rainAccum3h, label: `Convective Rain Accumulation (${rainAccum3h.toFixed(1)} mm >= ${wat.rainAccum3h} mm)` });
    } else if (probabilisticScore >= wat.probabilisticScore) {
      matchedSeverity = "WATCH";
      triggers.push({ parameter: "probabilisticScore", value: probabilisticScore, threshold: wat.probabilisticScore, label: `Watch Level Calibrated Probability (${(probabilisticScore * 100).toFixed(0)}%)` });
    } else if (cape >= wat.cape && humidity >= wat.humidity) {
      matchedSeverity = "WATCH";
      triggers.push({ parameter: "unstableAtmosphere", value: `CAPE ${cape} + Hum ${humidity}%`, label: `Unstable Moisture Column: CAPE ${cape} J/kg & Humidity ${humidity}%` });
    }
  }

  // 4. Advisory Check (if not already matched)
  if (!matchedSeverity) {
    const adv = config.advisory;
    if (rainRate >= adv.rainRate1h) {
      matchedSeverity = "ADVISORY";
      triggers.push({ parameter: "rainRate1h", value: rainRate, threshold: adv.rainRate1h, label: `Advisory Rain Rate (${rainRate.toFixed(1)} mm/h)` });
    } else if (humidity >= adv.humidity && dewPointSpread <= adv.dewPointSpread) {
      matchedSeverity = "ADVISORY";
      triggers.push({ parameter: "saturation", value: `Hum ${humidity}%, Spread ${dewPointSpread}°C`, label: `Saturated Atmospheric Airmass (Spread ${dewPointSpread}°C)` });
    } else if (probabilisticScore >= adv.probabilisticScore) {
      matchedSeverity = "ADVISORY";
      triggers.push({ parameter: "probabilisticScore", value: probabilisticScore, threshold: adv.probabilisticScore, label: `Baseline Convective Watch (${(probabilisticScore * 100).toFixed(0)}%)` });
    }
  }

  // No thresholds exceeded: if there is an active alert that expired, resolve it
  if (!matchedSeverity) {
    const existingActiveId = store.activeAlertsByLocation.get(locKey);
    if (existingActiveId) {
      const existingAlert = store.alerts.get(existingActiveId);
      if (existingAlert && existingAlert.status === "ACTIVE") {
        const nowIso = new Date().toISOString();
        if (new Date(existingAlert.validUntil) < new Date()) {
          existingAlert.status = "EXPIRED";
          existingAlert.resolvedAt = nowIso;
          store.activeAlertsByLocation.delete(locKey);
        }
      }
    }
    return {
      triggered: false,
      locationId: location.id,
      locationName: location.name,
      metricsSnapshot: { rainRate, rainAccum3h, cape, pressureDrop3h, humidity, probabilisticScore },
      message: "Meteorological parameters within normal baseline limits.",
    };
  }

  // --- DUPLICATE SUPPRESSION & ESCALATION LOGIC ---
  const now = Date.now();
  const cooldownMs = (config.cooldownMinutes || 60) * 60 * 1000;
  const existingActiveId = store.activeAlertsByLocation.get(locKey);
  const existingAlert = existingActiveId ? store.alerts.get(existingActiveId) : null;
  const currentSeverityRank = SEVERITY_LEVELS[matchedSeverity]?.rank || 1;
  const existingSeverityRank = existingAlert ? (SEVERITY_LEVELS[existingAlert.severity]?.rank || 0) : 0;

  // Case 1: Escalation! (Current condition is worse than existing alert)
  // Escalation always bypasses cooldown to ensure immediate public safety response.
  const isEscalation = existingAlert && currentSeverityRank > existingSeverityRank;

  // Case 2: Cooldown & Duplicate Suppression Check
  // If the same or lower severity was triggered within the cooldown window, suppress duplicate alert.
  const dedupKey = store.getDedupKey(locKey, matchedSeverity);
  const suppressionState = store.suppressionTracker.get(dedupKey);
  const timeSinceLast = suppressionState ? now - suppressionState.lastTriggeredAt : Infinity;
  const isWithinCooldown = timeSinceLast < cooldownMs;

  if (existingAlert && !isEscalation && isWithinCooldown) {
    // Suppress duplicate alert!
    if (suppressionState) {
      suppressionState.count += 1;
      suppressionState.lastSuppressedAt = now;
    }
    if (existingAlert.suppressionStats) {
      existingAlert.suppressionStats.suppressedCount = (existingAlert.suppressionStats.suppressedCount || 0) + 1;
      existingAlert.suppressionStats.lastSuppressedAt = new Date(now).toISOString();
      existingAlert.metricsSnapshot = {
        rainRate1h: rainRate,
        rainAccum3h,
        rainAccum24h,
        pressureDrop3h,
        cape,
        humidity,
        probabilisticScore,
      };
    }

    return {
      triggered: true,
      isSuppressed: true,
      alertId: existingAlert.id,
      severity: existingAlert.severity,
      cooldownRemainingMinutes: Math.max(0, Math.ceil((cooldownMs - timeSinceLast) / 60000)),
      suppressedCount: existingAlert.suppressionStats?.suppressedCount || 1,
      message: `Alert suppressed: duplicate ${matchedSeverity} event within ${config.cooldownMinutes}m cooldown window. Telemetry updated on existing alert.`,
      alert: existingAlert,
    };
  }

  // Case 3: Trigger New Alert (or Escalate Existing)
  const severityMeta = SEVERITY_LEVELS[matchedSeverity];
  const validDurationHours = severityMeta.defaultValidHours || 6;
  const alertId = `alt-${matchedSeverity.toLowerCase()}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const triggeredAt = new Date(now).toISOString();
  const validUntil = new Date(now + validDurationHours * 3600 * 1000).toISOString();
  const cooldownUntil = new Date(now + cooldownMs).toISOString();

  // Construct recommended actions based on severity & power assets
  const recommendedActions = generateRecommendedActions(matchedSeverity, location);

  const newAlert = {
    id: alertId,
    locationId: location.id || `loc-${location.name.toLowerCase().replace(/\s+/g, "-")}`,
    locationName: location.name,
    district: location.district || location.region || "Catchment Zone",
    state: location.state || "Indian Himalayan Region",
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    elevationM: location.elevationM || location.elevation || 1500,
    basin: location.basin || `${location.name} Basin`,
    subBasin: location.subBasin || location.district,
    powerAsset: location.powerAsset || location.criticalPowerAsset || "Regional Hydropower Grid",
    monitoringAgency: location.monitoringAgency || location.metAgency || "IMD / CWC",
    affectedRadiusKm: matchedSeverity === "CRITICAL" ? 25 : matchedSeverity === "WARNING" ? 18 : 10,
    severity: matchedSeverity,
    alertCode: severityMeta.code,
    title: `${matchedSeverity} CLOUDBURST ALERT: ${location.name} (${location.basin || location.state})`,
    description: generateAlertDescription(matchedSeverity, location, triggers, rainRate, rainAccum3h),
    triggers,
    metricsSnapshot: {
      rainRate1h: rainRate,
      rainAccum3h,
      rainAccum24h,
      pressureDrop3h,
      cape,
      humidity,
      probabilisticScore,
    },
    recommendedActions,
    status: "ACTIVE",
    triggeredAt,
    validUntil,
    cooldownUntil,
    suppressionStats: {
      suppressedCount: 0,
      lastSuppressedAt: null,
    },
    escalationHistory: isEscalation
      ? [
          ...(existingAlert.escalationHistory || []),
          {
            from: existingAlert.severity,
            to: matchedSeverity,
            at: triggeredAt,
            priorAlertId: existingAlert.id,
          },
        ]
      : [],
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgmentNotes: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionReason: null,
  };

  // If this was an escalation, mark prior alert as superseded
  if (isEscalation && existingAlert) {
    existingAlert.status = "SUPERSEDED";
    existingAlert.supersededBy = alertId;
  }

  // Save in memory store
  store.alerts.set(alertId, newAlert);
  store.activeAlertsByLocation.set(locKey, alertId);
  store.suppressionTracker.set(dedupKey, { lastTriggeredAt: now, count: 1, lastSuppressedAt: null });

  // Asynchronously attempt to persist to PostgreSQL if table exists
  persistAlertToPostgres(newAlert).catch((err) => {
    // Graceful silent fallback to in-memory store
  });

  return {
    triggered: true,
    isNew: true,
    isEscalated: isEscalation,
    isSuppressed: false,
    alertId,
    severity: matchedSeverity,
    alert: newAlert,
    message: isEscalation
      ? `CRITICAL ESCALATION: Alert escalated from ${existingAlert.severity} to ${matchedSeverity} due to worsening conditions.`
      : `New ${matchedSeverity} early-warning alert triggered for ${location.name}.`,
  };
}

/**
 * Generates tailored operational recommendations based on severity and infrastructure.
 */
function generateRecommendedActions(severity, location) {
  const asset = location.powerAsset || "Hydropower station";
  switch (severity) {
    case "CRITICAL":
      return [
        `RED ALERT: Immediate evacuation of low-lying floodplains and vulnerable nullahs along ${location.basin || "catchment"}.`,
        `Initiate emergency spillway pre-discharge protocol at ${asset}.`,
        "Sound civil defense sirens and alert National Disaster Response Force (NDRF) / SDRF battalions.",
        "Suspend all pilgrimage and river rafting corridors immediately.",
        "BRO to close mountain highway passes vulnerable to rock-falls and debris flows.",
      ];
    case "WARNING":
      return [
        `ORANGE ALERT: Pre-position SDRF search & rescue units in ${location.district || location.name}.`,
        `Monitor headrace tunnels and intake trash-racks at ${asset} every 15 minutes.`,
        "Issue flash-flood warnings to downstream panchayats and municipal bodies.",
        "Halt non-essential heavy transport along vulnerable river scarp roads.",
      ];
    case "WATCH":
      return [
        `AMBER WATCH: Desilt drainage intakes and verify emergency diesel generators at ${asset}.`,
        "Instruct local tehsildars and patwaris to monitor river gauge telemetry.",
        "Prepare emergency relief shelters at higher elevation community centres.",
      ];
    case "ADVISORY":
    default:
      return [
        "Maintain routine 3-hour meteorological bulletin logging.",
        "Ensure Automated Weather Station (AWS) solar panels and sensors are clean.",
        "Standard grid power generation schedule remains operational.",
      ];
  }
}

/**
 * Creates human-readable alert description.
 */
function generateAlertDescription(severity, location, triggers, rainRate, rainAccum3h) {
  const triggerSummary = triggers.map((t) => t.label).join("; ");
  const elevText = location.elevationM ? ` at ${location.elevationM} m AMSL` : "";
  return `Early-Warning Engine detected ${severity} cloudburst risk in ${location.name}${elevText} (${location.basin || location.state}). Observed rain intensity: ${rainRate.toFixed(1)} mm/h (3h accum: ${rainAccum3h.toFixed(1)} mm). Key atmospheric triggers: ${triggerSummary}.`;
}

/**
 * Evaluates a batch list of stations/locations.
 */
export function evaluateBatchLocations(locationsWithTelemetry, options = {}) {
  const results = [];
  let triggeredCount = 0;
  let suppressedCount = 0;

  (locationsWithTelemetry || []).forEach((item) => {
    const loc = item.location || item;
    const tel = item.telemetry || item.weather || item;
    const res = evaluateLocationAlert(loc, tel, options);
    if (res.triggered) {
      if (res.isSuppressed) {
        suppressedCount += 1;
      } else {
        triggeredCount += 1;
      }
    }
    results.push(res);
  });

  return {
    evaluatedCount: locationsWithTelemetry.length,
    triggeredCount,
    suppressedCount,
    results,
  };
}

/**
 * Acknowledges an active alert.
 */
export function acknowledgeAlert(alertId, { acknowledgedBy = "Control Room Operator", notes = "" } = {}) {
  const alert = store.alerts.get(alertId);
  if (!alert) {
    return { success: false, error: "Alert not found" };
  }

  if (alert.status !== "ACTIVE") {
    return { success: false, error: `Alert is already in ${alert.status} state` };
  }

  alert.status = "ACKNOWLEDGED";
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = acknowledgedBy;
  alert.acknowledgmentNotes = notes || "Alert acknowledged by on-duty operations coordinator.";

  // Update in DB if applicable
  updateAlertInPostgres(alertId, {
    status: "ACKNOWLEDGED",
    acknowledged_at: alert.acknowledgedAt,
    acknowledged_by: alert.acknowledgedBy,
    acknowledgment_notes: alert.acknowledgmentNotes,
  }).catch(() => {});

  return { success: true, alert };
}

/**
 * Manually resolves an active or acknowledged alert.
 */
export function resolveAlert(alertId, { resolvedBy = "Senior Forecaster", reason = "" } = {}) {
  const alert = store.alerts.get(alertId);
  if (!alert) {
    return { success: false, error: "Alert not found" };
  }

  alert.status = "RESOLVED";
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = resolvedBy;
  alert.resolutionReason = reason || "Convective system dissipated; telemetry returned to safe operating parameters.";

  // Remove from active lookup
  const locKey = store.getLocationKey(alert.locationId, alert.latitude, alert.longitude);
  if (store.activeAlertsByLocation.get(locKey) === alertId) {
    store.activeAlertsByLocation.delete(locKey);
  }

  updateAlertInPostgres(alertId, {
    status: "RESOLVED",
    resolved_at: alert.resolvedAt,
    resolved_by: alert.resolvedBy,
    resolution_reason: alert.resolutionReason,
  }).catch(() => {});

  return { success: true, alert };
}

/**
 * Returns filtered list of alerts.
 */
export function getAlerts(filters = {}) {
  const {
    status = "active", // "active", "acknowledged", "resolved", "all"
    severity = null,
    state = null,
    basin = null,
    locationId = null,
    limit = 50,
  } = filters;

  const now = new Date();
  const allAlerts = Array.from(store.alerts.values());

  // Auto-expire past validUntil alerts
  allAlerts.forEach((alt) => {
    if (alt.status === "ACTIVE" && new Date(alt.validUntil) < now) {
      alt.status = "EXPIRED";
      alt.resolvedAt = alt.validUntil;
      const locKey = store.getLocationKey(alt.locationId, alt.latitude, alt.longitude);
      if (store.activeAlertsByLocation.get(locKey) === alt.id) {
        store.activeAlertsByLocation.delete(locKey);
      }
    }
  });

  let filtered = allAlerts;

  if (status && status !== "all") {
    const s = status.toUpperCase();
    if (s === "ACTIVE") {
      filtered = filtered.filter((a) => a.status === "ACTIVE");
    } else if (s === "ACKNOWLEDGED") {
      filtered = filtered.filter((a) => a.status === "ACKNOWLEDGED");
    } else if (s === "RESOLVED") {
      filtered = filtered.filter((a) => a.status === "RESOLVED" || a.status === "EXPIRED");
    } else {
      filtered = filtered.filter((a) => a.status === s);
    }
  }

  if (severity) {
    filtered = filtered.filter((a) => a.severity.toUpperCase() === severity.toUpperCase());
  }

  if (state) {
    filtered = filtered.filter((a) => a.state.toLowerCase().includes(state.toLowerCase()));
  }

  if (basin) {
    filtered = filtered.filter((a) => a.basin && a.basin.toLowerCase().includes(basin.toLowerCase()));
  }

  if (locationId) {
    filtered = filtered.filter((a) => a.locationId === locationId);
  }

  // Sort by triggeredAt descending
  filtered.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

  return filtered.slice(0, Number(limit) || 50);
}

/**
 * Returns executive alert summary statistics.
 */
export function getAlertSummary() {
  const allAlerts = Array.from(store.alerts.values());
  const now = new Date();

  // Clean expired
  allAlerts.forEach((alt) => {
    if (alt.status === "ACTIVE" && new Date(alt.validUntil) < now) {
      alt.status = "EXPIRED";
      alt.resolvedAt = alt.validUntil;
    }
  });

  const activeAlerts = allAlerts.filter((a) => a.status === "ACTIVE");
  const acknowledgedAlerts = allAlerts.filter((a) => a.status === "ACKNOWLEDGED");

  const bySeverity = {
    CRITICAL: activeAlerts.filter((a) => a.severity === "CRITICAL").length,
    WARNING: activeAlerts.filter((a) => a.severity === "WARNING").length,
    WATCH: activeAlerts.filter((a) => a.severity === "WATCH").length,
    ADVISORY: activeAlerts.filter((a) => a.severity === "ADVISORY").length,
  };

  const totalSuppressed24h = allAlerts.reduce((acc, a) => acc + (a.suppressionStats?.suppressedCount || 0), 0);

  // Affected Basins
  const basinCounts = {};
  activeAlerts.forEach((a) => {
    if (a.basin) basinCounts[a.basin] = (basinCounts[a.basin] || 0) + 1;
  });

  return {
    totalActive: activeAlerts.length,
    totalAcknowledged: acknowledgedAlerts.length,
    totalHistoryCount: allAlerts.length,
    totalSuppressed24h,
    cooldownMinutes: store.config.cooldownMinutes,
    bySeverity,
    affectedBasins: Object.entries(basinCounts).map(([name, count]) => ({ basin: name, activeAlerts: count })),
    latestAlerts: activeAlerts.slice(0, 5),
  };
}

/**
 * Gets current threshold configurations.
 */
export function getAlertRules() {
  return {
    cooldownMinutes: store.config.cooldownMinutes,
    thresholds: store.config,
    severityDefinitions: SEVERITY_LEVELS,
  };
}

/**
 * Updates alert threshold rules dynamically.
 */
export function updateAlertRules(updates = {}) {
  if (typeof updates.cooldownMinutes === "number" && updates.cooldownMinutes >= 5) {
    store.config.cooldownMinutes = updates.cooldownMinutes;
  }
  if (updates.critical) store.config.critical = { ...store.config.critical, ...updates.critical };
  if (updates.warning) store.config.warning = { ...store.config.warning, ...updates.warning };
  if (updates.watch) store.config.watch = { ...store.config.watch, ...updates.watch };
  if (updates.advisory) store.config.advisory = { ...store.config.advisory, ...updates.advisory };

  return { success: true, config: store.config };
}

/**
 * Helper to persist alert to PostgreSQL if configured.
 */
async function persistAlertToPostgres(alert) {
  const sql = `
    INSERT INTO early_warning_alerts (
      id, location_id, location_name, district, state, latitude, longitude,
      elevation_m, basin, power_asset, severity, alert_code, title, description,
      triggers, metrics_snapshot, recommended_actions, status, triggered_at,
      valid_until, cooldown_until, suppression_count
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      suppression_count = EXCLUDED.suppression_count,
      metrics_snapshot = EXCLUDED.metrics_snapshot;
  `;
  const params = [
    alert.id,
    alert.locationId,
    alert.locationName,
    alert.district,
    alert.state,
    alert.latitude,
    alert.longitude,
    alert.elevationM,
    alert.basin,
    alert.powerAsset,
    alert.severity,
    alert.alertCode,
    alert.title,
    alert.description,
    JSON.stringify(alert.triggers),
    JSON.stringify(alert.metricsSnapshot),
    JSON.stringify(alert.recommendedActions),
    alert.status,
    alert.triggeredAt,
    alert.validUntil,
    alert.cooldownUntil,
    alert.suppressionStats?.suppressedCount || 0,
  ];

  return queryPostgres(sql, params);
}

/**
 * Updates status in PostgreSQL.
 */
async function updateAlertInPostgres(id, fields) {
  const setClauses = [];
  const params = [id];
  let idx = 2;

  Object.entries(fields).forEach(([k, v]) => {
    setClauses.push(`${k} = $${idx}`);
    params.push(v);
    idx++;
  });

  if (setClauses.length === 0) return;

  const sql = `UPDATE early_warning_alerts SET ${setClauses.join(", ")} WHERE id = $1;`;
  return queryPostgres(sql, params);
}
