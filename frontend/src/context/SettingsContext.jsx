import { useState, useCallback } from 'react';
import { TEMP_UNITS, WIND_UNITS, DEFAULT_REFRESH_INTERVAL } from '../data/constants.js';
import { SettingsContext } from './settings-context.js';

const STORAGE_KEY = 'cps-settings';

const defaultSettings = {
  tempUnit: TEMP_UNITS.CELSIUS,
  windUnit: WIND_UNITS.KMPH,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  notificationsEnabled: true,
};

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const updateSettings = useCallback((partial) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
