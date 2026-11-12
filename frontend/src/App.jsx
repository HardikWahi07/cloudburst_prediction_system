import { useEffect, useState } from "react";
import { getWeather } from "./services/weather.service";
import "./App.css";

function App() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await getWeather(30.3165, 78.0322);
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, []);

  return (
    <div className="dashboard">
      <h1>Cloudburst Prediction System</h1>
      <p>Weather Monitoring Dashboard — Dehradun, Uttarakhand</p>

      {loading && <p>Loading weather data...</p>}

      {error && <p className="error">{error}</p>}

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

          <p className="updated">
            Weather data time: {weather.current.time} (IST)
          </p>
        </>
      )}

      <p className="disclaimer">
        Weather forecast monitoring only. Cloudburst prediction is not yet
        implemented.
      </p>
    </div>
  );
}

export default App;