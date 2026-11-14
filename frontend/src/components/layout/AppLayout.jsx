import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cps-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cps-sidebar-collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const closeMobile = () => setMobileOpen(false);

  const layoutClasses = [
    'app-layout',
    collapsed ? 'sidebar-collapsed' : '',
    mobileOpen ? 'sidebar-mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClasses}>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        onMobileClose={closeMobile}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      <div className="main-area">
        <Topbar
          onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
