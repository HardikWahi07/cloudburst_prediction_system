import { AlertTriangle, Cpu } from 'lucide-react';
import { useWeather } from '../hooks/useWeather.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import ErrorFallback from '../components/common/ErrorFallback.jsx';

export default function RiskAssessment() {
  const { weather, loading, error, refreshWeather, location } = useWeather();
  const ensemble = weather?.cloudburstEnsemble;
  const prediction = weather?.prediction;
  const available = prediction?.status === 'success';
  const pilot = prediction?.gaugePilot;
  const regional = prediction?.regionalGauge;
  const metadata = prediction?.modelMetadata;
  return (
    <div className="page">
      <div className="page-header">
        <h1><AlertTriangle size={24} /> Cloudburst Risk Assessment</h1>
        <p>Three-hour cloudburst occurrence risk for {location.name}, {location.state}</p>
      </div>
      {loading && <LoadingSkeleton count={2} height={180} />}
      {error && <ErrorFallback title="Weather unavailable" message={error} onRetry={refreshWeather} />}
      <div className="grid-2">
        <div className="card">
          <h2 className="card-title"><Cpu size={18} /> Cloudburst event model</h2>
          {regional ? <>
            <p>US-trained gauge classifier: <strong>{regional.matchesEventClass ? 'Flags a possible intensity exceedance' : 'No intensity exceedance flagged'}</strong></p>
            <p>Target: at least 100 mm in one hour during the next three hours. Trained on {regional.trainingWindows.toLocaleString()} monitored windows across {regional.stations.length} stations.</p>
            <p>The 2022–2024 US test set contained {regional.test.positive_windows} positive windows. The classifier produced {regional.test.confusion[0][1].toLocaleString()} false alarms across {regional.test.windows.toLocaleString()} windows. Himalayan forecasting skill remains unverified.</p>
          </> : pilot ? <>
            <p>Experimental gauge classifier: <strong>{pilot.matchesEventClass ? 'Matches the cloudburst-intensity class' : 'Matches the comparison storm class'}</strong></p>
            <p>Based on weather inputs for {prediction.issueTime} IST. The classifier compares conditions with {pilot.examples} historical storms, including {pilot.positives} cloudburst-intensity cases.</p>
            {pilot.outsideRange.length > 0 && <p>{pilot.outsideRange.length} weather inputs are outside the training range.</p>}
          </> : <p>Cloudburst risk: <strong>{available ? prediction.riskLevel : 'Unavailable'}</strong></p>}
          {!available && <p>{prediction?.message || 'Awaiting complete weather measurements.'}</p>}
          {available && <>
            <p>Estimated probability of a cloudburst in the next three hours: <strong>{(prediction.cloudburstProbability * 100).toFixed(1)}%</strong></p>
            <p>Alert threshold: {(prediction.decisionThreshold * 100).toFixed(1)}%. A result below this threshold does not establish safe conditions.</p>
            <p>Held-out event average precision: {metadata.metrics.average_precision.toFixed(3)}; Brier score: {metadata.metrics.brier_score.toFixed(3)}.</p>
            <p>Hourly issue time (IST): {prediction.issueTime || 'Unavailable'}. Trained: {metadata.trainedAt}</p>
          </>}
        </div>
        <div className="card">
          <h2 className="card-title">Cloudburst intensity forecast</h2>
          {ensemble ? <>
            <p><strong>{ensemble.exceeding} of {ensemble.members} forecasts</strong> reach {ensemble.thresholdMm} mm of rain in an hour.</p>
            <p>Three hourly intervals ending at {ensemble.endTimes.join(', ')} IST.</p>
            <p>ICON ensemble forecasts average rainfall over a grid cell. Local cloudbursts can occur even when every member stays below the threshold.</p>
          </> : <p>{loading ? 'Loading ensemble forecast…' : 'Complete ensemble forecast unavailable.'}</p>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h2 className="card-title">Scope and limitations</h2>
        <p>The target is a verified localized cloudburst occurring within three hours at the monitored site. Training requires time- and location-matched event observations and monitored non-event windows.</p>
        <p>A pilot trained on 11 historical storm days from Dehradun and Dharamshala missed both cloudburst-intensity gauge cases in held-out testing and flagged five of nine comparison days. Its classification is experimental and cannot establish safe conditions or trigger an alert.</p>
        <p><a href="https://centaur.reading.ac.uk/69722/1/Dimri%20et%20al%202017%20%28in%20Press%29.pdf" target="_blank" rel="noreferrer">Published gauge observations, Table 2</a></p>
        <p><a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">ERA5 data source and attribution</a></p>
      </div>
    </div>
  );
}
