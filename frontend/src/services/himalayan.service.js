const API_URL = import.meta.env.VITE_API_URL || "";
const REQUEST_TIMEOUT_MS = 10000;

const requestJson = async (endpoint, signal, errorMessage) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: { Accept: "application/json" },
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
 * Fetch all Indian Himalayan Region states & UTs
 */
export const getHimalayanStates = (signal) =>
  requestJson("/api/locations/himalayan/states", signal, "Failed to fetch Himalayan states");

/**
 * Fetch districts in the Himalayan region
 */
export const getHimalayanDistricts = (stateIdOrCode, signal) => {
  const param = stateIdOrCode ? `?stateId=${encodeURIComponent(stateIdOrCode)}` : "";
  return requestJson(`/api/locations/himalayan/districts${param}`, signal, "Failed to fetch Himalayan districts");
};

/**
 * Spatial Bounding-Box Query for monitoring locations
 * @param {number} minLat Southern latitude
 * @param {number} maxLat Northern latitude
 * @param {number} minLon Western longitude
 * @param {number} maxLon Eastern longitude
 * @param {object} options
 */
export const getHimalayanLocationsInBBox = (minLat, maxLat, minLon, maxLon, options = {}, signal) => {
  const params = new URLSearchParams({
    minLat: String(minLat),
    maxLat: String(maxLat),
    minLon: String(minLon),
    maxLon: String(maxLon),
  });

  if (options.minElevation !== undefined) params.set("minElevation", String(options.minElevation));
  if (options.maxElevation !== undefined) params.set("maxElevation", String(options.maxElevation));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  return requestJson(
    `/api/locations/himalayan/bbox?${params}`,
    signal,
    "Failed to execute bounding box query",
  );
};

/**
 * Text search and lookup for Himalayan monitoring locations
 */
export const lookupHimalayanLocation = (query, signal) => {
  const params = new URLSearchParams({ q: query });
  return requestJson(
    `/api/locations/himalayan/lookup?${params}`,
    signal,
    "Failed to lookup Himalayan location",
  );
};

/**
 * Fetch Himalayan location by its primary identifier
 */
export const getHimalayanLocationById = (id, signal) =>
  requestJson(`/api/locations/himalayan/${encodeURIComponent(id)}`, signal, "Failed to fetch Himalayan location");

/**
 * Check PostgreSQL geospatial database connection and migration status
 */
export const getHimalayanDbStatus = (signal) =>
  requestJson("/api/locations/himalayan/status", signal, "Failed to fetch database status");

