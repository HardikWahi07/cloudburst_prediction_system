import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Weather from './pages/Weather.jsx';
import MapPage from './pages/Map.jsx';
import RiskAssessment from './pages/RiskAssessment.jsx';
import Analytics from './pages/Analytics.jsx';
import Historical from './pages/Historical.jsx';
import Alerts from './pages/Alerts.jsx';
import Locations from './pages/Locations.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/risk" element={<RiskAssessment />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/historical" element={<Historical />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
