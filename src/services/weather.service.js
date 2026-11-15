const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15000;

async function requestJson(path, signal, failureMessage) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(`${API_URL}${path}`, { signal: requestSignal });
    if (!response.ok) throw new Error(failureMessage);
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new Error("The weather server took too long to respond. Try again.", { cause: error });
    }
    throw new Error(failureMessage, { cause: error });
  }
}

export const getLocations = (signal) =>
  requestJson("/api/locations", signal, "Failed to fetch priority monitoring stations");

export const getRiskMapStations = (signal) =>
  requestJson("/api/locations/risk-map", signal, "Failed to fetch risk map stations");

export const getCountries = (signal) =>
  requestJson("/api/locations/countries", signal, "Failed to fetch world country directory");

export const searchLocations = ({ q = "", country = "", limit = 50, offset = 0 } = {}, signal) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (country) params.set("country", country);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return requestJson(
    `/api/locations/search?${params}`,
    signal,
    "Failed to search global cities directory",
  );
};

export const getWeather = async (latitude, longitude, optionsOrSignal, maybeSignal) => {
  let signal;
  let options = {};
  if (optionsOrSignal instanceof AbortSignal) {
    signal = optionsOrSignal;
  } else if (typeof optionsOrSignal === "object" && optionsOrSignal !== null) {
    options = optionsOrSignal;
    signal = maybeSignal;
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  if (options.thresholdProfile) params.set("profile", options.thresholdProfile);
  if (options.lowThreshold) params.set("lowThreshold", String(options.lowThreshold));
  if (options.moderateThreshold) params.set("moderateThreshold", String(options.moderateThreshold));
  if (options.criticalThreshold) params.set("criticalThreshold", String(options.criticalThreshold));

  return requestJson(`/api/weather?${params}`, signal, "Failed to fetch weather data");
};

export const getHistoricalWeather = async (latitude, longitude, startDate, endDate, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    startDate,
    endDate,
  });

  return requestJson(
    `/api/weather/historical?${params}`,
    signal,
    "Failed to fetch historical weather data",
  );
};

export const getBatchWeather = async (locations, signal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(`${API_URL}/api/weather/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
      signal: requestSignal,
    });
    if (!response.ok) throw new Error("Failed to fetch batch weather data");
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Failed to fetch batch weather data", { cause: error });
  }
};

export const getMLModelInfo = (signal) =>
  requestJson("/api/weather/ml-model-info", signal, "Failed to fetch ML model information");

export const getRiskThresholdProfiles = (signal) =>
  requestJson("/api/weather/threshold-profiles", signal, "Failed to fetch threshold profiles");

export const getProbabilisticRisk = (latitude, longitude, options = {}, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  if (options.thresholdProfile) params.set("profile", options.thresholdProfile);
  if (options.lowThreshold) params.set("lowThreshold", String(options.lowThreshold));
  if (options.moderateThreshold) params.set("moderateThreshold", String(options.moderateThreshold));
  if (options.criticalThreshold) params.set("criticalThreshold", String(options.criticalThreshold));

  return requestJson(
    `/api/weather/probabilistic-risk?${params}`,
    signal,
    "Failed to fetch probabilistic risk assessment",
  );
};

export const predictCloudburstML = async (observation, signal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(`${API_URL}/api/weather/ml-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(observation),
      signal: requestSignal,
    });
    if (!response.ok) throw new Error("Failed to evaluate cloudburst prediction");
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Failed to evaluate cloudburst prediction", { cause: error });
  }
};
