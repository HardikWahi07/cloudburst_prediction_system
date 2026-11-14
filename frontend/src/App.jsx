import { useEffect, useState } from "react";
import { getLocations, getWeather } from "./services/weather.service";
import "./App.css";

const TOWN_STORAGE_KEY = "cloudburst.selectedTown";

function readSavedTown() {
  try {
    return localStorage.getItem(TOWN_STORAGE_KEY) || "Dehradun";
  } catch {
    return "Dehradun";
  }
}

function saveTown(name) {
  try {
    localStorage.setItem(TOWN_STORAGE_KEY, name);
  } catch {
    // The current selection still works when storage is blocked.
  }
}

function formatPeakTime(peakTime, currentTime) {
  const [date, time] = peakTime.split("T");
  return `${time} IST${date === currentTime.slice(0, 10) ? "" : ` (${date})`}`;
}

function App() {
  const [locations, setLocations] = useState([]);
  const [townName, setTownName] = useState(readSavedTown);
  const [weather, setWeather] = useState(null);
  const [locationsError, setLocationsError] = useState("");
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const town =
    locations.find((location) => location.name === townName) ||
    locations.find((location) => location.name === "Dehradun") ||
    locations[0];
  const { latitude, longitude } = town || {};
  const loading = !locationsError && !error && !weather;
  const summary = weather?.summary;

  useEffect(() => {
    const controller = new AbortController();

    getLocations(controller.signal).then(setLocations).catch((err) => {
      if (!controller.signal.aborted) {
        setLocationsError(err.message);
      }
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    const controller = new AbortController();

    getWeather(latitude, longitude, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setWeather(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });

    return () => controller.abort();
  }, [latitude, longitude, refreshCount]);

  const refreshWeather = () => {
    setWeather(null);
    setError("");
    setRefreshCount((count) => count + 1);
  };

  const changeTown = (event) => {
    const name = event.target.value;
    setTownName(name);
    saveTown(name);
    setWeather(null);
    setError("");
  };

  return (
    <div className="dashboard">
      <h1>Cloudburst Prediction System</h1>
      {weather?.risk && (
        <p className={`risk risk--${weather.risk.level.toLowerCase()}`}>
          <strong>Cloudburst risk: {weather.risk.level}</strong>
          <span>{weather.risk.reason}</span>
        </p>
      )}
      <p>
        Weather Monitoring Dashboard{town && ` — ${town.name}, ${town.state}`}
      </p>

      {town && (
        <label className="town-picker">
          Himalayan town
          <select value={town.name} onChange={changeTown}>
            {locations.map((location) => (
              <option key={location.name} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {loading && <p role="status">{town ? "Loading weather data..." : "Loading towns..."}</p>}

      {(locationsError || error) && (
        <p className="error" role="alert">{locationsError || error}</p>
      )}

      {weather && (
        <>
          <h2>Current Weather</h2>

          <div className="weather-grid">
            <div className="weather-card">
              <h3>Temperature</h3>
              <p>{weather.current.temperature} °C</p>
            </div>

            <div className="weather-card">
              <h3>Humidity</h3>
              <p>{weather.current.humidity}%</p>
            </div>

            <div className="weather-card">
              <h3>Precipitation</h3>
              <p>{weather.current.precipitation} mm</p>
            </div>

            <div className="weather-card">
              <h3>Wind Speed</h3>
              <p>{weather.current.windSpeed} km/h</p>
            </div>

            <div className="weather-card">
              <h3>Atmospheric Pressure</h3>
              <p>{weather.current.pressure} hPa</p>
            </div>

            <div className="weather-card">
              <h3>Cloud Cover</h3>
              <p>{weather.current.cloudCover}%</p>
            </div>
          </div>

          {summary && (
            <p>
              {summary.peakTime && summary.peakPrecipitationMm > 0
                ? `Heaviest rain: ${summary.peakPrecipitationMm} mm at ${formatPeakTime(summary.peakTime, weather.current.time)}`
                : summary.peakPrecipitationMm === 0
                  ? "No precipitation in the remaining forecast."
                  : "Peak rainfall forecast unavailable."}
            </p>
          )}

          <p className="updated">
            Weather data time: {weather.current.time} (IST)
          </p>
        </>
      )}

      {town && (
        <button className="refresh-button" type="button" onClick={refreshWeather} disabled={loading}>
          Refresh
        </button>
      )}

      <p className="disclaimer">
        Weather forecast monitoring only. Cloudburst prediction is not yet
        implemented.
      </p>
    </div>
  );
}

export default App;
