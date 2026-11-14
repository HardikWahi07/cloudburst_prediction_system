/**
 * Reusable empty-state placeholder.
 *
 * Usage:
 *   <EmptyState
 *     icon={Database}
 *     title="No historical data connected"
 *     description="A historical weather API can be integrated here in the future."
 *   />
 */
export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} className="empty-state-icon" />}
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {children}
    </div>
  );
}
