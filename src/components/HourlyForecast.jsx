import { useState } from "react";
import { Download } from "lucide-react";

function classifyRainfall(mm) {
  if (!Number.isFinite(mm)) return "Unavailable";
  if (mm >= 100) return "Cloudburst (>=100 mm/h)";
  if (mm >= 64.5) return "Very Heavy";
  if (mm >= 15.6) return "Heavy";
  if (mm >= 2.5) return "Moderate";
  if (mm > 0) return "Light";
  return "Dry";
}

export default function HourlyForecast({
  hourly,
  currentTime,
  stationName,
  timezoneLabel = "Local",
}) {
  const [horizonHours, setHorizonHours] = useState(12);

  const rows = [];
  for (const [index, time] of (hourly?.time ?? []).entries()) {
    if (time <= currentTime) continue;
    rows.push({
      time,
      precipitation: hourly.precipitation?.[index],
      probability: hourly.precipitationProbability?.[index],
      cape: hourly.cape?.[index],
      humidity: hourly.humidity?.[index],
      pressure: hourly.pressure?.[index],
    });
    if (rows.length === horizonHours) break;
  }

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = [
      `Time_${timezoneLabel}`,
      "Rainfall_mm_hr",
      "Probability_pct",
      "CAPE_J_kg",
      "Humidity_pct",
      "Pressure_hPa",
      "IMD_Classification",
    ].join(",");

    const lines = rows.map((row) =>
      [
        row.time,
        Number.isFinite(row.precipitation) ? row.precipitation : "",
        Number.isFinite(row.probability) ? row.probability : "",
        Number.isFinite(row.cape) ? Math.round(row.cape) : "",
        Number.isFinite(row.humidity) ? row.humidity : "",
        Number.isFinite(row.pressure) ? row.pressure : "",
        `"${classifyRainfall(row.precipitation)}"`,
      ].join(","),
    );

    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = (stationName || "station").toLowerCase().replace(/\s+/g, "-");
    link.download = `${slug}-meteorological-forecast.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (rows.length === 0) return null;

  return (
    <div className="mt-8 border border-slate-200 bg-white rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Hourly Meteorological Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Next {rows.length} hours · {timezoneLabel} · Open-Meteo &amp; IMD intensity classes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
            role="group"
            aria-label="Forecast horizon"
          >
            {[6, 12, 24].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setHorizonHours(hours)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  horizonHours === hours
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left"
          aria-label="Upcoming hourly meteorological forecast"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
              <th scope="col" className="px-5 py-2.5">
                Time ({timezoneLabel})
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Rainfall
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Chance
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                CAPE
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Humidity
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Pressure
              </th>
              <th scope="col" className="px-5 py-2.5">
                IMD Intensity Tier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.map(({ time, precipitation, probability, cape, humidity, pressure }) => {
              const [date, hour] = time.split("T");
              const isHigh = Number.isFinite(precipitation) && precipitation >= 15.6;
              return (
                <tr
                  key={time}
                  className="hover:bg-slate-50/80 transition-colors h-10"
                >
                  <th
                    scope="row"
                    className="px-5 py-2 font-mono text-xs font-medium text-slate-800 whitespace-nowrap tabular-nums"
                  >
                    <time dateTime={time}>
                      {hour}
                      {date !== currentTime.slice(0, 10) && (
                        <span className="text-slate-400 ml-1.5">({date.slice(5)})</span>
                      )}
                    </time>
                  </th>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-900 font-medium">
                    {Number.isFinite(precipitation) ? `${precipitation.toFixed(1)} mm` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-700">
                    {Number.isFinite(probability) ? `${probability}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-700">
                    {Number.isFinite(cape) ? `${Math.round(cape)} J/kg` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-700">
                    {Number.isFinite(humidity) ? `${humidity}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-700">
                    {Number.isFinite(pressure) ? `${pressure.toFixed(1)} hPa` : "—"}
                  </td>
                  <td
                    className={`px-5 py-2 text-xs whitespace-nowrap ${
                      isHigh ? "font-semibold text-amber-700" : "text-slate-600"
                    }`}
                  >
                    {classifyRainfall(precipitation)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
