const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const getLocations = async (signal) => {
  const response = await fetch(`${API_URL}/api/locations`, { signal });

  if (!response.ok) {
    throw new Error("Failed to fetch Himalayan locations");
  }

  return response.json();
};

export const getWeather = async (latitude, longitude, signal) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(
    `${API_URL}/api/weather?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  return response.json();
};
