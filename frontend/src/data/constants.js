/* ============================================================
   Constants — Colors, Configuration, Unit Definitions
   ============================================================ */

/**
 * Design tokens mirroring CSS custom properties,
 * used in Recharts and other JS-driven styling.
 */
export const COLORS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  accent: '#06B6D4',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  bgCard: 'rgba(13, 27, 42, 0.8)',
  gridStroke: 'rgba(148, 163, 184, 0.1)',
};

/**
 * Default weather refresh interval in milliseconds.
 * 10 minutes = 600 000 ms.
 */
export const DEFAULT_REFRESH_INTERVAL = 10 * 60 * 1000;

/**
 * Default location — Dehradun, Uttarakhand.
 */
export const DEFAULT_LOCATION = {
  id: 'dehradun',
  name: 'Dehradun',
  state: 'Uttarakhand',
  latitude: 30.3165,
  longitude: 78.0322,
};

/**
 * Temperature unit options.
 */
export const TEMP_UNITS = {
  CELSIUS: 'celsius',
  FAHRENHEIT: 'fahrenheit',
};

/**
 * Wind speed unit options.
 */
export const WIND_UNITS = {
  KMPH: 'km/h',
  MPH: 'mph',
  MS: 'm/s',
  KNOTS: 'knots',
};

/**
 * Sidebar navigation items.
 */
export const NAV_SECTIONS = [
  {
    label: 'Monitoring',
    items: [
      { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/weather', label: 'Live Weather', icon: 'CloudRain' },
      { path: '/map', label: 'Himalayan Map', icon: 'Map' },
      { path: '/risk', label: 'Risk Assessment', icon: 'AlertTriangle' },
      { path: '/analytics', label: 'Forecast Analytics', icon: 'BarChart3' },
    ],
  },
  {
    label: 'Data',
    items: [
      { path: '/historical', label: 'Historical Data', icon: 'History' },
      { path: '/alerts', label: 'Alerts', icon: 'Bell' },
      { path: '/locations', label: 'Location Explorer', icon: 'MapPin' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/reports', label: 'Reports', icon: 'FileText' },
      { path: '/about', label: 'About', icon: 'Info' },
    ],
  },
];

/**
 * Map configuration.
 */
export const MAP_CONFIG = {
  center: [30.5, 79.5],
  zoom: 6,
  minZoom: 4,
  maxZoom: 18,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
