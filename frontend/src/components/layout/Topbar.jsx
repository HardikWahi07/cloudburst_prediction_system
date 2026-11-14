import { MapPin, Bell, Menu } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation.js';
import { useWeather } from '../../hooks/useWeather.js';
import ThemeToggle from '../common/ThemeToggle.jsx';

export default function Topbar({ onMobileMenuToggle }) {
  const { location, setLocation, locationsList } = useLocation();
  const { lastUpdated, apiStatus } = useWeather();

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return null;
    }
  };

  const statusClass =
    apiStatus === 'loading'
      ? 'loading'
      : apiStatus === 'error'
        ? 'offline'
        : '';

  const statusLabel =
    apiStatus === 'loading'
      ? 'Fetching...'
      : apiStatus === 'error'
        ? 'Offline'
        : lastUpdated
          ? `Updated ${formatTime(lastUpdated)}`
          : 'Live API';

  const handleLocationChange = (e) => {
    const selected = locationsList.find((l) => l.name === e.target.value);
    if (selected) {
      setLocation(selected);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={onMobileMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Global location selector */}
        <div className="topbar-location">
          <MapPin size={14} />
          <select
            value={location.name}
            onChange={handleLocationChange}
            aria-label="Select Himalayan location"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {locationsList.map((loc) => (
              <option
                key={loc.name}
                value={loc.name}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                {loc.name}, {loc.state}
              </option>
            ))}
          </select>
        </div>

        {/* API connection status */}
        <div className="topbar-status">
          <span className={`status-dot ${statusClass}`} />
          <span>{statusLabel}</span>
        </div>
      </div>

      <div className="topbar-right">
        <ThemeToggle />

        <div className="topbar-divider" />

        <button
          className="topbar-btn"
          aria-label="Notifications"
          title="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
