const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const getWeather = async (latitude, longitude) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(
    `${API_URL}/api/weather?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  return response.json();
};