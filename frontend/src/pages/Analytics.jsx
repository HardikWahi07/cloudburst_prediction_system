import { BarChart3 } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';

export default function Analytics() {
  const { location } = useLocation();

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <BarChart3 size={24} />
          Forecast Analytics
        </h1>
        <p>
          48-hour meteorological trend projections for {location?.name}, {location?.state}
        </p>
      </div>

      <div className="card" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Interactive Recharts will be populated in Phase 5.</p>
      </div>
    </div>
  );
}
