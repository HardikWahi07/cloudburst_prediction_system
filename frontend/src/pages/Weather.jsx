import { CloudRain, RefreshCw, AlertCircle, Mountain, Wind, Droplets, Thermometer, Gauge, Cloud } from 'lucide-react';
import { useWeather } from '../hooks/useWeather.js';
import WeatherGrid from '../components/weather/WeatherGrid.jsx';
import RiskBadge from '../components/weather/RiskBadge.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import ErrorFallback from '../components/common/ErrorFallback.jsx';

export default function Weather() {
  const { weather, loading, pending, error, refreshWeather, location } = useWeather();

  const current = weather?.current;
  const hourly = weather?.hourly;

  // Filter upcoming hourly forecast entries
  const upcomingHours = [];
  if (hourly?.time && current?.time) {
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i] > current.time) {
        upcomingHours.push({
          time: hourly.time[i],
          precipitation: hourly.precipitation?.[i],
          probability: hourly.precipitationProbability?.[i],
          humidity: hourly.humidity?.[i],
        });
      }
    }
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <CloudRain size={24} />
            Live Weather Monitoring
          </h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span>High-precision observations for <strong>{location.name}, {location.state}</strong></span>
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
          title="Manually query Open-Meteo API"
        >
          <RefreshCw size={16} style={{ animation: pending ? 'spin 1s linear infinite' : 'none' }} />
          <span>{pending ? 'Syncing...' : 'Sync Live Data'}</span>
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
          <span>{error} — Displaying cached observation.</span>
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingSkeleton count={6} />}

      {/* Error state */}
      {error && !weather && (
        <ErrorFallback
          title="Failed to Connect to Weather Backend"
          message={error}
          onRetry={refreshWeather}
        />
      )}

      {/* Live Weather Content */}
      {weather && (
        <>
          <RiskBadge risk={weather.risk} />

          <div className="section-header">
            <h2 className="section-title">Surface Observations</h2>
            <span className="badge badge-success">Live Stream</span>
          </div>

          <WeatherGrid current={current} summary={weather.summary} />

          {/* Meteorological Diagnostics Panel */}
          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <div className="card-header">
              <h2 className="card-title">Detailed Atmospheric Breakdown</h2>
            </div>
            <div className="grid-2">
              <div>
                <div className="info-row">
                  <span className="info-label"><Thermometer size={16} /> Surface Temperature</span>
                  <span className="info-value">{current.temperature} °C</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><Droplets size={16} /> Relative Humidity</span>
                  <span className="info-value">{current.humidity}%</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><CloudRain size={16} /> Hourly Precipitation</span>
                  <span className="info-value">{current.precipitation} mm</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><CloudRain size={16} /> Rain Volume</span>
                  <span className="info-value">{current.rain ?? 0} mm</span>
                </div>
              </div>

              <div>
                <div className="info-row">
                  <span className="info-label"><Gauge size={16} /> Mean Sea-Level Pressure</span>
                  <span className="info-value">{current.pressure} hPa</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><Wind size={16} /> Wind Speed (10m)</span>
                  <span className="info-value">{current.windSpeed} km/h</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><Cloud size={16} /> Total Cloud Cover</span>
                  <span className="info-value">{current.cloudCover}%</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><Mountain size={16} /> Terrain Altitude</span>
                  <span className="info-value">{location.elevation ? `${location.elevation} m MSL` : 'Valley station'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extended 24-Hour Forecast Table */}
          {upcomingHours.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <div className="card-header">
                <h2 className="card-title">Extended Hourly Projections (Next {Math.min(24, upcomingHours.length)} Hours)</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="hourly-forecast-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: 'var(--space-3)' }}>Time (IST)</th>
                      <th style={{ padding: 'var(--space-3)' }}>Precipitation</th>
                      <th style={{ padding: 'var(--space-3)' }}>Rain Probability</th>
                      <th style={{ padding: 'var(--space-3)' }}>Relative Humidity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingHours.slice(0, 24).map((hour) => {
                      const [date, timeStr] = hour.time.split('T');
                      return (
                        <tr key={hour.time} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: 'var(--space-3)', fontWeight: '500' }}>
                            {timeStr} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({date})</span>
                          </td>
                          <td style={{ padding: 'var(--space-3)', color: hour.precipitation > 0 ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                            {Number.isFinite(hour.precipitation) ? `${hour.precipitation} mm` : '—'}
                          </td>
                          <td style={{ padding: 'var(--space-3)', color: hour.probability > 50 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                            {Number.isFinite(hour.probability) ? `${hour.probability}%` : '—'}
                          </td>
                          <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                            {Number.isFinite(hour.humidity) ? `${hour.humidity}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
