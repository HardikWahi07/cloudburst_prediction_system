import {
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  Gauge,
  Cloud,
  Umbrella,
} from 'lucide-react';
import WeatherCard from './WeatherCard.jsx';

export default function WeatherGrid({ current, summary }) {
  if (!current) return null;

  return (
    <div className="kpi-grid">
      <WeatherCard
        label="Temperature"
        value={current.temperature}
        unit=" °C"
        icon={Thermometer}
        color="#F59E0B"
        colorLight="rgba(245, 158, 11, 0.15)"
      />
      <WeatherCard
        label="Relative Humidity"
        value={current.humidity}
        unit="%"
        icon={Droplets}
        color="#06B6D4"
        colorLight="rgba(6, 182, 212, 0.15)"
      />
      <WeatherCard
        label="Precipitation"
        value={current.precipitation}
        unit=" mm"
        icon={CloudRain}
        color="#3B82F6"
        colorLight="rgba(59, 130, 246, 0.15)"
      />
      <WeatherCard
        label="Wind Speed"
        value={current.windSpeed}
        unit=" km/h"
        icon={Wind}
        color="#10B981"
        colorLight="rgba(16, 185, 129, 0.15)"
      />
      <WeatherCard
        label="Atmospheric Pressure"
        value={current.pressure}
        unit=" hPa"
        icon={Gauge}
        color="#8B5CF6"
        colorLight="rgba(139, 92, 246, 0.15)"
      />
      <WeatherCard
        label="Cloud Cover"
        value={current.cloudCover}
        unit="%"
        icon={Cloud}
        color="#64748B"
        colorLight="rgba(100, 116, 139, 0.15)"
      />
      {summary && Number.isFinite(summary.maxProbability) && (
        <WeatherCard
          label="Precipitation Chance"
          value={summary.maxProbability}
          unit="%"
          icon={Umbrella}
          color="#EC4899"
          colorLight="rgba(236, 72, 153, 0.15)"
          description="Highest hourly probability in 48h"
        />
      )}
    </div>
  );
}
