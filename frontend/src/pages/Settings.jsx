import { Settings as SettingsIcon, Sun, Moon, Gauge, Bell, MapPin, Check, Star } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import { useTheme } from '../hooks/useTheme.js';
import { useLocation } from '../hooks/useLocation.js';
import { TEMP_UNITS, WIND_UNITS } from '../data/constants.js';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { location, setLocation, locationsList } = useLocation();

  const handleLocationChange = (e) => {
    const selected = locationsList.find((l) => l.name === e.target.value);
    if (selected) {
      setLocation(selected);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <SettingsIcon size={24} />
          System Preferences &amp; Settings
        </h1>
        <p>
          Configure interface theme, measurement units, default stations, and alert behaviors
        </p>
      </div>

      <div className="card" style={{ maxWidth: '840px' }}>
        {/* Interface Theme */}
        <div className="info-row">
          <div className="info-label">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <div>
              <strong>Interface Appearance</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Switch between high-contrast Dark Navy and Light mode
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleTheme}>
            {theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          </button>
        </div>

        {/* Default Monitoring Location */}
        <div className="info-row">
          <div className="info-label">
            <MapPin size={18} />
            <div>
              <strong>Primary Monitoring Station</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Default Himalayan settlement loaded on application startup
              </div>
            </div>
          </div>
          <select
            value={location.name}
            onChange={handleLocationChange}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {locationsList.map((loc) => (
              <option key={loc.name} value={loc.name}>
                {loc.name}, {loc.state}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature Units */}
        <div className="info-row">
          <div className="info-label">
            <Gauge size={18} />
            <div>
              <strong>Temperature Unit</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Display surface measurements in Celsius or Fahrenheit
              </div>
            </div>
          </div>
          <select
            value={settings.tempUnit}
            onChange={(e) => updateSettings({ tempUnit: e.target.value })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value={TEMP_UNITS.CELSIUS}>Celsius (°C)</option>
            <option value={TEMP_UNITS.FAHRENHEIT}>Fahrenheit (°F)</option>
          </select>
        </div>

        {/* Wind Speed Units */}
        <div className="info-row">
          <div className="info-label">
            <Gauge size={18} />
            <div>
              <strong>Wind Speed Measurement</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Measurement standard for 10m surface winds
              </div>
            </div>
          </div>
          <select
            value={settings.windUnit}
            onChange={(e) => updateSettings({ windUnit: e.target.value })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value={WIND_UNITS.KMPH}>Kilometers per hour (km/h)</option>
            <option value={WIND_UNITS.MS}>Meters per second (m/s)</option>
            <option value={WIND_UNITS.MPH}>Miles per hour (mph)</option>
            <option value={WIND_UNITS.KNOTS}>Knots</option>
          </select>
        </div>

        {/* Refresh Interval */}
        <div className="info-row">
          <div className="info-label">
            <Bell size={18} />
            <div>
              <strong>Telemetry Polling Frequency</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Background refresh interval for Open-Meteo numerical weather data
              </div>
            </div>
          </div>
          <select
            value={settings.refreshInterval}
            onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value={5 * 60 * 1000}>Every 5 minutes</option>
            <option value={10 * 60 * 1000}>Every 10 minutes (Recommended)</option>
            <option value={15 * 60 * 1000}>Every 15 minutes</option>
            <option value={30 * 60 * 1000}>Every 30 minutes</option>
          </select>
        </div>

        {/* Notification Display Preferences */}
        <div className="info-row">
          <div className="info-label">
            <Bell size={18} />
            <div>
              <strong>Emergency Banner Display</strong>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Show high-contrast alert banner when severe convective deluge is predicted
              </div>
            </div>
          </div>
          <button
            className={`btn btn-sm ${settings.notificationsEnabled ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
          >
            {settings.notificationsEnabled ? <Check size={14} /> : null}
            <span>{settings.notificationsEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        {/* Persistence Notice */}
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <Star size={14} />
          <span>All settings and location favorites are persisted locally in your browser (HTML5 LocalStorage). No sensitive data is transferred to external tracking servers.</span>
        </div>
      </div>
    </div>
  );
}
