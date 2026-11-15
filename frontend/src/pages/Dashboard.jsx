import { LayoutDashboard, RefreshCw, AlertCircle, Mountain, Map as MapIcon, BarChart3, ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather.js';
import WeatherGrid from '../components/weather/WeatherGrid.jsx';
import RiskBadge from '../components/weather/RiskBadge.jsx';
import HourlyForecast from '../components/HourlyForecast.jsx';
import ForecastTrendsChart from '../components/charts/ForecastTrendsChart.jsx';
import HimalayanMap from '../components/maps/HimalayanMap.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import ErrorFallback from '../components/common/ErrorFallback.jsx';

const IST_DATE = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatPeakTime(peakTime, currentTime) {
  if (!peakTime) return null;
  const [date, time] = peakTime.split('T');
  const day =
    date === currentTime?.slice(0, 10)
      ? ''
      : ` (${IST_DATE.format(new Date(`${peakTime}+05:30`))})`;
  return `${time} IST${day}`;
}

export default function Dashboard() {
  const { weather, loading, pending, error, refreshWeather, location } = useWeather();

  const summary = weather?.summary;

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <LayoutDashboard size={24} />
            Overview Dashboard
          </h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span>Real-time weather monitoring for <strong>{location.name}, {location.state}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              ({location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E)
            </span>
            {location.elevation && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Mountain size={12} /> {location.elevation} m
                </span>
              </>
            )}
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={refreshWeather}
          disabled={pending}
          title="Refresh current meteorological readings"
        >
          <RefreshCw size={16} style={{ animation: pending ? 'spin 1s linear infinite' : 'none' }} />
          <span>{pending ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Non-blocking error banner */}
      {error && weather && (
        <div
          style={{
            background: 'var(--color-danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-danger)',
          }}
        >
          <AlertCircle size={16} />
          <span>{error} — Showing last successful reading.</span>
        </div>
      )}

      {/* Initial loading state */}
      {loading && <LoadingSkeleton count={6} />}

      {/* Error state */}
      {error && !weather && (
        <ErrorFallback
          title="Weather API Unavailable"
          message={error}
          onRetry={refreshWeather}
        />
      )}

      {/* Weather Content */}
      {weather && (
        <>
          {/* Cloudburst Risk Assessment Badge */}
          <RiskBadge risk={weather.risk} />

          {/* KPI Cards Grid */}
          <div className="section-header">
            <h2 className="section-title">Current Weather Conditions</h2>
            {weather.current?.time && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Observed at {weather.current.time.slice(11, 16)} IST
              </span>
            )}
          </div>

          <WeatherGrid current={weather.current} summary={summary} />

          {/* Section: Forecast Trends Chart (Phase 5) */}
          <div style={{ marginTop: 'var(--space-8)' }}>
            <div className="section-header">
              <h2 className="section-title">
                <BarChart3 size={20} />
                Hourly Forecast Trends
              </h2>
              <NavLink to="/analytics" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Deep Analytics</span>
                <ExternalLink size={12} />
              </NavLink>
            </div>
            <ForecastTrendsChart
              hourly={weather.hourly}
              currentTime={weather.current?.time}
            />
          </div>

          {/* Section: Interactive Himalayan Region Map Preview (Phase 4) */}
          <div style={{ marginTop: 'var(--space-8)' }}>
            <div className="section-header">
              <h2 className="section-title">
                <MapIcon size={20} />
                Himalayan Region Map Preview
              </h2>
              <NavLink to="/map" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Full Map View</span>
                <ExternalLink size={12} />
              </NavLink>
            </div>
            <HimalayanMap height="420px" />
          </div>

          {/* Forecast Summary Card */}
          {summary && (
            <div className="forecast-summary-box">
              <h3>48-Hour Precipitation Forecast Summary</h3>
              <p>
                {summary.peakTime && summary.peakPrecipitationMm > 0
                  ? `Heaviest rainfall: ${summary.peakPrecipitationMm} mm at ${formatPeakTime(summary.peakTime, weather.current?.time)}`
                  : summary.peakPrecipitationMm === 0
                    ? 'No precipitation projected in the upcoming 48-hour forecast window.'
                    : 'Peak rainfall forecast currently unavailable.'}
              </p>
              {Number.isFinite(summary.maxProbability) && (
                <p style={{ marginTop: 'var(--space-1)' }}>
                  Highest hourly probability of precipitation: <strong>{summary.maxProbability}%</strong>
                </p>
              )}
            </div>
          )}

          {/* 6-Hour Precipitation Forecast Table */}
          <HourlyForecast
            hourly={weather.hourly}
            currentTime={weather.current?.time}
          />

          {/* Observation Details & Scientific Disclaimer */}
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <p>
              Weather data synchronized from Open-Meteo API (Asia/Kolkata timezone).
            </p>
            <p style={{ fontStyle: 'italic' }}>
              Experimental rainfall baseline only. Cloudburst event prediction and operational warnings are not validated.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
