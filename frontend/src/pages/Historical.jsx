import { useState } from 'react';
import { History, Database, Download, Calendar, Filter, FileSpreadsheet, Check } from 'lucide-react';
import { useLocation } from '../hooks/useLocation.js';

const HISTORICAL_PRESETS = [
  { id: 'kedarnath-2023', label: '2023 Monsoon (Kedarnath / Chamoli)', start: '2023-06-15', end: '2023-08-31' },
  { id: 'dharamshala-2021', label: '2021 Dharamshala Event', start: '2021-07-01', end: '2021-07-31' },
  { id: 'amarnath-2022', label: '2022 Amarnath Flash Floods', start: '2022-07-01', end: '2022-07-15' },
  { id: 'monsoon-recent', label: 'Recent Monsoon Archive', start: '2024-06-01', end: '2024-09-30' },
];

export default function Historical() {
  const { location } = useLocation();
  const [startDate, setStartDate] = useState('2023-06-15');
  const [endDate, setEndDate] = useState('2023-08-31');
  const [activePreset, setActivePreset] = useState('kedarnath-2023');
  const [isExporting, setIsExporting] = useState(false);

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setStartDate(preset.start);
    setEndDate(preset.end);
  };

  const handleDownloadCsv = () => {
    setIsExporting(true);
    const headers = ['Date', 'Location', 'Latitude', 'Longitude', 'Elevation_m', 'Total_Precipitation_mm', 'Peak_Intensity_mm_h', 'Relative_Humidity_pct', 'Event_Flag'];
    const sampleRows = [
      [`${startDate}`, `${location.name}`, `${location.latitude}`, `${location.longitude}`, `${location.elevation || 1500}`, '14.2', '6.8', '84.0', 'Normal Monsoon'],
      [`${endDate}`, `${location.name}`, `${location.latitude}`, `${location.longitude}`, `${location.elevation || 1500}`, '68.5', '42.0', '96.2', 'Torrential Convective Storm'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historical_weather_${location.name.toLowerCase()}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsExporting(false), 800);
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>
            <History size={24} />
            Historical Weather Data &amp; Extreme Events
          </h1>
          <p>
            Retrospective meteorological archive and past extreme rainfall records for <strong>{location.name}, {location.state}</strong>
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleDownloadCsv}
          disabled={isExporting}
          title="Export CSV schema"
        >
          {isExporting ? <Check size={14} /> : <Download size={14} />}
          <span>{isExporting ? 'Exported!' : 'Download Sample CSV'}</span>
        </button>
      </div>

      {/* Preset Query Toolbar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historical Event Benchmarks:
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          {HISTORICAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`btn btn-sm ${activePreset === preset.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Archive Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActivePreset(''); }}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Archive End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActivePreset(''); }}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>

          <button className="btn btn-outline" onClick={handleDownloadCsv}>
            <FileSpreadsheet size={16} />
            <span>Generate CSV Report</span>
          </button>
        </div>
      </div>

      {/* Target Schema Preview */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Database size={18} />
            Historical Archive Data Schema
          </h2>
          <span className="badge badge-primary">Illustrative samples</span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          Illustrative hardcoded sample records, not IMD observations, for {location.name}:
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                <th style={{ padding: 'var(--space-3)' }}>Observation Date</th>
                <th style={{ padding: 'var(--space-3)' }}>Total Rainfall</th>
                <th style={{ padding: 'var(--space-3)' }}>Peak Intensity</th>
                <th style={{ padding: 'var(--space-3)' }}>Relative Humidity</th>
                <th style={{ padding: 'var(--space-3)' }}>Barometric Dip</th>
                <th style={{ padding: 'var(--space-3)' }}>Classification</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: '500' }}>2023-07-10</td>
                <td style={{ padding: 'var(--space-3)' }}>84.2 mm</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-warning)' }}>48.0 mm/h</td>
                <td style={{ padding: 'var(--space-3)' }}>94%</td>
                <td style={{ padding: 'var(--space-3)' }}>-3.8 hPa</td>
                <td style={{ padding: 'var(--space-3)' }}><span className="badge badge-warning">Severe Monsoon Squall</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: '500' }}>2023-07-11</td>
                <td style={{ padding: 'var(--space-3)' }}>112.5 mm</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-danger)' }}>72.5 mm/h</td>
                <td style={{ padding: 'var(--space-3)' }}>98%</td>
                <td style={{ padding: 'var(--space-3)' }}>-5.4 hPa</td>
                <td style={{ padding: 'var(--space-3)' }}><span className="badge badge-danger">Cloudburst Precursor Event</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: '500' }}>2023-07-12</td>
                <td style={{ padding: 'var(--space-3)' }}>12.0 mm</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-success)' }}>4.5 mm/h</td>
                <td style={{ padding: 'var(--space-3)' }}>72%</td>
                <td style={{ padding: 'var(--space-3)' }}>+1.2 hPa</td>
                <td style={{ padding: 'var(--space-3)' }}><span className="badge badge-success">Calm / Light Rain</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution & Planned Integration */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Data Source Attribution
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
          Historical gridded records are structured following the <strong>India Meteorological Department (IMD) 0.25° x 0.25° high-resolution daily rainfall archive</strong> and <strong>ECMWF ERA5 mountain reanalysis</strong>. Full database synchronization will connect to PostgreSQL/PostGIS in future milestones.
        </p>
      </div>
    </div>
  );
}
