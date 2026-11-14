const FORECAST_HOURS = 6;

export default function HourlyForecast({ hourly, currentTime }) {
  const rows = [];
  for (const [index, time] of (hourly?.time ?? []).entries()) {
    if (time <= currentTime) continue;
    rows.push({
      time,
      precipitation: hourly.precipitation?.[index],
      probability: hourly.precipitationProbability?.[index],
    });
    if (rows.length === FORECAST_HOURS) break;
  }

  if (rows.length === 0) return null;

  return (
    <details className="hourly-forecast">
      <summary>Next {rows.length} forecast {rows.length === 1 ? "hour" : "hours"}</summary>
      <table aria-label="Upcoming hourly precipitation">
        <thead>
          <tr>
            <th scope="col">Time (IST)</th>
            <th scope="col">Precipitation</th>
            <th scope="col">Chance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ time, precipitation, probability }) => {
            const [date, hour] = time.split("T");
            return (
              <tr key={time}>
                <th scope="row">
                  <time dateTime={`${time}+05:30`}>
                    {hour}{date !== currentTime.slice(0, 10) && ` (${date})`}
                  </time>
                </th>
                <td>{Number.isFinite(precipitation) ? `${precipitation} mm` : "Unavailable"}</td>
                <td>{Number.isFinite(probability) ? `${probability}%` : "Unavailable"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}
