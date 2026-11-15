import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Moon,
  OctagonAlert,
  RefreshCw,
  Search,
  Sun,
} from "lucide-react";
import {
  getCountries,
  getLocations,
  getWeather,
  searchLocations,
} from "./services/weather.service";
import HourlyForecast from "./components/HourlyForecast";
import MeteorologicalChart from "./components/MeteorologicalChart";
import ParameterAnalyzer from "./components/ParameterAnalyzer";
import WorldRiskMap from "./components/WorldRiskMap";
import EarlyWarningAlertCenter from "./components/EarlyWarningAlertCenter";

const CITY_STORAGE_KEY = "cloudburst.selectedCity";
const THEME_STORAGE_KEY = "cloudburst.theme";
const PAGE_SIZE = 50;

function readSavedTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  } catch {
    return "dark";
  }
}

function readSavedCity() {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === "string" &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCity(city) {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
  } catch {
    // Selection still updates in memory when storage is restricted.
  }
}

function formatLocalTimestamp(isoLocal, tzLabel) {
  if (!isoLocal) return "Unavailable";
  const [date, time] = isoLocal.split("T");
  return `${date} ${time} ${tzLabel || "Local"}`;
}

function formatPeakTime(peakTime, currentTime, tzLabel) {
  if (!peakTime || !currentTime) return "Unavailable";
  const [date, time] = peakTime.split("T");
  const day = date === currentTime.slice(0, 10) ? "" : ` (${date})`;
  return `${time} ${tzLabel || "Local"}${day}`;
}

function getRiskAppearance(level) {
  if (level === "Critical") {
    return {
      container: "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100",
      badgeText: "text-red-700 dark:text-red-300",
      badgeBg: "bg-red-600 text-white",
      Icon: OctagonAlert,
      category: "Critical",
    };
  }
  if (level === "High") {
    return {
      container: "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-950 dark:text-orange-100",
      badgeText: "text-orange-700 dark:text-orange-300",
      badgeBg: "bg-orange-600 text-white",
      Icon: AlertTriangle,
      category: "High",
    };
  }
  if (level === "Moderate" || level === "Watch") {
    return {
      container: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100",
      badgeText: "text-amber-800 dark:text-amber-300",
      badgeBg: "bg-amber-600 text-white",
      Icon: AlertTriangle,
      category: "Moderate",
    };
  }
  return {
    container: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    badgeBg: "bg-emerald-600 text-white",
    Icon: CheckCircle2,
    category: "Low",
  };
}

function App() {
  const [theme, setTheme] = useState(readSavedTheme);
  const [priorityStations, setPriorityStations] = useState(null);
  const [locationsAttempt, setLocationsAttempt] = useState(0);
  const [selectedCity, setSelectedCity] = useState(readSavedCity);
  const [weather, setWeather] = useState(null);
  const [thresholdProfile, setThresholdProfile] = useState("balanced");
  const [locationsError, setLocationsError] = useState("");
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [pending, setPending] = useState(true);

  // Sync theme with document root class and storage
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage unavailable
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Global quick search combobox state
  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [quickSearching, setQuickSearching] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const quickSearchRef = useRef(null);

  // Directory browser state
  const [directoryTab, setDirectoryTab] = useState("world");
  const [stateFilter, setStateFilter] = useState("All");
  const [stationQuery, setStationQuery] = useState("");
  const [countries, setCountries] = useState([]);
  const [totalWorldCities, setTotalWorldCities] = useState(135233);
  const [worldCountry, setWorldCountry] = useState("ALL");
  const [worldQuery, setWorldQuery] = useState("");
  const [worldPage, setWorldPage] = useState(0);
  const [worldData, setWorldData] = useState({ total: 0, results: [] });
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState("");

  const activeLocation =
    selectedCity ||
    priorityStations?.find((location) => location.name === "Dehradun") ||
    priorityStations?.[0];

  const { latitude, longitude } = activeLocation || {};
  const loading =
    !locationsError &&
    !error &&
    (priorityStations === null || (activeLocation && pending));
  const summary = weather?.summary;
  const tzLabel = weather?.location?.timezoneAbbreviation || "Local";
  const displayElevation =
    activeLocation?.elevationM ?? weather?.location?.elevation ?? null;

  useEffect(() => {
    const controller = new AbortController();

    getLocations(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPriorityStations(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLocationsError(err.message);
      });

    getCountries(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCountries(data.countries || []);
          if (data.totalCities) setTotalWorldCities(data.totalCities);
        }
      })
      .catch(() => {
        // Directory country list loads lazily if needed
      });

    return () => controller.abort();
  }, [locationsAttempt]);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    const controller = new AbortController();

    getWeather(latitude, longitude, { thresholdProfile }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setWeather(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });

    return () => controller.abort();
  }, [latitude, longitude, refreshCount, thresholdProfile]);

  // Quick global city search (debounced 200ms)
  useEffect(() => {
    const trimmed = quickQuery.trim();
    if (!trimmed) {
      setQuickResults([]);
      setQuickSearching(false);
      return;
    }

    const controller = new AbortController();
    setQuickSearching(true);
    const timer = setTimeout(() => {
      searchLocations({ q: trimmed, limit: 12, offset: 0 }, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setQuickResults(data.results || []);
            setQuickOpen(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setQuickResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuickSearching(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quickQuery]);

  // Close quick search popover on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        quickSearchRef.current &&
        !quickSearchRef.current.contains(event.target)
      ) {
        setQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // World cities directory query
  useEffect(() => {
    if (directoryTab !== "world") return;

    const controller = new AbortController();
    setWorldLoading(true);
    setWorldError("");

    const timer = setTimeout(() => {
      searchLocations(
        {
          q: worldQuery.trim(),
          country: worldCountry,
          limit: PAGE_SIZE,
          offset: worldPage * PAGE_SIZE,
        },
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setWorldData({
              total: data.total ?? 0,
              results: data.results ?? [],
            });
            if (data.totalWorldCities) {
              setTotalWorldCities(data.totalWorldCities);
            }
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) setWorldError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setWorldLoading(false);
        });
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [directoryTab, worldQuery, worldCountry, worldPage]);

  const retryLocations = () => {
    setLocationsError("");
    setLocationsAttempt((attempt) => attempt + 1);
  };

  const refreshWeather = () => {
    setPending(true);
    setError("");
    setRefreshCount((count) => count + 1);
  };

  const selectCity = (city) => {
    setSelectedCity(city);
    saveCity(city);
    setPending(true);
    setWeather(null);
    setError("");
    setQuickOpen(false);
  };

  const changePriorityDropdown = (event) => {
    const found = priorityStations?.find((loc) => loc.name === event.target.value);
    if (found) selectCity(found);
  };

  const uniqueStates = priorityStations
    ? ["All", ...Array.from(new Set(priorityStations.map((loc) => loc.state)))]
    : ["All"];

  const filteredPriority = (priorityStations ?? []).filter((loc) => {
    const matchesState = stateFilter === "All" || loc.state === stateFilter;
    const q = stationQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      loc.name.toLowerCase().includes(q) ||
      loc.basin.toLowerCase().includes(q) ||
      loc.powerAsset.toLowerCase().includes(q) ||
      loc.metAgency.toLowerCase().includes(q);
    return matchesState && matchesQuery;
  });

  const telemetryCells = weather
    ? [
        {
          label: "Current Rainfall",
          value: Number.isFinite(weather.current.precipitation)
            ? weather.current.precipitation.toFixed(1)
            : "—",
          unit: "mm/h",
          detail: weather.risk?.imdTier || "Observed precipitation",
        },
        {
          label: "3h Forecast Peak",
          value:
            weather.risk?.peakRain3h !== null &&
            weather.risk?.peakRain3h !== undefined
              ? weather.risk.peakRain3h.toFixed(1)
              : "—",
          unit: "mm/h",
          detail:
            summary?.peakTime && summary?.peakPrecipitationMm > 0
              ? `48h max ${summary.peakPrecipitationMm.toFixed(1)} mm at ${formatPeakTime(summary.peakTime, weather.current.time, tzLabel)}`
              : "Peak in next 3 hours",
        },
        {
          label: "Atmospheric Pressure",
          value: Number.isFinite(weather.current.pressure)
            ? weather.current.pressure.toFixed(1)
            : "—",
          unit: "hPa",
          detail:
            weather.risk?.pressureDrop3h !== null &&
            weather.risk?.pressureDrop3h !== undefined
              ? `3h drop: ${weather.risk.pressureDrop3h > 0 ? `+${weather.risk.pressureDrop3h}` : weather.risk.pressureDrop3h} hPa`
              : "Mean sea-level pressure",
        },
        {
          label: "Relative Humidity",
          value: Number.isFinite(weather.current.humidity)
            ? String(weather.current.humidity)
            : "—",
          unit: "%",
          detail: "Column moisture saturation",
        },
        {
          label: "Dew Point Spread",
          value:
            weather.current.dewPointSpread !== null &&
            weather.current.dewPointSpread !== undefined
              ? weather.current.dewPointSpread.toFixed(1)
              : "—",
          unit: "°C",
          detail: Number.isFinite(weather.current.dewPoint)
            ? `Dew point ${weather.current.dewPoint.toFixed(1)} °C`
            : "T - Td proximity",
        },
        {
          label: "Convective Energy (CAPE)",
          value:
            weather.risk?.peakCape !== null &&
            weather.risk?.peakCape !== undefined
              ? String(Math.round(weather.risk.peakCape))
              : "—",
          unit: "J/kg",
          detail:
            summary?.maxCape !== null && summary?.maxCape !== undefined
              ? `48h peak ${summary.maxCape} J/kg`
              : "3h atmospheric instability",
        },
        {
          label: "Wind & Gusts",
          value: Number.isFinite(weather.current.windSpeed)
            ? weather.current.windSpeed.toFixed(1)
            : "—",
          unit: "km/h",
          detail: Number.isFinite(weather.current.windGusts)
            ? `Gusts up to ${weather.current.windGusts.toFixed(1)} km/h`
            : "10m surface flow",
        },
        {
          label: "Temperature & Cloud Cover",
          value: Number.isFinite(weather.current.temperature)
            ? weather.current.temperature.toFixed(1)
            : "—",
          unit: "°C",
          detail: Number.isFinite(weather.current.cloudCover)
            ? `Cloud cover ${weather.current.cloudCover}%`
            : "Surface air temperature",
        },
      ]
    : [];

  const riskStyle = weather?.risk
    ? getRiskAppearance(weather.risk.level)
    : null;
  const RiskIcon = riskStyle?.Icon;

  const totalPages = Math.max(1, Math.ceil(worldData.total / PAGE_SIZE));
  const rangeStart = worldData.total === 0 ? 0 : worldPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(worldData.total, (worldPage + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#telemetry"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Cloudburst Prediction System
          </a>

          <nav
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
            aria-label="Primary navigation"
          >
            <a
              href="#telemetry"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Telemetry
            </a>
            <a
              href="#world-map"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 text-red-600 font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              World Risk Map
            </a>
            <a
              href="#forecast"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Forecast
            </a>
            <a
              href="#analyzer"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Pattern Lab
            </a>
            <a
              href="#network"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              World Cities
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={refreshWeather}
              disabled={loading || !activeLocation}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh Telemetry
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8">
        <section
          id="telemetry"
          className="pb-8 border-b border-slate-200"
          aria-labelledby="station-heading"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>Ministry of Power</span>
            <span aria-hidden="true">·</span>
            <span>Disaster Management</span>
            <span aria-hidden="true">·</span>
            <span>Regional Meteorological Agencies</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {totalWorldCities.toLocaleString()}+ Global Cities Indexed
            </span>
          </div>

          <div className="mt-3 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1
                id="station-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance"
              >
                {activeLocation
                  ? `${activeLocation.name}, ${activeLocation.country || activeLocation.state}`
                  : "Global Meteorological Station"}
              </h1>
              {activeLocation && (
                <p className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{activeLocation.state}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeLocation.basin}</span>
                  {displayElevation !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {displayElevation} m elevation
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {activeLocation.latitude.toFixed(4)}°,{" "}
                    {activeLocation.longitude.toFixed(4)}°
                  </span>
                </p>
              )}
              {activeLocation && (
                <p className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Infrastructure: {activeLocation.powerAsset}</span>
                  <span aria-hidden="true">·</span>
                  <span>Met Agency: {activeLocation.metAgency}</span>
                  {activeLocation.population > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Pop. {activeLocation.population.toLocaleString()}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shrink-0">
              <div className="relative" ref={quickSearchRef}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Search Any City Worldwide
                </label>
                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    onFocus={() => {
                      if (quickResults.length > 0) setQuickOpen(true);
                    }}
                    placeholder="Type any major or minor city..."
                    aria-label="Search any city in the world"
                    className="w-full sm:w-[270px] min-h-[42px] pl-8 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>

                {quickOpen && quickQuery.trim() && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg z-30 max-h-80 overflow-y-auto">
                    {quickSearching ? (
                      <p className="px-3 py-2.5 text-xs text-slate-500">
                        Searching global cities...
                      </p>
                    ) : quickResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-slate-500">
                        No cities found matching "{quickQuery}".
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {quickResults.map((city) => (
                          <li key={`${city.id}-${city.latitude}-${city.longitude}`}>
                            <button
                              type="button"
                              onClick={() => {
                                selectCity(city);
                                setQuickQuery("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {city.name}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                                  {city.countryCode}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="truncate">
                                  {city.state}, {city.country}
                                </span>
                                {city.population > 0 && (
                                  <span className="font-mono tabular-nums shrink-0">
                                    {city.population.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {priorityStations && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Priority Hydro Stations (IHR)
                  </label>
                  <select
                    value={
                      priorityStations.some((loc) => loc.name === activeLocation?.name)
                        ? activeLocation.name
                        : ""
                    }
                    onChange={changePriorityDropdown}
                    className="w-full sm:w-[230px] min-h-[42px] px-3 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {!priorityStations.some(
                      (loc) => loc.name === activeLocation?.name,
                    ) && (
                      <option value="">
                        {activeLocation?.name} ({activeLocation?.countryCode || "Global"})
                      </option>
                    )}
                    {priorityStations.map((location) => (
                      <option key={location.name} value={location.name}>
                        {location.name} ({location.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {locationsError && (
            <div
              className="mt-6 p-4 border border-red-200 bg-red-50 rounded-lg flex flex-wrap items-center justify-between gap-4"
              role="alert"
            >
              <p className="text-sm text-red-800">{locationsError}</p>
              <button
                type="button"
                onClick={retryLocations}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 cursor-pointer"
              >
                Retry Stations
              </button>
            </div>
          )}

          {error && (
            <div
              className="mt-6 p-4 border border-amber-200 bg-amber-50 rounded-lg flex flex-wrap items-center justify-between gap-4"
              role="alert"
            >
              <div className="text-sm text-amber-950">
                <p className="font-semibold">
                  Live weather upstream feed unavailable: {error}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  {weather
                    ? "Displaying the last successful station reading below. "
                    : ""}
                  You can browse all {totalWorldCities.toLocaleString()}+ world cities
                  and test cloudburst scenarios in the Pattern Lab below.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshWeather}
                className="px-3.5 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 rounded-md hover:bg-amber-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Retry Live Feed
              </button>
            </div>
          )}

          {loading && !weather && (
            <div
              className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
              role="status"
              aria-label="Loading station telemetry"
            >
              {[1, 2, 3, 4].map((slot) => (
                <div key={slot} className="p-5 animate-pulse">
                  <div className="h-3 w-28 bg-slate-200 rounded" />
                  <div className="h-7 w-20 bg-slate-200 rounded mt-3" />
                  <div className="h-3 w-36 bg-slate-100 rounded mt-2" />
                </div>
              ))}
            </div>
          )}

          {weather && (
            <div className="mt-6 space-y-6">
              {weather.risk && riskStyle && (
                <div
                  className={`border rounded-xl p-5 shadow-sm transition-all ${riskStyle.container}`}
                  aria-live="polite"
                >
                  {/* Top Bar: Risk Category, Probability, Confidence & Freshness */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <RiskIcon
                        className={`w-5 h-5 shrink-0 ${riskStyle.badgeText}`}
                        aria-hidden="true"
                      />
                      <span className="text-base font-bold">
                        Cloudburst Risk: {weather.risk.category || weather.risk.level}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          (weather.risk.category || weather.risk.level) === "Critical"
                            ? "bg-red-600 text-white"
                            : (weather.risk.category || weather.risk.level) === "High"
                            ? "bg-orange-600 text-white"
                            : (weather.risk.category || weather.risk.level) === "Moderate"
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {weather.risk.category || weather.risk.level}
                      </span>
                      <span className="text-xs opacity-75 hidden sm:inline">
                        · {weather.risk.imdTier}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Confidence Pill */}
                      {weather.risk.confidence && (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-900/60 border border-current/15 text-xs font-medium font-mono"
                          title={weather.risk.confidence.description || "Model prediction confidence"}
                        >
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>Confidence: <strong>{weather.risk.confidence.score}%</strong> ({weather.risk.confidence.tier})</span>
                        </div>
                      )}

                      {/* Data Freshness Pill */}
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-900/60 border border-current/15 text-xs font-medium font-mono"
                        title={`Data latency: ${weather.risk.freshness?.ageMinutes ?? 0}m. Source: ${weather.ingestion?.source || "Open-Meteo"}`}
                      >
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            weather.risk.freshness?.status === "STALE"
                              ? "bg-red-500"
                              : weather.risk.freshness?.status === "RECENT"
                              ? "bg-amber-500"
                              : "bg-emerald-500 animate-pulse"
                          }`}
                        ></span>
                        <span>{weather.risk.freshness?.label || "Live"} · {weather.risk.freshness?.relativeText || "Just now"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Calibrated Probability Meter & Threshold Configuration */}
                  <div className="mt-4 pt-4 border-t border-current/15 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-semibold text-current flex items-center gap-1.5">
                          Calibrated Cloudburst Probability:
                          <span className="text-sm font-bold tabular-nums">
                            {weather.risk.probabilityPercentage ?? weather.risk.score}%
                          </span>
                        </span>
                        <span className="text-[11px] opacity-75">
                          Thresholds: Low &lt; {Math.round((weather.risk.thresholds?.low ?? 0.15) * 100)}% | Mod &lt; {Math.round((weather.risk.thresholds?.moderate ?? 0.45) * 100)}% | Crit &ge; {Math.round((weather.risk.thresholds?.critical ?? 0.75) * 100)}%
                        </span>
                      </div>

                      {/* Visual Probability Bar with Threshold Markers */}
                      <div className="relative w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ease-out rounded-full ${
                            (weather.risk.category || weather.risk.level) === "Critical"
                              ? "bg-red-600"
                              : (weather.risk.category || weather.risk.level) === "High"
                              ? "bg-orange-500"
                              : (weather.risk.category || weather.risk.level) === "Moderate"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(2, weather.risk.probabilityPercentage ?? weather.risk.score))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Configurable Threshold Profile Selector */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-1.5">
                      <span className="text-[11px] font-medium opacity-80">
                        Risk Sensitivity Profile:
                      </span>
                      <div className="inline-flex rounded-md border border-current/20 bg-white/60 dark:bg-slate-900/40 p-0.5 text-xs font-medium">
                        {[
                          { id: "balanced", label: "Balanced" },
                          { id: "conservative", label: "Conservative" },
                          { id: "high_precision", label: "Precision" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setThresholdProfile(p.id)}
                            className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                              thresholdProfile === p.id
                                ? "bg-blue-600 text-white font-bold shadow-xs"
                                : "text-current hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {weather.risk.powerAdvisory && (
                    <div className="mt-3.5 pt-3 border-t border-current/15 text-sm">
                      <span className="font-semibold">
                        Operational Directive ({weather.risk.powerAdvisory.status}):
                      </span>{" "}
                      <span>{weather.risk.powerAdvisory.action}</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs opacity-85 font-mono">
                    {weather.risk.reason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-lg overflow-hidden">
                {telemetryCells.map((cell, index) => (
                  <div
                    key={cell.label}
                    className={`p-5 border-slate-200 ${
                      index < 4 ? "border-b" : "border-b sm:border-b-0"
                    } ${index % 4 !== 3 ? "lg:border-r" : ""} ${
                      index % 2 === 0 ? "sm:border-r lg:border-r" : ""
                    }`}
                  >
                    <p className="text-xs font-medium text-slate-500">
                      {cell.label}
                    </p>
                    <p className="mt-2 flex items-baseline gap-1.5 font-mono tabular-nums">
                      <span className="text-2xl font-semibold text-slate-900">
                        {cell.value}
                      </span>
                      <span className="text-xs text-slate-500">{cell.unit}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">{cell.detail}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Observed{" "}
                <time dateTime={weather.current.time}>
                  {formatLocalTimestamp(weather.current.time, tzLabel)}
                </time>
                {summary?.maxProbability !== null &&
                  summary?.maxProbability !== undefined && (
                    <span>
                      {" "}
                      · 48h max precipitation probability: {summary.maxProbability}%
                    </span>
                  )}
                {Number.isFinite(summary?.totalForecastRainMm) && (
                  <span>
                    {" "}
                    · 48h cumulative forecast: {summary.totalForecastRainMm} mm
                  </span>
                )}
              </p>
            </div>
          )}
        </section>

        <WorldRiskMap
          activeCity={activeLocation}
          priorityStations={priorityStations}
          directoryCities={worldData.results}
          onSelectCity={selectCity}
          liveWeather={weather}
          theme={theme}
        />

        <EarlyWarningAlertCenter
          activeLocation={activeLocation}
          weather={weather}
        />

        {weather && (
          <section id="forecast" className="pt-8" aria-label="Forecast patterns">
            <MeteorologicalChart
              hourly={weather.hourly}
              currentTime={weather.current.time}
              timezoneLabel={tzLabel}
            />
            <HourlyForecast
              hourly={weather.hourly}
              currentTime={weather.current.time}
              stationName={activeLocation?.name}
              timezoneLabel={tzLabel}
            />
          </section>
        )}

        <ParameterAnalyzer town={activeLocation} weather={weather} />

        <section
          id="network"
          className="mt-10 border border-slate-200 bg-white rounded-lg overflow-hidden"
          aria-labelledby="network-heading"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="network-heading" className="text-base font-semibold text-slate-900">
                Global Cities &amp; Priority Hydropower Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse all {totalWorldCities.toLocaleString()}+ major and minor world
                cities or switch between priority Indian Himalayan hydropower nodes
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
              role="tablist"
              aria-label="Directory view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={directoryTab === "world"}
                onClick={() => setDirectoryTab("world")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  directoryTab === "world"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All World Cities ({totalWorldCities.toLocaleString()}+)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={directoryTab === "priority"}
                onClick={() => setDirectoryTab("priority")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  directoryTab === "priority"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                IHR Hydro Priority ({priorityStations?.length ?? 10})
              </button>
            </div>
          </div>

          {directoryTab === "world" ? (
            <>
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search
                      className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={worldQuery}
                      onChange={(e) => {
                        setWorldQuery(e.target.value);
                        setWorldPage(0);
                      }}
                      placeholder="Search any city or town worldwide..."
                      aria-label="Filter world cities directory"
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 min-w-[240px]"
                    />
                  </div>

                  <select
                    value={worldCountry}
                    onChange={(e) => {
                      setWorldCountry(e.target.value);
                      setWorldPage(0);
                    }}
                    aria-label="Filter by country"
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 max-w-[240px]"
                  >
                    <option value="ALL">
                      All Countries ({countries.length || "Global"})
                    </option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.cityCount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
                  <span>
                    {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{" "}
                    {worldData.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={worldPage === 0 || worldLoading}
                      onClick={() => setWorldPage((p) => Math.max(0, p - 1))}
                      className="px-2.5 py-1 text-xs font-sans font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={worldPage + 1 >= totalPages || worldLoading}
                      onClick={() => setWorldPage((p) => p + 1)}
                      className="px-2.5 py-1 text-xs font-sans font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {worldError && (
                <p className="px-5 py-3 text-xs text-red-700 bg-red-50 border-b border-red-200">
                  {worldError}
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
                      <th scope="col" className="px-5 py-2.5">
                        City / Town
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Country
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Region / State
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right">
                        Population
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right">
                        Coordinates
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {worldLoading && worldData.results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          Loading global city directory...
                        </td>
                      </tr>
                    ) : worldData.results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No cities found matching "{worldQuery}".{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setWorldQuery("");
                              setWorldCountry("ALL");
                              setWorldPage(0);
                            }}
                            className="text-blue-700 font-medium underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      worldData.results.map((city) => {
                        const isSelected =
                          activeLocation?.name === city.name &&
                          Math.abs(activeLocation.latitude - city.latitude) < 0.01;
                        return (
                          <tr
                            key={`${city.id}-${city.latitude}-${city.longitude}`}
                            className={`h-10 transition-colors ${
                              isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <th
                              scope="row"
                              className="px-5 py-2 font-semibold text-slate-900 whitespace-nowrap"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  selectCity(city);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="text-left hover:text-blue-700 hover:underline underline-offset-4 cursor-pointer"
                              >
                                {city.name}
                                {isSelected ? " (Selected)" : ""}
                              </button>
                            </th>
                            <td className="px-4 py-2 text-slate-700">
                              {city.country} ({city.countryCode})
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              {city.state}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {city.population > 0
                                ? city.population.toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-5 py-2 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {city.latitude.toFixed(3)}, {city.longitude.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {uniqueStates.map((stateName) => (
                    <button
                      key={stateName}
                      type="button"
                      onClick={() => setStateFilter(stateName)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        stateFilter === stateName
                          ? "bg-white text-slate-900 border border-slate-300 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {stateName}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    placeholder="Filter station, basin, or plant..."
                    aria-label="Filter priority monitoring stations"
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 min-w-[220px]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
                      <th scope="col" className="px-5 py-2.5">
                        Station
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        State &amp; Basin
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right">
                        Elevation
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Ministry of Power Hydro / Grid Asset
                      </th>
                      <th scope="col" className="px-5 py-2.5">
                        Regional Met Agency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPriority.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No priority stations match "{stationQuery}".{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setStationQuery("");
                              setStateFilter("All");
                            }}
                            className="text-blue-700 font-medium underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredPriority.map((loc) => {
                        const isSelected = activeLocation?.name === loc.name;
                        return (
                          <tr
                            key={loc.name}
                            className={`h-11 transition-colors ${
                              isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <th
                              scope="row"
                              className="px-5 py-2.5 font-semibold text-slate-900 whitespace-nowrap"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  selectCity(loc);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="text-left hover:text-blue-700 hover:underline underline-offset-4 cursor-pointer"
                              >
                                {loc.name}
                                {isSelected ? " (Selected)" : ""}
                              </button>
                            </th>
                            <td className="px-4 py-2.5 text-slate-700">
                              {loc.state} · {loc.basin}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {loc.elevationM} m
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">
                              {loc.powerAsset}
                            </td>
                            <td className="px-5 py-2.5 text-slate-600">
                              {loc.metAgency}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Cloudburst Prediction System · Disaster Management · Ministry of Power &amp;
            Regional Meteorological Agencies
          </p>
          <p>
            Meteorological guidance and pattern analysis tool; verify official warnings
            with IMD / national meteorological bulletins.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
