import { Info, CloudLightning, Shield, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <Info size={24} />
          About the Cloudburst Prediction System
        </h1>
        <p>
          Mission, geographical scope, and meteorological data sources
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Shield size={18} />
              Project Mission
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
            The Cloudburst Prediction System is an open-source weather intelligence and early disaster risk assessment initiative tailored specifically for the rugged terrain of the <strong>Indian Himalayan Region (IHR)</strong>.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7', marginTop: 'var(--space-3)' }}>
            Cloudbursts represent extreme convective mesoscale events with sudden deluge (&gt;100 mm/h) over steep mountain valleys, leading to flash floods, debris flows, and severe humanitarian risks.
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Globe size={18} />
              Geographical Scope
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
            Encompassing the entire Indian Himalayan Region, including:
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', paddingLeft: 'var(--space-5)', marginTop: 'var(--space-2)', lineHeight: '1.8' }}>
            <li>Jammu & Kashmir and Ladakh</li>
            <li>Himachal Pradesh</li>
            <li>Uttarakhand</li>
            <li>Sikkim and Darjeeling Hills</li>
            <li>Arunachal Pradesh &amp; Northeast Hills</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <CloudLightning size={18} />
            Data Sources &amp; Attribution
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
          Real-time hourly forecasting data is retrieved via the free, open-source <strong>Open-Meteo Weather API</strong>. Map tile rendering is powered by <strong>OpenStreetMap</strong> and <strong>Leaflet</strong>.
        </p>
      </div>
    </div>
  );
}
