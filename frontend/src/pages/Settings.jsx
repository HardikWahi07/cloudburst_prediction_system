import { Settings as SettingsIcon, Sun, Moon, Gauge, Bell } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import { useTheme } from '../hooks/useTheme.js';
import { TEMP_UNITS, WIND_UNITS } from '../data/constants.js';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <SettingsIcon size={24} />
          System Preferences & Settings
        </h1>
        <p>
          Customize application theme, measurement units, and refresh behaviors
        </p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div className="info-row">
          <div className="info-label">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>Interface Theme</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleTheme}>
            {theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          </button>
        </div>

        <div className="info-row">
          <div className="info-label">
            <Gauge size={16} />
            <span>Temperature Units</span>
          </div>
          <select
            value={settings.tempUnit}
            onChange={(e) => updateSettings({ tempUnit: e.target.value })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value={TEMP_UNITS.CELSIUS}>Celsius (°C)</option>
            <option value={TEMP_UNITS.FAHRENHEIT}>Fahrenheit (°F)</option>
          </select>
        </div>

        <div className="info-row">
          <div className="info-label">
            <Gauge size={16} />
            <span>Wind Speed Units</span>
          </div>
          <select
            value={settings.windUnit}
            onChange={(e) => updateSettings({ windUnit: e.target.value })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-1) var(--space-3)',
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

        <div className="info-row">
          <div className="info-label">
            <Bell size={16} />
            <span>Auto-Refresh Interval</span>
          </div>
          <select
            value={settings.refreshInterval}
            onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: 'var(--space-1) var(--space-3)',
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
      </div>
    </div>
  );
}
