import { AlertTriangle, Cpu, Info, Activity } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';
import EmptyState from '../components/common/EmptyState.jsx';

export default function RiskAssessment() {
  const { location } = useLocation();

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <AlertTriangle size={24} />
          Cloudburst Risk Assessment
        </h1>
        <p>
          Automated risk evaluation for {location?.name}, {location?.state}
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* ML Model Status Panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Cpu size={18} />
              AI / ML Prediction Model
            </h2>
            <span className="badge badge-warning">Not Connected</span>
          </div>
          <EmptyState
            icon={Cpu}
            title="Prediction Model Not Connected"
            description="The Scikit-learn / Python machine learning risk engine is currently in development. Once trained on historical IMD/ERA5 cloudburst datasets, real-time inferencing will appear here."
          />
        </div>

        {/* Methodology & Parameters */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={18} />
              Planned Meteorological Parameters
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="info-row">
              <span className="info-label">Rainfall Threshold</span>
              <span className="info-value">&gt; 100 mm/hour (IMD standard)</span>
            </div>
            <div className="info-row">
              <span className="info-label">CAPE (Atmospheric Instability)</span>
              <span className="info-value">Planned integration</span>
            </div>
            <div className="info-row">
              <span className="info-label">Orographic Uplift Velocity</span>
              <span className="info-value">Digital Elevation Model (DEM)</span>
            </div>
            <div className="info-row">
              <span className="info-label">Precipitable Water Vapor</span>
              <span className="info-value">Satellite / Reanalysis data</span>
            </div>
            <div className="info-row">
              <span className="info-label">Model Architecture</span>
              <span className="info-value">Random Forest / XGBoost Classifier</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Info size={18} />
            Scientific Disclaimer
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
          According to the India Meteorological Department (IMD), a cloudburst is defined as sudden, localized heavy rainfall of 100 mm or more within one hour over an area of approximately 20–30 km². Real-time forecasts from Open-Meteo do not constitute official emergency disaster warnings.
        </p>
      </div>
    </div>
  );
}
