import { useState, useEffect, useCallback } from 'react';
import { getWeather } from '../services/weather.service.js';
import { useLocation } from '../hooks/useLocation.js';
import { useSettings } from '../hooks/useSettings.js';
import { DEFAULT_REFRESH_INTERVAL } from '../data/constants.js';
import { WeatherContext } from './weather-context.js';

export function WeatherProvider({ children }) {
  const { location } = useLocation();
  const { settings } = useSettings();
  const [weather, setWeather] = useState(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshInterval = settings?.refreshInterval || DEFAULT_REFRESH_INTERVAL;
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  // Reset weather data when coordinates change to indicate loading new town
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    const controller = new AbortController();

    getWeather(latitude, longitude, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setWeather(data);
          setLastUpdated(new Date().toISOString());
          setError(null);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to fetch weather data');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPending(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [latitude, longitude, refreshCount]);

  // Periodic auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCount((c) => c + 1);
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval]);

  const refreshWeather = useCallback(() => {
    setPending(true);
    setError(null);
    setRefreshCount((c) => c + 1);
  }, []);

  const loading = !weather && pending && !error;
  const apiStatus = pending ? 'loading' : error ? 'error' : 'connected';

  return (
    <WeatherContext.Provider
      value={{
        weather,
        loading,
        pending,
        error,
        refreshWeather,
        lastUpdated,
        location,
        apiStatus,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}
