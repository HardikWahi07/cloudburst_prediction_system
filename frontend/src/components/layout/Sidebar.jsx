import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CloudRain,
  Map,
  AlertTriangle,
  BarChart3,
  History,
  Bell,
  MapPin,
  FileText,
  Info,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  CloudLightning,
} from 'lucide-react';
import { NAV_SECTIONS } from '../../data/constants.js';

/**
 * Icon lookup — maps icon string names from constants to Lucide components.
 */
const ICON_MAP = {
  LayoutDashboard,
  CloudRain,
  Map,
  AlertTriangle,
  BarChart3,
  History,
  Bell,
  MapPin,
  FileText,
  Info,
  Settings,
};

export default function Sidebar({ collapsed, onToggle, onMobileClose }) {
  const renderNavItem = (item) => {
    const IconComponent = ICON_MAP[item.icon];
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          `nav-item${isActive ? ' active' : ''}`
        }
        onClick={onMobileClose}
        title={collapsed ? item.label : undefined}
      >
        {IconComponent && <IconComponent size={20} className="nav-item-icon" />}
        <span className="nav-item-label">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Header / Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <CloudLightning size={20} />
        </div>
        <div className="sidebar-brand">
          <div className="sidebar-brand-title">Cloudburst</div>
          <div className="sidebar-brand-subtitle">Prediction System</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(renderNavItem)}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-item${isActive ? ' active' : ''}`
          }
          onClick={onMobileClose}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={20} className="nav-item-icon" />
          <span className="nav-item-label">Settings</span>
        </NavLink>

        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
          <span className="sidebar-toggle-label">
            {collapsed ? 'Expand' : 'Collapse'}
          </span>
        </button>
      </div>
    </aside>
  );
}
