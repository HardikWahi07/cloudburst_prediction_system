import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Info,
  MapPin,
  OctagonAlert,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  acknowledgeAlert,
  getAlertSummary,
  getAlerts,
  resolveAlert,
} from "../services/weather.service";

export default function EarlyWarningAlertCenter({ activeLocation, weather }) {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusTab, setStatusTab] = useState("active"); // "active", "acknowledged", "all"
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [ackName, setAckName] = useState("Disaster Control Room Officer");
  const [ackNotes, setAckNotes] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveReason, setResolveReason] = useState("");
  const [actionMessage, setActionMessage] = useState(null);

  const fetchAlertData = async () => {
    setLoading(true);
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        getAlerts({ status: statusTab }),
        getAlertSummary(),
      ]);
      setAlerts(alertsRes.data || []);
      setSummary(summaryRes.summary || null);
    } catch (err) {
      console.warn("Failed to fetch alerts:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertData();
    const interval = setInterval(fetchAlertData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [statusTab]);

  const handleAcknowledge = async (id) => {
    try {
      const res = await acknowledgeAlert(id, {
        acknowledgedBy: ackName.trim() || "Control Room Duty Officer",
        notes: ackNotes.trim() || "Disaster response protocol activated.",
      });
      if (res.success) {
        setActionMessage({ type: "success", text: `Alert ${id} successfully acknowledged.` });
        setAcknowledgingId(null);
        setAckNotes("");
        fetchAlertData();
      }
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Failed to acknowledge alert" });
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await resolveAlert(id, {
        resolvedBy: ackName.trim() || "Duty Forecaster",
        reason: resolveReason.trim() || "Telemetry stabilized to normal operating limits.",
      });
      if (res.success) {
        setActionMessage({ type: "success", text: `Alert ${id} marked as resolved.` });
        setResolvingId(null);
        setResolveReason("");
        fetchAlertData();
      }
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Failed to resolve alert" });
    }
  };

  // Filter alerts by severity
  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    return a.severity === severityFilter;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "bg-red-600 text-white",
          border: "border-red-500",
          cardBg: "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800",
          icon: OctagonAlert,
          label: "RED ALERT · CRITICAL",
        };
      case "WARNING":
        return {
          bg: "bg-orange-600 text-white",
          border: "border-orange-500",
          cardBg: "bg-orange-50/70 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800",
          icon: AlertTriangle,
          label: "ORANGE ALERT · WARNING",
        };
      case "WATCH":
        return {
          bg: "bg-amber-600 text-white",
          border: "border-amber-500",
          cardBg: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800",
          icon: BellRing,
          label: "AMBER ALERT · WATCH",
        };
      case "ADVISORY":
      default:
        return {
          bg: "bg-emerald-600 text-white",
          border: "border-emerald-500",
          cardBg: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800",
          icon: Info,
          label: "YELLOW ALERT · ADVISORY",
        };
    }
  };

  return (
    <section
      id="early-warning-alerts"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-8"
      aria-labelledby="alert-engine-heading"
    >
      {/* Alert Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Radio className="w-4 h-4 animate-pulse text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="alert-engine-heading"
                className="text-base font-bold tracking-tight text-white flex items-center gap-1.5"
              >
                Himalayan Early-Warning &amp; Alert Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                ACTIVE COOLDOWN &amp; DEDUP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-parameter threshold triggers with automated duplicate suppression, cooldowns, and operator acknowledgement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAlertData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Alerts
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 divide-x divide-slate-200 dark:divide-slate-800 text-xs">
          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold">
              {summary.bySeverity?.CRITICAL || 0}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Critical Alerts</div>
              <div className="text-[11px] text-slate-500">Immediate evacuation</div>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 font-bold">
              {summary.bySeverity?.WARNING || 0}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Downpour Warnings</div>
              <div className="text-[11px] text-slate-500">SDRF pre-positioned</div>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 font-bold">
              {summary.bySeverity?.WATCH || 0}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Convective Watches</div>
              <div className="text-[11px] text-slate-500">Intake sluice readiness</div>
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 font-bold">
              {summary.totalSuppressed24h || 0}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Duplicates Suppressed</div>
              <div className="text-[11px] text-slate-500">{summary.cooldownMinutes}m cooldown active</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-b border-red-200 dark:border-red-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Controls: Tabs and Filters */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("active")}
            className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              statusTab === "active"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Active Early-Warnings ({summary?.totalActive ?? alerts.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("acknowledged")}
            className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              statusTab === "acknowledged"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Acknowledged ({summary?.totalAcknowledged ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              statusTab === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Full Alert History
          </button>
        </div>

        {/* Severity Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Filter Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (Red)</option>
            <option value="WARNING">Warning (Orange)</option>
            <option value="WATCH">Watch (Amber)</option>
            <option value="ADVISORY">Advisory (Yellow)</option>
          </select>
        </div>
      </div>

      {/* Alert Feed Body */}
      <div className="p-5 space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No {severityFilter !== "ALL" ? severityFilter : ""} Alerts in {statusTab.toUpperCase()} Status
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              All monitored Indian Himalayan hydrological catchments and power grid nodes are currently operating within safe baseline thresholds.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);
            const BadgeIcon = badge.icon;
            const isExpanded = expandedAlertId === alert.id;
            const isAcknowledging = acknowledgingId === alert.id;
            const isResolving = resolvingId === alert.id;

            return (
              <div
                key={alert.id}
                className={`rounded-lg border p-4.5 transition-all shadow-xs ${badge.cardBg}`}
              >
                {/* Alert Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${badge.bg}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>

                      {alert.status === "ACKNOWLEDGED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          ACKNOWLEDGED
                        </span>
                      )}

                      {alert.status === "RESOLVED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300">
                          RESOLVED
                        </span>
                      )}

                      {alert.suppressionStats?.suppressedCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          title="Duplicate events suppressed by cooldown engine"
                        >
                          🛡️ {alert.suppressionStats.suppressedCount} duplicate(s) suppressed
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {alert.title}
                    </h3>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>Triggered: {new Date(alert.triggeredAt).toLocaleTimeString()}</span>
                    </div>
                    <div>Valid until: {new Date(alert.validUntil).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Location Metadata */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {alert.locationName}, {alert.state}
                  </span>
                  {alert.basin && (
                    <span className="text-slate-600 dark:text-slate-400">
                      <strong>Basin:</strong> {alert.basin}
                    </span>
                  )}
                  {alert.elevationM && (
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {alert.elevationM} m AMSL
                    </span>
                  )}
                  {alert.powerAsset && (
                    <span className="text-amber-800 dark:text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {alert.powerAsset}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {alert.description}
                </p>

                {/* Trigger Pills */}
                {alert.triggers && alert.triggers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {alert.triggers.map((trig, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-[11px] font-mono text-slate-800 dark:text-slate-200"
                      >
                        ⚠️ {trig.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Acknowledgment details if already acknowledged */}
                {alert.acknowledgedAt && (
                  <div className="mt-3 p-2.5 rounded bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      Acknowledged by {alert.acknowledgedBy} at{" "}
                      {new Date(alert.acknowledgedAt).toLocaleString()}
                    </div>
                    {alert.acknowledgmentNotes && (
                      <div className="mt-1 text-[11px] text-blue-800 dark:text-blue-300">
                        "{alert.acknowledgmentNotes}"
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution details if resolved */}
                {alert.resolvedAt && (
                  <div className="mt-3 p-2.5 rounded bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                    <div className="font-bold">
                      Resolved by {alert.resolvedBy} at{" "}
                      {new Date(alert.resolvedAt).toLocaleString()}
                    </div>
                    {alert.resolutionReason && (
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        Reason: {alert.resolutionReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable Recommended Actions */}
                {isExpanded && alert.recommendedActions && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      Mandatory Disaster Management Protocols:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                      {alert.recommendedActions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>

                    {alert.escalationHistory && alert.escalationHistory.length > 0 && (
                      <div className="mt-2 text-[11px] font-mono text-purple-700 dark:text-purple-300">
                        ⚡ Escalation path:{" "}
                        {alert.escalationHistory.map((esc) => `${esc.from} ➔ ${esc.to}`).join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Acknowledge Form */}
                {isAcknowledging && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 space-y-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Acknowledge Early-Warning Alert
                    </div>
                    <input
                      type="text"
                      value={ackName}
                      onChange={(e) => setAckName(e.target.value)}
                      placeholder="Operator / Forecaster Name"
                      className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <textarea
                      value={ackNotes}
                      onChange={(e) => setAckNotes(e.target.value)}
                      placeholder="Add operational dispatch notes (e.g., SDRF alerted, barrage gates pre-opened)..."
                      className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setAcknowledgingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                      >
                        Confirm Acknowledgment
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Resolve Form */}
                {isResolving && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Resolve Early-Warning Alert
                    </div>
                    <input
                      type="text"
                      value={resolveReason}
                      onChange={(e) => setResolveReason(e.target.value)}
                      placeholder="Enter resolution rationale (e.g., rainfall subsided below 10 mm/h)..."
                      className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setResolvingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded cursor-pointer"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Hide Recommended Actions
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> View Recommended Actions &amp; Protocols
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {alert.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAcknowledgingId(alert.id);
                          setResolvingId(null);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      >
                        Acknowledge Alert
                      </button>
                    )}

                    {alert.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingId(alert.id);
                          setAcknowledgingId(null);
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

