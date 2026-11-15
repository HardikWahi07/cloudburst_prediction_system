import { useState, useEffect, useCallback } from 'react';
import { getWeather } from '../services/weather.service.js';
import { useLocation } from '../hooks/useLocation.js';
import { useSettings } from '../hooks/useSettings.js';
import { DEFAULT_REFRESH_INTERVAL } from '../data/constants.js';
import { WeatherContext } from './weather-context.js';

export function WeatherProvider({ children }) {
  const { location } = useLocation();
  const { settings } = useSettings();
  const [snapshot, setSnapshot] = useState(null);
  const [pending, setPending] = useState(true);
  const [failure, setFailure] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshInterval = settings?.refreshInterval || DEFAULT_REFRESH_INTERVAL;
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const key = `${latitude},${longitude}`;
  const weather = snapshot?.key === key ? snapshot.data : null;
  const error = failure?.key === key ? failure.message : null;

  // Reset weather data when coordinates change to indicate loading new town
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    const controller = new AbortController();

    getWeather(latitude, longitude, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSnapshot({ key: `${latitude},${longitude}`, data });
          setLastUpdated(new Date().toISOString());
          setFailure(null);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setFailure({ key: `${latitude},${longitude}`, message: err.message || 'Failed to fetch weather data' });
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
    setFailure(null);
    setRefreshCount((c) => c + 1);
  }, []);

  const loading = !weather && !error;
  const apiStatus = loading || pending ? 'loading' : error ? 'error' : 'connected';

  return (
    <WeatherContext.Provider
      value={{
        weather,
        loading,
        pending,
        error,
        refreshWeather,
        lastUpdated: weather ? lastUpdated : null,
        location,
        apiStatus,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}
