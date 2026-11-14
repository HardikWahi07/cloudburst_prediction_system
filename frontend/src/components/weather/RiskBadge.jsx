import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskBadge({ risk }) {
  if (!risk) return null;

  const level = (risk.level || 'Low').toLowerCase();

  const config = {
    severe: {
      badgeClass: 'badge-danger',
      borderClass: 'var(--color-danger)',
      bgClass: 'var(--color-danger-light)',
      icon: AlertCircle,
      title: 'Severe Cloudburst Risk',
    },
    high: {
      badgeClass: 'badge-danger',
      borderClass: 'var(--color-danger)',
      bgClass: 'var(--color-danger-light)',
      icon: AlertCircle,
      title: 'High Cloudburst Risk',
    },
    watch: {
      badgeClass: 'badge-warning',
      borderClass: 'var(--color-warning)',
      bgClass: 'var(--color-warning-light)',
      icon: AlertTriangle,
      title: 'Cloudburst Watch',
    },
    low: {
      badgeClass: 'badge-success',
      borderClass: 'var(--color-success)',
      bgClass: 'var(--color-success-light)',
      icon: ShieldCheck,
      title: 'Low Cloudburst Risk',
    },
  }[level] || {
    badgeClass: 'badge-info',
    borderClass: 'var(--color-primary)',
    bgClass: 'var(--color-primary-light)',
    icon: ShieldCheck,
    title: 'Normal Meteorological Conditions',
  };

  const IconComponent = config.icon;

  return (
    <div
      style={{
        background: config.bgClass,
        border: `1px solid ${config.borderClass}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <IconComponent size={24} style={{ color: config.borderClass, flexShrink: 0 }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
              {config.title}
            </strong>
            <span className={`badge ${config.badgeClass}`}>
              {risk.level}
            </span>
          </div>
          {risk.reason && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {risk.reason}
            </p>
          )}
        </div>
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>
        <span>Heuristic Indicator</span>
        {Number.isFinite(risk.score) && (
          <span style={{ marginLeft: 'var(--space-2)', fontWeight: '600' }}>
            Score: {risk.score}/100
          </span>
        )}
      </div>
    </div>
  );
}
