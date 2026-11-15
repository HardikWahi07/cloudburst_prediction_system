import { useState } from 'react';
import { Bell, ShieldCheck, ShieldAlert, AlertTriangle, Info, Volume2, VolumeX, Eye, CheckCircle2 } from 'lucide-react';
import { useWeather } from '../hooks/useWeather.js';
import { useLocation } from '../hooks/useLocation.js';
import AlertModal from '../components/alerts/AlertModal.jsx';

export default function Alerts() {
  const { location } = useLocation();
  const { weather } = useWeather();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const isHighRisk = weather?.prediction?.status === 'success' && weather.prediction.task === 'verified_cloudburst_occurrence_next_3h' && weather.prediction.riskLevel === 'High';
  const isWatch = false;

  // Construct active dynamic advisory based on live weather model
  const activeAlerts = [];
  if (isHighRisk && !dismissedAlerts.includes('high-risk-alert')) {
    activeAlerts.push({
      id: 'high-risk-alert',
      title: `Experimental Cloudburst Risk Advisory — ${location.name}`,
      level: 'High',
      time: weather?.current?.time ? `${weather.current.time.slice(11, 16)}` : 'Current',
      location: `${location.name}, ${location.state}`,
      description: `Experimental cloudburst event risk for ${location.name}. This estimate is not an official emergency warning. Consult official weather advisories.`,
    });
  } else if (isWatch && !dismissedAlerts.includes('watch-alert')) {
    activeAlerts.push({
      id: 'watch-alert',
      title: `Experimental Rainfall Watch — ${location.name}`,
      level: 'Watch',
      time: weather?.current?.time ? `${weather.current.time.slice(11, 16)}` : 'Current',
      location: `${location.name}, ${location.state}`,
      description: 'Experimental rainfall watch. This model does not measure terrain saturation or river conditions.',
    });
  }

  const filteredAlerts = activeAlerts.filter((a) => {
    if (severityFilter === 'all') return true;
    return a.level.toLowerCase() === severityFilter.toLowerCase();
  });

  const dismissAlert = (id) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <Bell size={24} />
            Alerts &amp; Emergency Early Warning Center
          </h1>
          <p>
            Experimental cloudburst risk advisories for <strong>{location.name}, {location.state}</strong>
          </p>
        </div>

        {/* Audio notification toggle */}
        <button
          className={`btn btn-sm ${audioEnabled ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setAudioEnabled(!audioEnabled)}
          title="Toggle audio chime for high-risk alerts"
        >
          {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{audioEnabled ? 'Audio Alerts: ON' : 'Audio Alerts: OFF'}</span>
        </button>
      </div>

      {/* Official Government Authority Disclaimer */}
      <div
        style={{
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}
      >
        <Info size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <strong>Notice of Authority:</strong> This system is an academic and municipal risk-monitoring tool. It does <strong>not</strong> issue official public evacuation orders or state emergency declarations. Binding alerts must be confirmed via the <strong>National Disaster Management Authority (NDMA)</strong>, <strong>State Disaster Management Authority (SDMA)</strong>, or the <strong>India Meteorological Department (IMD)</strong>.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className={`btn btn-sm ${severityFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSeverityFilter('all')}
            >
              All Alerts ({activeAlerts.length})
            </button>
            <button
              className={`btn btn-sm ${severityFilter === 'high' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSeverityFilter('high')}
            >
              Severe / High
            </button>
            <button
              className={`btn btn-sm ${severityFilter === 'watch' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSeverityFilter('watch')}
            >
              Convective Watch
            </button>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Sector: <strong>{location.name}</strong> ({location.state})
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="card"
              style={{
                borderLeft: `4px solid ${alert.level === 'High' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {alert.level === 'High' ? (
                    <ShieldAlert size={20} style={{ color: 'var(--color-danger)' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                  )}
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    {alert.title}
                  </h3>
                  <span className={`badge ${alert.level === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                    {alert.level}
                  </span>
                </div>

                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Active at {alert.time} IST
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {alert.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <Eye size={14} />
                  <span>View Standard Operating Procedures (SOP)</span>
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => dismissAlert(alert.id)}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Acknowledge &amp; Dismiss</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Honest Default Empty State */
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <ShieldCheck size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)', opacity: 0.8 }} />
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            No experimental advisories match this view.
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
            Official emergency feeds are not connected. Missing weather or model data does not establish safe conditions for {location.name}.
          </p>
        </div>
      )}

      {/* Alert SOP Modal */}
      {selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}
