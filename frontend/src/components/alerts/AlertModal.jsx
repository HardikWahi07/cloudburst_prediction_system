import { X, ShieldAlert, AlertTriangle, PhoneCall, CheckCircle } from 'lucide-react';

export default function AlertModal({ alert, onClose }) {
  if (!alert) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 17, 31, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-hover)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShieldAlert size={22} style={{ color: 'var(--color-danger)' }} />
            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
              {alert.title || 'Meteorological Advisory Details'}
            </h3>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span className={`badge ${alert.level === 'High' ? 'badge-danger' : 'badge-warning'}`}>
            Level: {alert.level}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>
            Issued: {alert.time} IST
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6', marginBottom: 'var(--space-4)' }}>
          {alert.description}
        </p>

        {/* Recommended SOP Actions */}
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
            Standard Operating Procedures (SOP):
          </h4>
          <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)', lineHeight: '1.7' }}>
            <li>Stay clear of dry riverbeds, mountain culverts, and steep landslide-prone slopes.</li>
            <li>Monitor local emergency frequencies and follow state disaster management directives (SDMA).</li>
            <li>Relocate essential livestock and medical supplies to higher ground.</li>
            <li>Do not attempt to ford moving water in vehicles or on foot.</li>
          </ul>
        </div>

        {/* Emergency Contacts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <PhoneCall size={14} />
            <span>National Emergency Helpline: <strong>112</strong> / NDMA: <strong>1078</strong></span>
          </div>

          <button className="btn btn-primary btn-sm" onClick={onClose}>
            <CheckCircle size={14} />
            <span>Acknowledge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
