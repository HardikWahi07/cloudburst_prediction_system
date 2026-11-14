import { Map as MapIcon } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';

export default function MapPage() {
  const { location } = useLocation();

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <MapIcon size={24} />
          Himalayan Region Map
        </h1>
        <p>
          Interactive spatial monitoring of Indian Himalayan Region settlements (Selected: {location?.name}, {location?.state})
        </p>
      </div>

      <div className="card" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <div id="map-container-slot">
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Map component loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
