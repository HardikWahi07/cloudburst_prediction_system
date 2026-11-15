import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  Droplets,
  Gauge,
  Info,
  Layers,
  MapPin,
  Mountain,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";

export default function WeatherAnalyticsPanel({
  weather,
  activeLocation,
  onRefresh,
  loading = false,
}) {
  const [activeChartTab, setActiveChartTab] = useState("hourly"); // "hourly" or "daily"
  const [dailyHoverIdx, setDailyHoverIdx] = useState(null);

  if (!weather) return null;

  const current = weather.current || {};
  const hourly = weather.hourly || {};
  const daily = weather.daily || {};
  const historicalVsForecast = weather.historicalVsForecast || null;
  const locationSummary = weather.locationSummary || null;
  const liveFreshness = weather.liveFreshness || null;
  const risk = weather.risk || {};

  // Build Daily Chart points
  const dailyPoints = [];
  if (Array.isArray(daily.time)) {
    const todayStr = (current.time || new Date().toISOString()).slice(0, 10);
    daily.time.forEach((date, idx) => {
      dailyPoints.push({
        date,
        dayLabel: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }),
        isPast: date < todayStr,
        isToday: date === todayStr,
        isFuture: date > todayStr,
        precipSum: Number(daily.precipitationSum?.[idx] ?? 0),
        precipHours: Number(daily.precipitationHours?.[idx] ?? 0),
        probMax: Number(daily.precipitationProbabilityMax?.[idx] ?? 0),
        tempMax: Number(daily.temperatureMax?.[idx] ?? 0),
        tempMin: Number(daily.temperatureMin?.[idx] ?? 0),
        windMax: Number(daily.windSpeedMax?.[idx] ?? 0),
      });
    });
  }

  // Daily Chart sizing
  const dWidth = 840;
  const dHeight = 220;
  const dPadL = 44;
  const dPadR = 48;
  const dPadT = 20;
  const dPadB = 36;
  const dPlotW = dWidth - dPadL - dPadR;
  const dPlotH = dHeight - dPadT - dPadB;
  const maxDailyPrecip = Math.max(15, ...dailyPoints.map((p) => p.precipSum));
  const dStepX = dailyPoints.length ? dPlotW / dailyPoints.length : 1;
  const dBarWidth = Math.max(14, dStepX * 0.48);

  const activeDaily = dailyHoverIdx !== null ? dailyPoints[dailyHoverIdx] : null;

  return (
    <div className="mt-8 space-y-6" id="weather-analytics">
      {/* 1. Live Data Freshness & Ingestion Telemetry Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Sensor Telemetry &amp; Ingestion Freshness
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    liveFreshness?.status === "STALE"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300"
                      : liveFreshness?.status === "RECENT"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      liveFreshness?.status === "STALE"
                        ? "bg-red-500"
                        : liveFreshness?.status === "RECENT"
                        ? "bg-amber-500"
                        : "bg-emerald-500 animate-ping"
                    }`}
                  />
                  {liveFreshness?.label || "Live Telemetry"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data pipeline sync status with high-resolution numerical weather prediction assimilations.
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Poll Upstream AWS
            </button>
          )}
        </div>

        {/* 4 Metadata Telemetry Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Observation Age
            </div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {liveFreshness?.relativeAgeText || "Just now"}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Obs: {current.time ? current.time.replace("T", " ") : "Live"}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-500" /> Cache Pipeline
            </div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {liveFreshness?.isCached ? "L1 In-Memory Buffer" : "Fresh Upstream Sync"}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              TTL: {liveFreshness?.cacheAgeSeconds ?? 0}s age
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" /> Numerical Model
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-0.5 truncate" title={liveFreshness?.provider}>
              ECMWF IFS / DWD ICON
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Spatial res: ~1-3 km mesh
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" /> Ingestion Latency
            </div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {liveFreshness?.latencyMs ?? 145} ms
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
              ● Upstream Healthy
            </div>
          </div>
        </div>
      </div>

      {/* 2. Historical versus Forecast Comparison Analytics */}
      {historicalVsForecast && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Historical vs. Forecast Convective Deluge Analytics
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    historicalVsForecast.delta?.intensityTrend === "SURGING"
                      ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300"
                      : historicalVsForecast.delta?.intensityTrend === "INTENSIFYING"
                      ? "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300"
                      : historicalVsForecast.delta?.intensityTrend === "SUBSIDING"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
                  }`}
                >
                  Trend: {historicalVsForecast.delta?.intensityTrend}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Side-by-side analysis of past 24-hour recorded precipitation versus next 24-hour predictive accumulation.
              </p>
            </div>
          </div>

          {/* Comparative Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Past 24h Observed */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Observed (Past 24 Hours)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 font-mono">
                  Recorded
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {historicalVsForecast.observedPast24h.accumRainMm}
                </span>
                <span className="text-xs font-semibold text-slate-500">mm total</span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="flex justify-between">
                  <span>Peak Rain Rate:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {historicalVsForecast.observedPast24h.peakRainRateMmH} mm/h
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Rain Duration:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {historicalVsForecast.observedPast24h.rainyHours} hrs
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Mean CAPE:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {historicalVsForecast.observedPast24h.avgCape} J/kg
                  </strong>
                </div>
              </div>
            </div>

            {/* Card 2: Anomaly / Delta Shift */}
            <div
              className={`p-4 rounded-lg border text-xs flex flex-col justify-between ${
                historicalVsForecast.delta.intensityTrend === "SURGING"
                  ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                  : historicalVsForecast.delta.intensityTrend === "INTENSIFYING"
                  ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                  : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              }`}
            >
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" /> 24h Anomaly &amp; Shift
                </span>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-black font-mono ${
                      historicalVsForecast.delta.rainDeltaMm > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {historicalVsForecast.delta.rainDeltaMm >= 0 ? "+" : ""}
                    {historicalVsForecast.delta.rainDeltaMm} mm
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    ({historicalVsForecast.delta.rainDeltaPercent >= 0 ? "+" : ""}
                    {historicalVsForecast.delta.rainDeltaPercent}%)
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  {historicalVsForecast.delta.summaryText}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-current/15 flex items-center justify-between font-mono text-[11px]">
                <span>Convective Trend:</span>
                <strong
                  className={
                    historicalVsForecast.delta.convectiveTrend === "ESCALATING"
                      ? "text-red-600 dark:text-red-400 font-bold"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {historicalVsForecast.delta.convectiveTrend}
                </strong>
              </div>
            </div>

            {/* Card 3: Next 24h Forecast */}
            <div className="p-4 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[10px]">
                  Forecast Horizon (Next 24 Hours)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-600 text-white font-mono font-bold">
                  Predictive
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
                  {historicalVsForecast.forecastNext24h.accumRainMm}
                </span>
                <span className="text-xs font-semibold text-slate-500">mm forecast</span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-blue-200/80 dark:border-blue-800/80">
                <div className="flex justify-between">
                  <span>Peak Forecast Rate:</span>
                  <strong className="text-blue-900 dark:text-blue-200">
                    {historicalVsForecast.forecastNext24h.peakRainRateMmH} mm/h
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Peak Probability:</span>
                  <strong className="text-blue-900 dark:text-blue-200">
                    {historicalVsForecast.forecastNext24h.maxProbability}%
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Peak Convective CAPE:</span>
                  <strong className="text-blue-900 dark:text-blue-200">
                    {historicalVsForecast.forecastNext24h.maxCape} J/kg
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Daily & Multi-Day Rainfall Trend Chart */}
      {dailyPoints.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Multi-Day Daily Rainfall Inundation &amp; Forecast Trend
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {dailyPoints.length}-DAY CONTINUOUS TIMELINE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Past observed precipitation days compared seamlessly with upcoming 5-day daily forecast accumulations.
              </p>
            </div>

            {/* Hover Legend */}
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {activeDaily ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeDaily.date} ({activeDaily.isPast ? "Past" : activeDaily.isToday ? "Today" : "Forecast"})
                  </span>
                  <span>Rain: <strong>{activeDaily.precipSum} mm</strong></span>
                  <span>Prob: <strong>{activeDaily.probMax}%</strong></span>
                  <span>Temp: {activeDaily.tempMin}°C - {activeDaily.tempMax}°C</span>
                  <span>Peak Wind: {activeDaily.windMax} km/h</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-xs bg-slate-400" /> Past Observed (mm)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-xs bg-blue-600" /> Forecast Accumulation (mm)
                  </span>
                  <span className="text-slate-400">Hover bar for daily stats</span>
                </div>
              )}
            </div>
          </div>

          {/* Daily SVG Chart */}
          <div className="relative overflow-x-auto">
            <svg
              viewBox={`0 0 ${dWidth} ${dHeight}`}
              className="w-full h-auto select-none cursor-crosshair min-w-[650px]"
              role="img"
              aria-label="Multi-day daily precipitation chart"
              onMouseLeave={() => setDailyHoverIdx(null)}
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const y = dPadT + dPlotH - frac * dPlotH;
                const val = (frac * maxDailyPrecip).toFixed(0);
                return (
                  <g key={frac}>
                    <line
                      x1={dPadL}
                      y1={y}
                      x2={dWidth - dPadR}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="1"
                    />
                    <text
                      x={dPadL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {val} mm
                    </text>
                  </g>
                );
              })}

              {/* Bars for Each Day */}
              {dailyPoints.map((point, idx) => {
                const barH = (point.precipSum / maxDailyPrecip) * dPlotH;
                const x = dPadL + idx * dStepX + (dStepX - dBarWidth) / 2;
                const y = dPadT + dPlotH - barH;
                const isHovered = dailyHoverIdx === idx;

                const barFill = point.isPast
                  ? isHovered ? "#475569" : "#64748b"
                  : point.isToday
                  ? isHovered ? "#2563eb" : "#3b82f6"
                  : isHovered ? "#0284c7" : "#0ea5e9";

                return (
                  <g key={point.date}>
                    {/* Background Today Highlight */}
                    {point.isToday && (
                      <rect
                        x={dPadL + idx * dStepX}
                        y={dPadT}
                        width={dStepX}
                        height={dPlotH}
                        fill="#3b82f6"
                        fillOpacity="0.08"
                      />
                    )}

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={dBarWidth}
                      height={Math.max(2, barH)}
                      rx="3"
                      fill={barFill}
                    />

                    {/* Value Label above bar */}
                    {point.precipSum > 0 && (
                      <text
                        x={x + dBarWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="fill-slate-600 dark:fill-slate-300 text-[10px] font-mono font-bold"
                      >
                        {point.precipSum}
                      </text>
                    )}

                    {/* X-axis Day Label */}
                    <text
                      x={x + dBarWidth / 2}
                      y={dHeight - 14}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        point.isToday
                          ? "fill-blue-600 dark:fill-blue-400 font-bold"
                          : "fill-slate-500"
                      }`}
                    >
                      {point.dayLabel}
                    </text>

                    {/* Today Marker */}
                    {point.isToday && (
                      <text
                        x={x + dBarWidth / 2}
                        y={dHeight - 3}
                        textAnchor="middle"
                        className="fill-blue-600 text-[8px] font-bold uppercase tracking-wider"
                      >
                        Today
                      </text>
                    )}

                    {/* Hit box */}
                    <rect
                      x={dPadL + idx * dStepX}
                      y={dPadT}
                      width={dStepX}
                      height={dPlotH}
                      fill="transparent"
                      onMouseEnter={() => setDailyHoverIdx(idx)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* 4. Location-Specific Weather Summaries Card */}
      {locationSummary && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <Mountain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Location-Specific Orographic Synopsis: {locationSummary.stationName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Topographical altitude classification, catchment hydrology, and critical grid protection brief.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
              Elevation: {locationSummary.elevationM} m AMSL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
            {/* Column 1: Altitude & Catchment Context */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                Orographic &amp; Altitude Zone
              </div>
              <div className="font-semibold text-blue-700 dark:text-blue-300 text-xs">
                {locationSummary.altitudeZone}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong>River Basin:</strong> {locationSummary.basin}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong>State / Province:</strong> {locationSummary.state}
              </div>
            </div>

            {/* Column 2: Hydropower & Civil Infrastructure Impact */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Downstream Infrastructure
              </div>
              <div className="font-semibold text-amber-800 dark:text-amber-300 text-xs">
                {locationSummary.criticalPowerAsset}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Vulnerability:</strong> {locationSummary.orographicVulnerability}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Responsible Agency:</strong> {locationSummary.metAgency}
              </div>
            </div>

            {/* Column 3: Operational Meteorological Briefing */}
            <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2">
              <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Actionable Operations Brief
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {locationSummary.actionableBriefing}
              </p>
            </div>
          </div>

          {/* Full Synopsis Paragraph */}
          <div className="mt-3.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/20 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            <strong>Executive Meteorological Synopsis:</strong> {locationSummary.synopsis}
          </div>
        </div>
      )}
    </div>
  );
}
