export default function LoadingSkeleton({ count = 6, height = 120 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" style={{ height }} />
      ))}
    </div>
  );
}
