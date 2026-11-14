export default function WeatherCard({
  label,
  value,
  unit = '',
  icon: Icon,
  color,
  colorLight,
  description,
}) {
  const hasValue = Number.isFinite(value);
  const displayValue = hasValue ? `${value}${unit}` : 'Unavailable';

  const cardStyle = {
    '--kpi-color': color || 'var(--color-primary)',
    '--kpi-color-light': colorLight || 'var(--color-primary-light)',
  };

  return (
    <div className="kpi-card" style={cardStyle}>
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        {Icon && (
          <div className="kpi-card-icon">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="kpi-card-value">
        {displayValue}
      </div>

      {description && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
