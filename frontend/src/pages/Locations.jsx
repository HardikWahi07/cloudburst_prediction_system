import { useState, useMemo } from 'react';
import { MapPin, Search, Mountain } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';
import HIMALAYAN_STATES from '../data/himalayan-states.js';

export default function Locations() {
  const { location, setLocation, locationsList } = useLocation();
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('all');

  const filtered = useMemo(() => {
    return locationsList.filter((loc) => {
      const matchSearch =
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.state.toLowerCase().includes(search.toLowerCase());
      const matchState =
        selectedState === 'all' || loc.stateId === selectedState || loc.state === selectedState;
      return matchSearch && matchState;
    });
  }, [locationsList, search, selectedState]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <MapPin size={24} />
          Himalayan Location Explorer
        </h1>
        <p>
          Select settlements across the Indian Himalayan Region to inspect localized meteorological conditions
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search towns, hill stations, valleys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-4) var(--space-2) var(--space-8)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value="all">All Himalayan States / UTs</option>
            {HIMALAYAN_STATES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Cards Grid */}
      <div className="kpi-grid">
        {filtered.map((loc) => {
          const isSelected = loc.name === location.name;
          return (
            <div
              key={loc.id || loc.name}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--color-primary)' : undefined,
                background: isSelected ? 'var(--color-primary-light)' : undefined,
              }}
              onClick={() => setLocation(loc)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {loc.name}
                </h3>
                {isSelected && (
                  <span className="badge badge-primary">Active</span>
                )}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                {loc.state}
              </p>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-3)' }}>
                <span>Lat: {loc.latitude.toFixed(2)}°</span>
                <span>Lon: {loc.longitude.toFixed(2)}°</span>
              </div>
              {loc.elevation && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mountain size={12} />
                  <span>{loc.elevation} m altitude</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
