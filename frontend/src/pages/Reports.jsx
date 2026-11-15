import { useState } from 'react';
import { FileText, Download, Printer, Check, Mountain, ShieldCheck, Thermometer, Droplets, CloudRain, Wind, Gauge } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';
import { useWeather } from '../hooks/useWeather.js';

export default function Reports() {
  const { location } = useLocation();
  const { weather } = useWeather();
  const [downloaded, setDownloaded] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!weather?.hourly?.time) return;

    setDownloaded(true);
    const headers = ['Time_IST', 'Location', 'Latitude', 'Longitude', 'Elevation_m', 'Precipitation_mm', 'Precipitation_Probability_pct', 'Relative_Humidity_pct'];
    const rows = weather.hourly.time.map((timeStr, idx) => [
      `"${timeStr}"`,
      `"${location.name}"`,
      location.latitude,
      location.longitude,
      location.elevation || 1500,
      weather.hourly.precipitation?.[idx] ?? 0,
      weather.hourly.precipitationProbability?.[idx] ?? 0,
      weather.hourly.humidity?.[idx] ?? 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meteorological_report_${location.name.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloaded(false), 2000);
  };

  const current = weather?.current;
  const prediction = weather?.prediction;

  return (
    <div className="page report-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <FileText size={24} />
            Meteorological Reports &amp; Intelligence Summary
          </h1>
          <p>
            Standardized operational report and research data export for <strong>{location.name}, {location.state}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-outline" onClick={handleExportCsv} title="Export CSV">
            {downloaded ? <Check size={16} /> : <Download size={16} />}
            <span>{downloaded ? 'Downloaded' : 'Export Hourly CSV'}</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint} title="Print or save as PDF">
            <Printer size={16} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="card report-printable-document" style={{ padding: 'var(--space-8)' }}>
        <div style={{ borderBottom: '2px solid var(--border-hover)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Disaster Management Meteorological Intelligence Bulletin
            </span>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
              {location.name} Weather &amp; Cloudburst Risk Summary
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Indian Himalayan Region (IHR) Spatial Monitoring Network
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <div>Report Generated: <strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</strong></div>
            <div>Source: <strong>Open-Meteo &amp; Calibrated Random Forest Model</strong></div>
            <div>Classification: <strong>Experimental Cloudburst Risk Summary</strong></div>
          </div>
        </div>

        {/* Station Metadata Bar */}
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Monitoring Station: </span>
            <strong>{location.name}, {location.state}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Coordinates: </span>
            <strong>{location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Station Elevation: </span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <Mountain size={12} /> {location.elevation ? `${location.elevation} m MSL` : '1500 m'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Evaluated Status: </span>
            <span className={`badge ${prediction?.riskLevel === 'High' ? 'badge-danger' : prediction?.riskLevel === 'Watch' ? 'badge-warning' : 'badge-success'}`}>
              {prediction?.riskLevel || 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Current Surface Parameters Table */}
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          1. Current Surface Meteorological Observations
        </h3>

        {current ? (
          <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="info-row">
              <span className="info-label"><Thermometer size={14} /> Surface Temperature</span>
              <span className="info-value">{current.temperature} °C</span>
            </div>
            <div className="info-row">
              <span className="info-label"><Droplets size={14} /> Relative Humidity</span>
              <span className="info-value">{current.humidity}%</span>
            </div>
            <div className="info-row">
              <span className="info-label"><CloudRain size={14} /> Precipitation Rate</span>
              <span className="info-value">{current.precipitation} mm/h</span>
            </div>
            <div className="info-row">
              <span className="info-label"><Wind size={14} /> Surface Wind Speed</span>
              <span className="info-value">{current.windSpeed} km/h</span>
            </div>
            <div className="info-row">
              <span className="info-label"><Gauge size={14} /> Atmospheric Pressure</span>
              <span className="info-value">{current.pressure} hPa</span>
            </div>
            <div className="info-row">
              <span className="info-label"><ShieldCheck size={14} /> Convective Cloud Cover</span>
              <span className="info-value">{current.cloudCover}%</span>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
            Awaiting weather synchronization...
          </p>
        )}

        {/* AI Model Evaluation */}
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          2. Machine Learning Predictive Synthesis
        </h3>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <span>Cloudburst Risk: <strong>{prediction?.riskLevel || 'Unavailable'}</strong></span>
            <span>Cloudburst Probability: <strong>{Number.isFinite(prediction?.cloudburstProbability) ? `${(prediction.cloudburstProbability * 100).toFixed(1)}%` : 'Unavailable'}</strong></span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.6' }}>
            Primary Contributing Factors: {(prediction?.topFactors || ['Model unavailable; no assessment']).join('; ')}.
          </p>
        </div>

        {/* Sign-off & Verification Block */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <div>
            <p><strong>Disclaimer:</strong> Observation and predictive modeling only. Does not replace NDMA / SDMA emergency orders.</p>
            <p>Cloudburst Prediction System — Apache 2.0 Open Source Disaster Management System.</p>
          </div>

          <div style={{ textAlign: 'right', minWidth: '180px', borderTop: '1px dashed var(--border-hover)', paddingTop: 'var(--space-2)' }}>
            <span>Duty Meteorological Officer Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}
