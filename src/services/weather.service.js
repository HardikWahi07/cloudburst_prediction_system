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

export const getWeather = async (latitude, longitude, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  return requestJson(`/api/weather?${params}`, signal, "Failed to fetch weather data");
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
