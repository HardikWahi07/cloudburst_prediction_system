import { useState, useMemo } from 'react';
import { MapPin, Search, Mountain, Star, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';
import HIMALAYAN_STATES from '../data/himalayan-states.js';

const FAVORITES_STORAGE_KEY = 'cps-favorite-locations';

export default function Locations() {
  const { location, setLocation, locationsList, loadingLocations, locationsError, retryLocations } = useLocation();
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Load favorites from localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ['dehradun', 'shimla', 'manali'];
    } catch {
      return ['dehradun', 'shimla', 'manali'];
    }
  });

  const toggleFavorite = (e, locId) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(locId)
        ? prev.filter((id) => id !== locId)
        : [...prev, locId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    return locationsList.filter((loc) => {
      const id = loc.id || loc.name.toLowerCase();
      const matchSearch =
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.state.toLowerCase().includes(search.toLowerCase());
      const matchState =
        selectedState === 'all' || loc.stateId === selectedState || loc.state === selectedState;
      const matchFav = !showOnlyFavorites || favorites.includes(id);

      return matchSearch && matchState && matchFav;
    });
  }, [locationsList, search, selectedState, showOnlyFavorites, favorites]);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <MapPin size={24} />
            Himalayan Location Explorer
          </h1>
          <p>
            Explore settlements across the Indian Himalayan Region to inspect microclimate observations and cloudburst risks
          </p>
        </div>

        {locationsError && (
          <button className="btn btn-outline btn-sm" onClick={retryLocations}>
            <RefreshCw size={14} />
            <span>Retry Backend Sync</span>
          </button>
        )}
      </div>

      {/* Backend locations sync warning if offline */}
      {locationsError && (
        <div
          style={{
            background: 'var(--color-warning-light)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-warning)',
          }}
        >
          <AlertCircle size={16} />
          <span>Could not sync locations from backend: {locationsError}. Using verified offline catalog.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search towns, hill stations, valleys, pilgrimage sites..."
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

          {/* State Filter */}
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
            <option value="all">All Himalayan States & UTs</option>
            {HIMALAYAN_STATES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Favorites toggle */}
          <button
            type="button"
            className={`btn ${showOnlyFavorites ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            style={{ fontSize: 'var(--text-xs)' }}
          >
            <Star size={14} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
            <span>Favorites ({favorites.length})</span>
          </button>
        </div>
      </div>

      {loadingLocations && (
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      )}

      {/* Location Cards Grid */}
      <div className="kpi-grid">
        {filtered.map((loc) => {
          const locId = loc.id || loc.name.toLowerCase();
          const isSelected = loc.name === location.name;
          const isFav = favorites.includes(locId);

          return (
            <div
              key={locId}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--color-primary)' : undefined,
                background: isSelected ? 'var(--color-primary-light)' : undefined,
                position: 'relative',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => setLocation(loc)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {loc.name}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {loc.state}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, locId)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isFav ? '#f59e0b' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <Star size={16} fill={isFav ? '#f59e0b' : 'none'} />
                  </button>
                  {isSelected && (
                    <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Active
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <span>Lat: {loc.latitude.toFixed(2)}°N</span>
                <span>Lon: {loc.longitude.toFixed(2)}°E</span>
              </div>

              {loc.elevation && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mountain size={12} />
                  <span>{loc.elevation} m altitude</span>
                </div>
              )}

              {loc.description && (
                <p style={{ marginTop: 'var(--space-2)', fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {loc.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loadingLocations && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No locations matched your search criteria.</p>
        </div>
      )}
    </div>
  );
}
