const locations = [
  { name: "Dehradun", state: "Uttarakhand", latitude: 30.3165, longitude: 78.0322 },
  { name: "Manali", state: "Himachal Pradesh", latitude: 32.2396, longitude: 77.1887 },
  { name: "Shimla", state: "Himachal Pradesh", latitude: 31.1048, longitude: 77.1734 },
  { name: "Joshimath", state: "Uttarakhand", latitude: 30.5506, longitude: 79.5658 },
  { name: "Leh", state: "Ladakh", latitude: 34.1526, longitude: 77.5771 },
];

export const getLocations = (_req, res) => res.json(locations);
