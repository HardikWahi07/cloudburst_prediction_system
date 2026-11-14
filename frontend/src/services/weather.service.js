const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");
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
  requestJson("/api/locations", signal, "Failed to fetch Himalayan locations");

export const getWeather = async (latitude, longitude, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  return requestJson(`/api/weather?${params}`, signal, "Failed to fetch weather data");
};
