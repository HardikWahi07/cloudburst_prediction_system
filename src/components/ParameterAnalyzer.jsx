import { useState } from "react";
import { AlertTriangle, CheckCircle2, OctagonAlert, SlidersHorizontal } from "lucide-react";

const PRESETS = [
  {
    id: "baseline",
    label: "Monsoon Baseline",
    params: {
      rainfallMmHr: 6,
      pressureDrop3h: 0.6,
      cape: 420,
      humidity: 78,
      dewSpread: 3.4,
      windSpeed: 14,
    },
  },
  {
    id: "convergence",
    label: "Orographic Convergence",
    params: {
      rainfallMmHr: 28,
      pressureDrop3h: 1.8,
      cape: 1150,
      humidity: 91,
      dewSpread: 1.4,
      windSpeed: 32,
    },
  },
  {
    id: "instability",
    label: "Pre-Cloudburst Watch",
    params: {
      rainfallMmHr: 68,
      pressureDrop3h: 3.1,
      cape: 2150,
      humidity: 96,
      dewSpread: 0.6,
      windSpeed: 48,
    },
  },
  {
    id: "extreme",
    label: "Cloudburst (>=100 mm/h)",
    params: {
      rainfallMmHr: 112,
      pressureDrop3h: 4.5,
      cape: 2950,
      humidity: 99,
      dewSpread: 0.2,
      windSpeed: 64,
    },
  },
];

function evaluateCloudburstModel(params, elevationM = 1800) {
  const rainPoints = Math.min(48, (params.rainfallMmHr / 100) * 48);
  const pressurePoints = Math.min(16, (params.pressureDrop3h / 4) * 16);
  const capePoints = Math.min(16, (params.cape / 2500) * 16);
  const humidityPoints =
    params.humidity >= 92 ? 10 : params.humidity >= 82 ? 6 : params.humidity >= 70 ? 3 : 0;
  const dewPoints = params.dewSpread <= 1 ? 6 : params.dewSpread <= 2.5 ? 3 : 0;
  const windPoints = Math.min(4, (params.windSpeed / 60) * 4);

  const score = Math.min(
    100,
    Math.round(
      rainPoints +
        pressurePoints +
        capePoints +
        humidityPoints +
        dewPoints +
        windPoints,
    ),
  );

  const level = score >= 60 ? "High" : score >= 28 ? "Watch" : "Low";

  let imdClass = "Dry / Light";
  if (params.rainfallMmHr >= 100) imdClass = "Cloudburst Threshold (>=100 mm/h)";
  else if (params.rainfallMmHr >= 64.5) imdClass = "Very Heavy Rain (64.5–99.9 mm/h)";
  else if (params.rainfallMmHr >= 15.6) imdClass = "Heavy Rain (15.6–64.4 mm/h)";
  else if (params.rainfallMmHr >= 2.5) imdClass = "Moderate Rain (2.5–15.5 mm/h)";

  // Higher-elevation steep Himalayan catchments compress flash-flood concentration times.
  const baseLeadMin = elevationM >= 2000 ? 35 : elevationM >= 1200 ? 50 : 70;
  const runoffWindowMin = Math.max(
    15,
    Math.round(baseLeadMin - (params.rainfallMmHr / 120) * 20),
  );

  const checklist =
    level === "High"
      ? [
          "Issue immediate Flash-Flood & Spillway Gate Standby alert to downstream hydro plants.",
          "Initiate controlled reservoir drawdown and silt-flushing protocol.",
          "Switch 220/400 kV valley substations to N-1 contingency islanding readiness.",
          "Transmit 15-minute telemetry bulletin to IMD Regional Met Centre & SDMA.",
        ]
      : level === "Watch"
        ? [
            "Place intake weir and spillway gate operators on 30-minute observation cadence.",
            "Verify automatic weather station (AWS) and Doppler radar telemetry links.",
            "Monitor upstream tributary gauge rise and debris load trends.",
          ]
        : [
            "Maintain nominal reservoir inflow-outflow generation balance.",
            "Continue scheduled 3-hour synoptic meteorological parameter logging.",
          ];

  return { score, level, imdClass, runoffWindowMin, checklist };
}

function RadarProfile({ params }) {
  const axes = [
    { label: "RAIN", norm: Math.min(1, params.rainfallMmHr / 120) },
    { label: "dP/3h", norm: Math.min(1, params.pressureDrop3h / 5) },
    { label: "CAPE", norm: Math.min(1, params.cape / 3000) },
    { label: "RH%", norm: Math.min(1, Math.max(0, (params.humidity - 30) / 70)) },
    { label: "WIND", norm: Math.min(1, params.windSpeed / 70) },
  ];

  const cx = 120;
  const cy = 112;
  const r = 74;

  const getPoint = (index, ratio) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    return [cx + Math.cos(angle) * r * ratio, cy + Math.sin(angle) * r * ratio];
  };

  const polygonPoints = axes
    .map((axis, i) => getPoint(i, Math.max(0.08, axis.norm)).join(","))
    .join(" ");

  return (
    <svg
      viewBox="0 0 240 225"
      className="w-full max-w-[240px] h-auto mx-auto"
      role="img"
      aria-label="5-axis meteorological parameter profile"
    >
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => getPoint(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      ))}
      {axes.map((axis, i) => {
        const [x, y] = getPoint(i, 1);
        const [lx, ly] = getPoint(i, 1.24);
        return (
          <g key={axis.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#CBD5E1" strokeWidth="1" />
            <text
              x={lx}
              y={ly + 3}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] font-mono font-medium"
            >
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon
        points={polygonPoints}
        fill="rgba(37, 99, 235, 0.18)"
        stroke="#2563EB"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function ParameterAnalyzer({ town, weather }) {
  const [activePreset, setActivePreset] = useState("convergence");
  const [params, setParams] = useState(PRESETS[1].params);

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setParams(preset.params);
  };

  const syncFromLive = () => {
    if (!weather?.current) return;
    setActivePreset("live");
    setParams({
      rainfallMmHr: Math.min(
        150,
        Math.round(
          Math.max(weather.current.rain ?? 0, weather.risk?.peakRain3h ?? 0),
        ),
      ),
      pressureDrop3h: Math.max(
        0,
        Math.min(6, weather.risk?.pressureDrop3h ?? 0.5),
      ),
      cape: Math.min(3500, Math.round(weather.risk?.peakCape ?? 400)),
      humidity: Math.round(weather.current.humidity ?? 75),
      dewSpread: Math.max(0, Math.min(12, weather.current.dewPointSpread ?? 2.5)),
      windSpeed: Math.min(90, Math.round(weather.current.windSpeed ?? 12)),
    });
  };

  const updateParam = (key, value) => {
    setActivePreset("custom");
    setParams((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const result = evaluateCloudburstModel(params, town?.elevationM);

  const levelStyles =
    result.level === "High"
      ? "text-red-700 bg-red-50 border-red-200"
      : result.level === "Watch"
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-emerald-800 bg-emerald-50 border-emerald-200";

  const LevelIcon =
    result.level === "High"
      ? OctagonAlert
      : result.level === "Watch"
        ? AlertTriangle
        : CheckCircle2;

  const sliders = [
    {
      key: "rainfallMmHr",
      label: "1-Hour Rainfall Intensity",
      min: 0,
      max: 150,
      step: 1,
      unit: "mm/h",
    },
    {
      key: "pressureDrop3h",
      label: "3-Hour Barometric Pressure Drop",
      min: 0,
      max: 6,
      step: 0.1,
      unit: "hPa",
    },
    {
      key: "cape",
      label: "Convective Energy (CAPE)",
      min: 0,
      max: 3500,
      step: 50,
      unit: "J/kg",
    },
    {
      key: "humidity",
      label: "Relative Humidity",
      min: 20,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      key: "dewSpread",
      label: "Dew Point Depression (T - Td)",
      min: 0,
      max: 12,
      step: 0.2,
      unit: "°C",
    },
    {
      key: "windSpeed",
      label: "Orographic Wind Speed",
      min: 0,
      max: 90,
      step: 1,
      unit: "km/h",
    },
  ];

  return (
    <section
      id="analyzer"
      className="mt-10 border border-slate-200 bg-white rounded-lg p-6"
      aria-labelledby="analyzer-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 id="analyzer-heading" className="text-lg font-semibold text-slate-900">
            Meteorological Pattern &amp; Cloudburst Threshold Analyzer
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Interactive parameter sensitivity model for local meteorological agencies and
            Ministry of Power dam control rooms to evaluate convective instability and
            runoff response{town ? ` in ${town.basin} (${town.elevationM} m)` : ""}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {weather?.current && (
            <button
              type="button"
              onClick={syncFromLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Sync From Live Station
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-4 p-1 bg-slate-100 rounded-md border border-slate-200 w-fit max-w-full">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePreset === preset.id
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {sliders.map((slider) => (
            <label key={slider.key} className="block">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-700">
                  {slider.label}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                  {slider.step < 1
                    ? Number(params[slider.key]).toFixed(1)
                    : params[slider.key]}{" "}
                  <span className="text-slate-400 font-normal">{slider.unit}</span>
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={params[slider.key]}
                onChange={(e) => updateParam(slider.key, e.target.value)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-7">
          <div className={`flex items-center justify-between gap-3 px-4 py-3 border rounded-md ${levelStyles}`}>
            <div className="flex items-center gap-2.5">
              <LevelIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold">
                {result.level} Cloudburst Risk
              </span>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {result.score} / 100
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 mt-4 pb-4 border-b border-slate-200 text-xs">
            <div>
              <dt className="text-slate-500">IMD Intensity Class</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{result.imdClass}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Basin Runoff Lead Time</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                ~{result.runoffWindowMin} min
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <RadarProfile params={params} />
          </div>

          <div className="mt-3">
            <h3 className="text-xs font-semibold text-slate-800 mb-2">
              Ministry of Power &amp; Agency Protocol
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
