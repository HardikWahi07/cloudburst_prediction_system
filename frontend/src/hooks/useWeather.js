import { useContext } from 'react';
import { WeatherContext } from '../context/weather-context.js';

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return ctx;
}
