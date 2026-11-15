const API_URL = import.meta.env.VITE_API_URL || "";
const REQUEST_TIMEOUT_MS = 15000;

const requestJson = async (endpoint, options = {}, signal, errorMessage) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
      signal: requestSignal,
    });
    if (!response.ok) throw new Error(errorMessage);
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(errorMessage, { cause: error });
  }
};

/**
 * Fetch 1h, 3h, 6h, 24h accumulations, rolling intensity, and extreme statistics for a station
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} options { pastDays, forecastDays, startDate, endDate }
 */
export const getStationRainfallAnalytics = (latitude, longitude, options = {}, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  if (options.pastDays !== undefined) params.set("pastDays", String(options.pastDays));
  if (options.forecastDays !== undefined) params.set("forecastDays", String(options.forecastDays));
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);

  return requestJson(
    `/api/weather/rainfall-analytics?${params}`,
    {},
    signal,
    "Failed to fetch rainfall analytics",
  );
};

/**
 * Submit custom timeseries for cloudburst & accumulation analysis
 * @param {Array<string>} timestamps
 * @param {Array<number>} values
 */
export const analyzeCustomRainfall = (timestamps, values, signal) =>
  requestJson(
    "/api/weather/rainfall-analytics",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamps, values }),
    },
    signal,
    "Failed to analyze custom rainfall timeseries",
  );
