import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CloudRain, Droplets, Umbrella } from 'lucide-react';
import { COLORS } from '../../data/constants.js';

function CustomTooltip({ active, payload, label, unit, metricName }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-time">{label} IST</div>
        <div className="tooltip-value">
          {metricName}: {payload[0].value} {unit}
        </div>
      </div>
    );
  }
  return null;
}

export default function ForecastTrendsChart({ hourly, currentTime }) {
  const [timeRange, setTimeRange] = useState(24); // 12, 24, 48
  const [activeMetric, setActiveMetric] = useState('precipitation'); // precipitation, probability, humidity

  const chartData = useMemo(() => {
    if (!hourly?.time || !currentTime) return [];

    const data = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const timeStr = hourly.time[i];
      if (timeStr > currentTime) {
        const [date, hour] = timeStr.split('T');
        data.push({
          rawTime: timeStr,
          time: hour,
          date,
          displayLabel: `${hour} (${date.slice(5)})`,
          precipitation: hourly.precipitation?.[i] ?? 0,
          probability: hourly.precipitationProbability?.[i] ?? 0,
          humidity: hourly.humidity?.[i] ?? 0,
        });

        if (data.length === timeRange) break;
      }
    }
    return data;
  }, [hourly, currentTime, timeRange]);

  const metricConfig = {
    precipitation: {
      name: 'Precipitation',
      unit: 'mm',
      color: COLORS.primary,
      fill: 'rgba(37, 99, 235, 0.25)',
      icon: CloudRain,
      type: 'bar',
      yDomain: [0, (dataMax) => Math.max(5, Math.ceil(dataMax * 1.25))],
    },
    probability: {
      name: 'Precipitation Chance',
      unit: '%',
      color: COLORS.accent,
      fill: 'rgba(6, 182, 212, 0.25)',
      icon: Umbrella,
      type: 'area',
      yDomain: [0, 100],
    },
    humidity: {
      name: 'Relative Humidity',
      unit: '%',
      color: '#10b981',
      fill: 'rgba(16, 185, 129, 0.25)',
      icon: Droplets,
      type: 'line',
      yDomain: [0, 100],
    },
  }[activeMetric];

  if (!chartData.length) {
    return (
      <div className="chart-card">
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
          No upcoming forecast data available.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <h3>
            <metricConfig.icon size={18} style={{ color: metricConfig.color }} />
            {metricConfig.name} Projection
          </h3>
          <p>Next {timeRange} hours forecast trend</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Metric Selector Tabs */}
          <div className="time-range-pills">
            <button
              className={`time-range-btn ${activeMetric === 'precipitation' ? 'active' : ''}`}
              onClick={() => setActiveMetric('precipitation')}
            >
              Precipitation (mm)
            </button>
            <button
              className={`time-range-btn ${activeMetric === 'probability' ? 'active' : ''}`}
              onClick={() => setActiveMetric('probability')}
            >
              Rain Chance (%)
            </button>
            <button
              className={`time-range-btn ${activeMetric === 'humidity' ? 'active' : ''}`}
              onClick={() => setActiveMetric('humidity')}
            >
              Humidity (%)
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="time-range-pills">
            {[12, 24, 48].map((hours) => (
              <button
                key={hours}
                className={`time-range-btn ${timeRange === hours ? 'active' : ''}`}
                onClick={() => setTimeRange(hours)}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: '340px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'precipitation' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridStroke} vertical={false} />
              <XAxis dataKey="time" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
              <YAxis
                domain={metricConfig.yDomain}
                stroke={COLORS.textMuted}
                fontSize={11}
                tickLine={false}
                unit=" mm"
              />
              <Tooltip
                content={
                  <CustomTooltip unit={metricConfig.unit} metricName={metricConfig.name} />
                }
              />
              <Bar
                dataKey="precipitation"
                fill={metricConfig.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          ) : activeMetric === 'probability' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridStroke} vertical={false} />
              <XAxis dataKey="time" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
              <YAxis
                domain={metricConfig.yDomain}
                stroke={COLORS.textMuted}
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                content={
                  <CustomTooltip unit={metricConfig.unit} metricName={metricConfig.name} />
                }
              />
              <Area
                type="monotone"
                dataKey="probability"
                stroke={metricConfig.color}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#probGradient)"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridStroke} vertical={false} />
              <XAxis dataKey="time" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
              <YAxis
                domain={metricConfig.yDomain}
                stroke={COLORS.textMuted}
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                content={
                  <CustomTooltip unit={metricConfig.unit} metricName={metricConfig.name} />
                }
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke={metricConfig.color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
