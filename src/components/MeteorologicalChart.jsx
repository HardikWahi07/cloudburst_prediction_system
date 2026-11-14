import { useState } from "react";

export default function MeteorologicalChart({
  hourly,
  currentTime,
  timezoneLabel = "Local",
}) {
  const [secondarySeries, setSecondarySeries] = useState("probability");
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = [];
  for (const [index, time] of (hourly?.time ?? []).entries()) {
    if (time <= currentTime) continue;
    points.push({
      time,
      label: time.slice(11, 16),
      precipitation: Number.isFinite(hourly.precipitation?.[index])
        ? hourly.precipitation[index]
        : 0,
      probability: Number.isFinite(hourly.precipitationProbability?.[index])
        ? hourly.precipitationProbability[index]
        : 0,
      cape: Number.isFinite(hourly.cape?.[index]) ? hourly.cape[index] : 0,
      humidity: Number.isFinite(hourly.humidity?.[index])
        ? hourly.humidity[index]
        : null,
      pressure: Number.isFinite(hourly.pressure?.[index])
        ? hourly.pressure[index]
        : null,
    });
    if (points.length === 24) break;
  }

  if (points.length === 0) return null;

  const width = 880;
  const height = 240;
  const padLeft = 48;
  const padRight = 54;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRain = Math.max(10, ...points.map((p) => p.precipitation));
  const maxSecondary =
    secondarySeries === "probability"
      ? 100
      : Math.max(1000, ...points.map((p) => p.cape));

  const stepX = plotW / points.length;
  const barWidth = Math.max(8, stepX * 0.56);

  const getSecondaryY = (point) => {
    const val = secondarySeries === "probability" ? point.probability : point.cape;
    return padTop + plotH - (val / maxSecondary) * plotH;
  };

  const linePath = points
    .map((point, idx) => {
      const x = padLeft + idx * stepX + stepX / 2;
      const y = getSecondaryY(point);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            24-Hour Precipitation &amp; Convective Pattern
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hourly rainfall accumulation (mm/h) plotted against{" "}
            {secondarySeries === "probability"
              ? "precipitation probability (%)"
              : "convective available potential energy (CAPE J/kg)"}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
          role="group"
          aria-label="Secondary overlay metric"
        >
          <button
            type="button"
            onClick={() => setSecondarySeries("probability")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              secondarySeries === "probability"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rain &amp; Probability
          </button>
          <button
            type="button"
            onClick={() => setSecondarySeries("cape")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              secondarySeries === "cape"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rain &amp; CAPE
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="min-h-6 mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-600">
          {activePoint ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-900">
                {activePoint.time.replace("T", " ")} {timezoneLabel}
              </span>
              <span>Rain: {activePoint.precipitation.toFixed(1)} mm/h</span>
              <span>Prob: {activePoint.probability}%</span>
              <span>CAPE: {Math.round(activePoint.cape)} J/kg</span>
              {activePoint.humidity !== null && <span>RH: {activePoint.humidity}%</span>}
              {activePoint.pressure !== null && (
                <span>P: {activePoint.pressure.toFixed(1)} hPa</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-5">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-2.5 bg-blue-600 rounded-xs" />
                Precipitation (mm/h)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-4 border-t-2 border-dashed border-amber-600" />
                {secondarySeries === "probability"
                  ? "Probability (%)"
                  : "CAPE (J/kg)"}
              </span>
              <span className="text-slate-400">Hover chart to inspect hourly telemetry</span>
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          role="img"
          aria-label="24-hour meteorological forecast dual-axis chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padTop + plotH - fraction * plotH;
            const leftVal = (fraction * maxRain).toFixed(0);
            const rightVal = Math.round(fraction * maxSecondary);
            return (
              <g key={fraction}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {leftVal}
                </text>
                <text
                  x={width - padRight + 8}
                  y={y + 4}
                  textAnchor="start"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {secondarySeries === "probability" ? `${rightVal}%` : rightVal}
                </text>
              </g>
            );
          })}

          {points.map((point, idx) => {
            const barH = (point.precipitation / maxRain) * plotH;
            const x = padLeft + idx * stepX + (stepX - barWidth) / 2;
            const y = padTop + plotH - barH;
            const isHovered = hoverIndex === idx;
            return (
              <g key={point.time}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(1, barH)}
                  rx="2"
                  fill={isHovered ? "#1D4ED8" : "#3B82F6"}
                  fillOpacity={point.precipitation > 0 ? 0.85 : 0.2}
                />
                {idx % 4 === 0 && (
                  <text
                    x={padLeft + idx * stepX + stepX / 2}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}

          <path
            d={linePath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {hoverIndex !== null && (
            <line
              x1={padLeft + hoverIndex * stepX + stepX / 2}
              y1={padTop}
              x2={padLeft + hoverIndex * stepX + stepX / 2}
              y2={padTop + plotH}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {points.map((point, idx) => (
            <rect
              key={`hit-${point.time}`}
              x={padLeft + idx * stepX}
              y={padTop}
              width={stepX}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
