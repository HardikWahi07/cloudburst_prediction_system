import { FileText, Download, Printer } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';

export default function Reports() {
  const { location } = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <FileText size={24} />
          Reports & Meteorological Exports
        </h1>
        <p>
          Generate printable summaries and download CSV data for {location?.name}, {location?.state}
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Download size={18} />
              CSV Data Export
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Export the latest 48-hour hourly forecast readings (precipitation, probability, humidity) for offline research and GIS processing.
          </p>
          <button className="btn btn-outline" onClick={() => alert('CSV export triggered for ' + location.name)}>
            <Download size={16} />
            Export Hourly Data (.csv)
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Printer size={18} />
              Print-Friendly Report
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Render a clean, printable meteorological summary sheet for municipal disaster planning and shift handovers.
          </p>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            Generate Print View
          </button>
        </div>
      </div>
    </div>
  );
}
