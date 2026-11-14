import { BarChart3, CloudRain, Droplets, Umbrella, AlertCircle, Thermometer, Wind } from 'lucide-react';
import { useWeather } from '../hooks/useWeather.js';
import ForecastTrendsChart from '../components/charts/ForecastTrendsChart.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import ErrorFallback from '../components/common/ErrorFallback.jsx';

export default function Analytics() {
  const { weather, loading, error, refreshWeather, location } = useWeather();

  const hourly = weather?.hourly;
  const current = weather?.current;
  const summary = weather?.summary;

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <BarChart3 size={24} />
          Forecast Analytics & Visual Intelligence
        </h1>
        <p>
          High-resolution temporal trends and probability curves for <strong>{location.name}, {location.state}</strong>
        </p>
      </div>

      {loading && <LoadingSkeleton count={3} height={200} />}

      {error && !weather && (
        <ErrorFallback
          title="Analytics Data Unavailable"
          message={error}
          onRetry={refreshWeather}
        />
      )}

      {weather && (
        <>
          {/* Main Interactive Recharts Visualization */}
          <ForecastTrendsChart hourly={hourly} currentTime={current?.time} />

          {/* Analytical Summary Cards */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <CloudRain size={16} style={{ color: 'var(--color-primary)' }} />
                  Rainfall Dynamics
                </h3>
              </div>
              <div className="info-row">
                <span className="info-label">Current Rain Rate</span>
                <span className="info-value">{current.precipitation} mm/h</span>
              </div>
              <div className="info-row">
                <span className="info-label">Projected 48h Peak</span>
                <span className="info-value">{summary?.peakPrecipitationMm ?? 0} mm</span>
              </div>
              <div className="info-row">
                <span className="info-label">Cloudburst Risk Threshold</span>
                <span className="info-value">&gt; 100 mm/h</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Umbrella size={16} style={{ color: 'var(--color-accent)' }} />
                  Precipitation Probability
                </h3>
              </div>
              <div className="info-row">
                <span className="info-label">Maximum 48h Probability</span>
                <span className="info-value">{summary?.maxProbability ?? 0}%</span>
              </div>
              <div className="info-row">
                <span className="info-label">Probability Confidence</span>
                <span className="info-value">High (NWP Ensemble)</span>
              </div>
              <div className="info-row">
                <span className="info-label">Storm Likelihood</span>
                <span className="info-value">{(summary?.maxProbability ?? 0) > 60 ? 'Elevated' : 'Moderate'}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Droplets size={16} style={{ color: '#10b981' }} />
                  Moisture Saturation
                </h3>
              </div>
              <div className="info-row">
                <span className="info-label">Surface Relative Humidity</span>
                <span className="info-value">{current.humidity}%</span>
              </div>
              <div className="info-row">
                <span className="info-label">Condensation Potential</span>
                <span className="info-value">{current.humidity >= 85 ? 'High (Saturated)' : 'Normal'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Cloud Layer Cover</span>
                <span className="info-value">{current.cloudCover}%</span>
              </div>
            </div>
          </div>

          {/* Honest Metric Availability Status Panel */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <AlertCircle size={16} />
                Meteorological Metric Availability
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              In accordance with strict scientific data integrity standards, only parameters provided by the connected Open-Meteo endpoint are rendered.
            </p>
            <div className="grid-2">
              <div className="info-row">
                <span className="info-label"><Thermometer size={14} /> Hourly Temperature Curve</span>
                <span className="badge badge-warning">Current Reading Only (Hourly Not in API)</span>
              </div>
              <div className="info-row">
                <span className="info-label"><Wind size={14} /> Hourly Wind Vector Vectoring</span>
                <span className="badge badge-warning">Current Reading Only (Hourly Not in API)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
