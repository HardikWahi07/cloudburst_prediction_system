import { History, Database, Download } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';
import EmptyState from '../components/common/EmptyState.jsx';

export default function Historical() {
  const { location } = useLocation();

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <History size={24} />
          Historical Weather Data
        </h1>
        <p>
          Historical observation records and retrospective cloudburst event analysis for {location?.name}, {location?.state}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Start Date
            </label>
            <input
              type="date"
              defaultValue="2026-06-01"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              End Date
            </label>
            <input
              type="date"
              defaultValue="2026-09-30"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-outline" disabled>
              <Download size={16} />
              Query Historical Archive
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <EmptyState
          icon={Database}
          title="Historical Weather API Not Connected"
          description="A historical meteorological dataset (such as Open-Meteo Historical Weather Archive or IMD Gridded Rainfall Records) has not yet been integrated into the backend. This interface is structured and ready for future endpoint connection."
        />
      </div>
    </div>
  );
}
