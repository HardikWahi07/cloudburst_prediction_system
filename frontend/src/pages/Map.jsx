import { Map as MapIcon, Mountain, ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation.js';
import { useWeather } from '../hooks/useWeather.js';
import HimalayanMap from '../components/maps/HimalayanMap.jsx';

export default function MapPage() {
  const { location } = useLocation();
  const { weather } = useWeather();

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <MapIcon size={24} />
            Himalayan Region Map
          </h1>
          <p>
            Interactive geospatial monitoring across Jammu & Kashmir, Ladakh, Himachal Pradesh, Uttarakhand, Sikkim, Darjeeling, and Arunachal Pradesh
          </p>
        </div>

        {weather && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <NavLink to="/weather" className="btn btn-primary btn-sm">
              <span>View Weather Dashboard</span>
              <ExternalLink size={12} />
            </NavLink>
          </div>
        )}
      </div>

      {/* Selected Location Summary Strip */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Focused Monitoring Point
            </span>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              {location.name}, {location.state}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Lat: </span>
              <strong>{location.latitude.toFixed(4)}°N</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Lon: </span>
              <strong>{location.longitude.toFixed(4)}°E</strong>
            </div>
            {location.elevation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mountain size={12} />
                <strong>{location.elevation} m MSL</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <HimalayanMap height="680px" />
    </div>
  );
}
