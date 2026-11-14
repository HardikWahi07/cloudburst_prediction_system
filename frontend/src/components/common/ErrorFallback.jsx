import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorFallback({ message, onRetry, title = 'Unable to Load Weather Data' }) {
  return (
    <div className="error-fallback" role="alert">
      <AlertCircle size={32} className="error-fallback-icon" />
      <h3 className="error-fallback-title">{title}</h3>
      <p className="error-fallback-message">{message}</p>
      {onRetry && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={onRetry}
        >
          <RefreshCw size={14} />
          Retry Request
        </button>
      )}
    </div>
  );
}
