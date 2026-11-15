import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Compass,
  Eye,
  Filter,
  Globe2,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  OctagonAlert,
  PlusCircle,
  Search,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { getBatchWeather, searchLocations } from "../services/weather.service";
import { CLOUDBURST_GLOBAL_STATIONS } from "../data/worldStations.js";

export { CLOUDBURST_GLOBAL_STATIONS };

// Major orographic cloudburst corridors across the globe
const CLOUDBURST_CORRIDORS = [
  {
    name: "Himalayan Cloudburst Arc (Red Alert Front)",
    description: "World's most active cloudburst corridor spanning Jammu & Kashmir, Himachal Pradesh, Uttarakhand, Nepal, Sikkim, and Arunachal Pradesh.",
    color: "#dc2626", // Red
    weight: 4,
    dashArray: "6, 6",
    coordinates: [
      [34.15, 74.80], // Srinagar
      [32.24, 77.19], // Manali
      [31.10, 77.17], // Shimla
      [30.73, 79.07], // Kedarnath
      [30.55, 79.57], // Joshimath
      [27.72, 85.32], // Kathmandu
      [27.33, 88.61], // Gangtok
      [27.59, 91.87], // Tawang
      [28.14, 95.84], // Roing
    ],
  },
  {
    name: "Western Ghats Monsoonal Orographic Front",
    description: "Steep coastal basalt scarp inducing sudden extreme monsoon rainfall (>5,000 mm/year) across Maharashtra, Karnataka, and Kerala.",
    color: "#ea580c", // Amber-Orange
    weight: 3.5,
    dashArray: "4, 6",
    coordinates: [
      [19.00, 73.30], // Matheran
      [18.75, 73.41], // Lonavala
      [17.92, 73.66], // Mahabaleshwar
      [13.93, 75.57], // Agumbe
      [12.42, 75.74], // Coorg
      [11.56, 76.13], // Wayanad
      [10.09, 77.06], // Munnar
      [9.85, 76.98],  // Idukki
    ],
  },
  {
    name: "European Alps Torrential Funnel (Chamonix - Innsbruck)",
    description: "Steep glaciated valleys susceptible to sudden torrential downpours and glacial moraine debris flows.",
    color: "#dc2626", // Red
    weight: 3,
    dashArray: "5, 5",
    coordinates: [
      [45.92, 6.87],  // Chamonix
      [45.98, 7.75],  // Zermatt
      [46.69, 7.86],  // Interlaken
      [47.38, 8.54],  // Zurich
      [47.27, 11.40], // Innsbruck
      [47.81, 13.06], // Salzburg
    ],
  },
  {
    name: "Ligurian Sea - Apennines Escarpment (Genoa Flash Flood Alley)",
    description: "V-shaped topography trapping moist Mediterranean air resulting in intense flash floods (Bisagno Basin).",
    color: "#b91c1c", // Deep Red
    weight: 3.5,
    dashArray: "4, 4",
    coordinates: [
      [43.71, 7.26], // Nice
      [44.41, 8.95], // Genoa
      [44.11, 9.82], // Cinque Terre
      [43.84, 10.51], // Lucca
    ],
  },
  {
    name: "Rocky Mountain Front Range Flash Flood Alley",
    description: "Steep elevation rise from high plains generating stationary upslope convective thunderstorm complexes.",
    color: "#dc2626", // Red
    weight: 3,
    dashArray: "5, 5",
    coordinates: [
      [44.08, -103.23], // Rapid City Black Hills
      [40.38, -105.52], // Estes Park
      [40.01, -105.27], // Boulder Front Range
      [39.74, -104.99], // Denver Foothills
      [38.83, -104.82], // Colorado Springs
    ],
  },
  {
    name: "Andean Escarpment Aluvión Corridor",
    description: "Steep Pacific slopes of the Andes generating violent mudflow and torrential cloudburst hazards.",
    color: "#ea580c",
    weight: 3,
    dashArray: "5, 5",
    coordinates: [
      [4.71, -74.07],   // Bogota
      [-0.18, -78.47],  // Quito
      [-12.05, -77.04], // Lima
      [-16.49, -68.12], // La Paz
      [-33.45, -70.67], // Santiago
    ],
  },
];

// 100% Free, keyless tile providers that never require an API key or show watermarks
export const KEYLESS_TILE_PROVIDERS = {
  "esri-dark": {
    name: "Dark Radar (Esri · Keyless)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 16,
    },
  },
  osm: {
    name: "Standard Light (OpenStreetMap · Keyless)",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  },
  topo: {
    name: "Mountain Topography (Esri · Keyless)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a> &copy; National Geographic',
      maxZoom: 16,
    },
  },
  satellite: {
    name: "Satellite Terrain (Esri · Keyless)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics',
      maxZoom: 17,
    },
  },
};

// Robust name normalizer that strips accents and punctuation
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Determines if a station matches target city by coordinates proximity or name
function isMatchingStation(station, target) {
  if (!station || !target) return false;

  // 1. Exact or close coordinate match (< 35 km / 0.35 degrees)
  if (
    Number.isFinite(station.latitude) &&
    Number.isFinite(station.longitude) &&
    Number.isFinite(target.latitude) &&
    Number.isFinite(target.longitude)
  ) {
    const latDiff = Math.abs(station.latitude - target.latitude);
    const lonDiff = Math.abs(station.longitude - target.longitude);
    if (latDiff < 0.35 && lonDiff < 0.35) return true;
  }

  // 2. ID match
  if (station.id && target.id && station.id === target.id) return true;

  // 3. Normalized name comparison
  const sNorm = normalizeName(station.name);
  const tNorm = normalizeName(target.name);
  if (sNorm && tNorm) {
    if (sNorm === tNorm) return true;
    if (sNorm.includes(tNorm) || tNorm.includes(sNorm)) return true;
  }

  return false;
}

export default function WorldRiskMap({
  activeCity,
  priorityStations = [],
  directoryCities = [],
  onSelectCity,
  liveWeather,
  theme = "dark",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const corridorsGroupRef = useRef(null);
  const activeReticleRef = useRef(null);

  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, High, Watch, Low
  const [continentFilter, setContinentFilter] = useState("ALL");
  const [showCorridors, setShowCorridors] = useState(true);
  const [mapStyle, setMapStyle] = useState(theme === "dark" ? "esri-dark" : "osm");
  const [selectedStation, setSelectedStation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveStationData, setLiveStationData] = useState({});

  // Dynamic user-searched cities (persisted in localStorage)
  const [searchedCities, setSearchedCities] = useState(() => {
    try {
      const saved = localStorage.getItem("cloudburst.mapSearchedCities");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Autocomplete / external world search state
  const [externalResults, setExternalResults] = useState([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Sync mapStyle with theme prop
  useEffect(() => {
    setMapStyle(theme === "dark" ? "esri-dark" : "osm");
  }, [theme]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // When activeCity prop changes from main app search or directory, ensure it is added to map
  useEffect(() => {
    if (!activeCity || !Number.isFinite(activeCity.latitude) || !Number.isFinite(activeCity.longitude)) return;

    setSearchedCities((prev) => {
      const alreadyPresent =
        prev.some((c) => isMatchingStation(c, activeCity)) ||
        CLOUDBURST_GLOBAL_STATIONS.some((c) => isMatchingStation(c, activeCity));

      if (alreadyPresent) return prev;

      const newEntry = {
        id: activeCity.id || `search-${activeCity.name}-${activeCity.latitude.toFixed(2)}`,
        name: activeCity.name,
        region: activeCity.state || activeCity.region || activeCity.country || "Active Search",
        country: activeCity.country || "Global",
        countryCode: activeCity.countryCode || "",
        continent: "Global",
        basin: activeCity.basin || `${activeCity.name} Catchment`,
        elevationM: activeCity.elevationM || null,
        latitude: activeCity.latitude,
        longitude: activeCity.longitude,
        riskLevel: liveWeather?.risk?.level || "Low",
        riskScore: liveWeather?.risk?.score ?? 15,
        rainfallRateMmH: liveWeather?.current?.precipitation ?? 0,
        capeJkg: liveWeather?.risk?.peakCape ?? 50,
        pressureDrop3h: liveWeather?.risk?.pressureDrop3h ?? 0.2,
        hazardType: liveWeather?.risk?.imdTier || "Live Searched Monitoring Node",
        powerAsset: activeCity.powerAsset || "Regional Power Grid",
        metAgency: activeCity.metAgency || "National Meteorological Service",
        advisory: liveWeather?.risk?.powerAdvisory?.action || "Live Monitored Telemetry",
        isUserSearched: true,
      };

      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem("cloudburst.mapSearchedCities", JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });

    // Fly camera smoothly to active city
    if (mapInstanceRef.current && Number.isFinite(activeCity.latitude) && Number.isFinite(activeCity.longitude)) {
      mapInstanceRef.current.flyTo([activeCity.latitude, activeCity.longitude], Math.max(mapInstanceRef.current.getZoom(), 8), {
        duration: 1.2,
      });
    }
  }, [activeCity?.name, activeCity?.latitude, activeCity?.longitude]);

  // Combine all candidate cities:
  // 1. Curated global mountain, coastal & capital stations (300+ stations)
  // 2. All user-searched cities from search bar / dashboard
  // 3. Priority Himalayan stations
  // 4. World Cities directory results
  const allCandidateCities = useMemo(() => {
    const list = [...CLOUDBURST_GLOBAL_STATIONS];
    const seen = new Set(
      list.map((s) => `${Number(s.latitude).toFixed(2)},${Number(s.longitude).toFixed(2)}`),
    );

    // Merge searched cities first so they take high visibility
    (searchedCities || []).forEach((sc) => {
      const key = `${Number(sc.latitude).toFixed(2)},${Number(sc.longitude).toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.unshift(sc);
      }
    });

    // Merge priority stations from /api/locations
    (priorityStations || []).forEach((ps) => {
      const key = `${Number(ps.latitude).toFixed(2)},${Number(ps.longitude).toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: ps.id || `ps-${ps.name}`,
          name: ps.name,
          region: ps.state || "Himalayan Region",
          country: ps.country || "India",
          countryCode: ps.countryCode || "IN",
          continent: "Asia",
          basin: ps.basin || "Himalayan Basin",
          elevationM: ps.elevationM || null,
          latitude: ps.latitude,
          longitude: ps.longitude,
          riskLevel: "Low",
          riskScore: 15,
          rainfallRateMmH: 0,
          capeJkg: 50,
          hazardType: "Priority Hydro Corridor Station",
          powerAsset: ps.powerAsset || "Hydropower Grid",
          metAgency: ps.metAgency || "IMD Meteorological Centre",
          advisory: "Standard generation schedules and routine monitoring.",
        });
      }
    });

    // Merge world directory cities (from search or country browser)
    (directoryCities || []).slice(0, 50).forEach((dc) => {
      const key = `${Number(dc.latitude).toFixed(2)},${Number(dc.longitude).toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: dc.id || `dc-${dc.name}-${dc.latitude}`,
          name: dc.name,
          region: dc.state || dc.country || "World City",
          country: dc.country || "Global",
          countryCode: dc.countryCode || "",
          continent: "Global",
          basin: dc.basin || `${dc.country || "Global"} Catchment`,
          elevationM: dc.elevationM || null,
          latitude: dc.latitude,
          longitude: dc.longitude,
          riskLevel: "Low",
          riskScore: 12,
          rainfallRateMmH: 0,
          capeJkg: 40,
          hazardType: "Global Monitored City",
          powerAsset: "Regional Grid",
          metAgency: "National Meteorological Service",
          advisory: "Standard meteorological bulletin logging.",
        });
      }
    });

    return list;
  }, [searchedCities, priorityStations, directoryCities]);

  // Fetch real-time live telemetry for all stations across the world via /api/weather/batch
  useEffect(() => {
    const controller = new AbortController();

    async function fetchLiveTelemetry() {
      if (allCandidateCities.length === 0) return;

      try {
        const payload = allCandidateCities.slice(0, 320).map((c) => ({
          id: c.id,
          name: c.name,
          state: c.region,
          country: c.country,
          latitude: c.latitude,
          longitude: c.longitude,
        }));

        const res = await getBatchWeather(payload, controller.signal);
        if (Array.isArray(res?.results) && res.results.length > 0) {
          const updates = {};
          res.results.forEach((item) => {
            if (!item?.risk) return;
            updates[item.id] = {
              score: item.risk.score,
              level: item.risk.level,
              imdTier: item.risk.imdTier,
              powerAdvisory: item.risk.powerAdvisory?.action,
              rain: item.current?.precipitation ?? 0,
              cape: item.risk?.peakCape ?? 0,
              humidity: item.current?.humidity ?? 50,
              pressure: item.current?.pressure,
              pressureDrop: item.risk?.pressureDrop3h,
            };
          });
          setLiveStationData((prev) => ({ ...prev, ...updates }));
          return;
        }
      } catch (err) {
        // Fallback to direct client API if backend batch endpoint is unreachable
        try {
          const targets = allCandidateCities.slice(0, 80);
          const lats = targets.map((s) => s.latitude.toFixed(3)).join(",");
          const lons = targets.map((s) => s.longitude.toFixed(3)).join(",");
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=precipitation,rain,relative_humidity_2m,pressure_msl,temperature_2m&hourly=precipitation,cape,pressure_msl&forecast_days=1`;
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) return;
          const data = await res.json();
          const list = Array.isArray(data) ? data : [data];

          const updates = {};
          list.forEach((item, idx) => {
            const st = targets[idx];
            if (!st || !item.current) return;
            const currentRain = item.current.rain ?? item.current.precipitation ?? 0;
            const humidity = item.current.relative_humidity_2m ?? 50;
            const hourlyPrecip = item.hourly?.precipitation ?? [];
            const hourlyCape = item.hourly?.cape ?? [];
            const peakRain = hourlyPrecip.length ? Math.max(...hourlyPrecip.filter(Number.isFinite)) : 0;
            const peakCape = hourlyCape.length ? Math.max(...hourlyCape.filter(Number.isFinite)) : 0;

            const rainPoints = Math.min(25, currentRain * 3.5);
            const forecastPoints = Math.min(40, peakRain * 2.5);
            const humidityPoints = humidity >= 92 ? 12 : humidity >= 85 ? 8 : humidity >= 75 ? 4 : 0;
            const capePoints = peakCape >= 1500 ? 10 : peakCape >= 800 ? 6 : peakCape >= 300 ? 2 : 0;
            const score = Math.min(100, Math.round(rainPoints + forecastPoints + humidityPoints + capePoints));
            const level = score >= 60 ? "High" : score >= 25 ? "Watch" : "Low";

            updates[st.id] = {
              score,
              level,
              rain: currentRain,
              peakRain,
              cape: Math.round(peakCape),
              humidity,
            };
          });
          setLiveStationData((prev) => ({ ...prev, ...updates }));
        } catch {
          // gracefully fall back to baseline
        }
      }
    }

    fetchLiveTelemetry();
    return () => controller.abort();
  }, [allCandidateCities.length]);

  // Live query for external world cities when searching in map input
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setExternalResults([]);
      setIsSearchingExternal(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingExternal(true);

    const timer = setTimeout(() => {
      searchLocations({ q, limit: 6 }, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) {
            setExternalResults(res.results || []);
            setSearchOpen(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setExternalResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearchingExternal(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Compute live updated stations: active search city takes highest priority!
  const stationsWithLiveData = allCandidateCities.map((st) => {
    const isDashboardActive = isMatchingStation(st, activeCity);

    // If active in dashboard and has live weather, live weather is 100% authoritative!
    const activeRiskScore =
      isDashboardActive && Number.isFinite(liveWeather?.risk?.score)
        ? liveWeather.risk.score
        : null;
    const activeRiskLevel =
      isDashboardActive && liveWeather?.risk?.level
        ? liveWeather.risk.level
        : null;
    const activeRain =
      isDashboardActive && Number.isFinite(liveWeather?.current?.precipitation)
        ? liveWeather.current.precipitation
        : null;
    const activeCape =
      isDashboardActive && Number.isFinite(liveWeather?.risk?.peakCape)
        ? Math.round(liveWeather.risk.peakCape)
        : null;
    const activeAdvisory =
      isDashboardActive && liveWeather?.risk?.powerAdvisory?.action
        ? liveWeather.risk.powerAdvisory.action
        : null;
    const activeHazard =
      isDashboardActive && liveWeather?.risk?.imdTier
        ? liveWeather.risk.imdTier
        : null;

    const currentScore =
      activeRiskScore !== null
        ? activeRiskScore
        : (liveStationData[st.id]?.score ?? st.riskScore);

    const currentLevel =
      activeRiskLevel !== null
        ? activeRiskLevel
        : (liveStationData[st.id]?.level ?? st.riskLevel);

    const currentRain =
      activeRain !== null
        ? activeRain
        : (liveStationData[st.id]?.rain ?? st.rainfallRateMmH);

    const currentCape =
      activeCape !== null
        ? activeCape
        : (liveStationData[st.id]?.cape ?? st.capeJkg);

    const currentAdvisory =
      activeAdvisory ||
      liveStationData[st.id]?.powerAdvisory ||
      (currentLevel === "High"
        ? "Red Alert: Severe cloudburst hazard detected."
        : currentLevel === "Watch"
        ? "Watch: Elevated moisture saturation."
        : "Normal: Standard generation schedules and routine 3-hour bulletin logging.");

    return {
      ...st,
      isDashboardActive,
      riskScore: currentScore,
      riskLevel: currentLevel,
      rainfallRateMmH: currentRain,
      capeJkg: currentCape,
      hazardType: activeHazard || liveStationData[st.id]?.imdTier || st.hazardType,
      advisory: currentAdvisory,
    };
  });

  // Action: Add city to map directly from search
  const handleAddCityToMap = (city) => {
    setSearchQuery("");
    setSearchOpen(false);

    // 1. Add to searchedCities if not present
    setSearchedCities((prev) => {
      const exists = prev.some((c) => isMatchingStation(c, city));
      if (exists) return prev;
      const entry = {
        id: city.id || `search-${city.name}-${city.latitude.toFixed(2)}`,
        name: city.name,
        region: city.state || city.country || "Searched City",
        country: city.country || "Global",
        countryCode: city.countryCode || "",
        continent: "Global",
        basin: city.basin || `${city.name} Basin`,
        elevationM: city.elevationM || null,
        latitude: city.latitude,
        longitude: city.longitude,
        riskLevel: "Low",
        riskScore: 16,
        rainfallRateMmH: 0,
        capeJkg: 50,
        hazardType: "User-Added Monitored Station",
        powerAsset: city.powerAsset || "Regional Power Grid",
        metAgency: city.metAgency || "National Meteorological Service",
        advisory: "Live Monitored Telemetry",
        isUserSearched: true,
      };
      const updated = [entry, ...prev];
      try {
        localStorage.setItem("cloudburst.mapSearchedCities", JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });

    // 2. Fly map to coordinates
    if (mapInstanceRef.current && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)) {
      mapInstanceRef.current.flyTo([city.latitude, city.longitude], 9, { duration: 1.4 });
    }

    // 3. Notify parent app
    if (onSelectCity) {
      onSelectCity(city);
    }
  };

  // Statistics
  const highRiskCount = stationsWithLiveData.filter((s) => s.riskLevel === "High").length;
  const watchRiskCount = stationsWithLiveData.filter((s) => s.riskLevel === "Watch").length;
  const lowRiskCount = stationsWithLiveData.filter((s) => s.riskLevel === "Low").length;

  // Filter stations for map display
  const filteredStations = stationsWithLiveData.filter((station) => {
    const matchesRisk = riskFilter === "ALL" || station.riskLevel === riskFilter;
    const matchesContinent =
      continentFilter === "ALL" || station.continent === continentFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      station.name.toLowerCase().includes(q) ||
      station.country.toLowerCase().includes(q) ||
      (station.region && station.region.toLowerCase().includes(q)) ||
      (station.basin && station.basin.toLowerCase().includes(q));
    return matchesRisk && matchesContinent && matchesQuery;
  });

  // Check if Leaflet is ready on window. If not, wait or dynamically attach
  useEffect(() => {
    let checkInterval = null;

    if (typeof window !== "undefined" && window.L) {
      setLeafletReady(true);
      return;
    }

    checkInterval = setInterval(() => {
      if (typeof window !== "undefined" && window.L) {
        setLeafletReady(true);
        clearInterval(checkInterval);
      }
    }, 200);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = window.L;

    // Center on Indian Himalayas & Global belt [27.0, 78.0]
    const map = L.map(mapContainerRef.current, {
      center: [27.5, 78.5],
      zoom: 4,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      worldCopyJump: true,
    });

    mapInstanceRef.current = map;

    // Initial Base Tile Layer (100% Keyless)
    const provider =
      KEYLESS_TILE_PROVIDERS[mapStyle] || KEYLESS_TILE_PROVIDERS["esri-dark"];

    const tileLayer = L.tileLayer(provider.url, provider.options).addTo(map);
    map._activeTileLayer = tileLayer;

    // Feature groups
    corridorsGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.featureGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady]);

  // Update base tile layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const provider =
      KEYLESS_TILE_PROVIDERS[mapStyle] || KEYLESS_TILE_PROVIDERS["esri-dark"];

    if (map._activeTileLayer) {
      map.removeLayer(map._activeTileLayer);
    }

    const newTile = L.tileLayer(provider.url, provider.options).addTo(map);
    map._activeTileLayer = newTile;
  }, [mapStyle]);

  // Draw Corridors
  useEffect(() => {
    if (!mapInstanceRef.current || !corridorsGroupRef.current || !window.L) return;
    const L = window.L;
    const corridorsGroup = corridorsGroupRef.current;
    corridorsGroup.clearLayers();

    if (!showCorridors) return;

    CLOUDBURST_CORRIDORS.forEach((corridor) => {
      // Background glow line
      L.polyline(corridor.coordinates, {
        color: corridor.color,
        weight: corridor.weight + 4,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(corridorsGroup);

      // Foreground dashed line
      const poly = L.polyline(corridor.coordinates, {
        color: corridor.color,
        weight: corridor.weight,
        opacity: 0.9,
        dashArray: corridor.dashArray,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(corridorsGroup);

      poly.bindTooltip(
        `<strong>${corridor.name}</strong><br/><span style="font-size: 11px;">${corridor.description}</span>`,
        { sticky: true, className: "corridor-tooltip" }
      );
    });
  }, [leafletReady, showCorridors]);

  // Render station markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !window.L) return;
    const L = window.L;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    filteredStations.forEach((st) => {
      const isDashboardActive = st.isDashboardActive;
      const isUserSearched = st.isUserSearched;
      const currentScore = st.riskScore;
      const currentLevel = st.riskLevel;

      // Custom HTML Marker with pulsing radar ring for HIGH RISK
      let markerHtml = "";
      let markerSize = [32, 32];
      let iconAnchor = [16, 16];

      if (currentLevel === "High") {
        // Red Marker with pulsating outer radar rings
        markerHtml = `
          <div class="relative flex items-center justify-center w-8 h-8" title="${st.name} - HIGH CLOUDBURST RISK">
            <span class="radar-ping-red"></span>
            <span class="absolute w-6 h-6 rounded-full bg-red-600/35"></span>
            <div class="relative w-4.5 h-4.5 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white leading-none">
              !
            </div>
          </div>
        `;
      } else if (currentLevel === "Watch") {
        // Amber Marker with subtle radar ping
        markerHtml = `
          <div class="relative flex items-center justify-center w-7 h-7" title="${st.name} - WATCH (Elevated Risk)">
            <span class="radar-ping-amber"></span>
            <div class="relative w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-md"></div>
          </div>
        `;
        markerSize = [28, 28];
        iconAnchor = [14, 14];
      } else {
        // Low / Normal Green
        markerHtml = `
          <div class="relative flex items-center justify-center w-6 h-6" title="${st.name} - Low / Baseline Risk">
            <div class="w-3 h-3 rounded-full ${isUserSearched ? "bg-cyan-500 ring-2 ring-cyan-300" : "bg-emerald-500"} border-2 border-white shadow-sm"></div>
          </div>
        `;
        markerSize = [24, 24];
        iconAnchor = [12, 12];
      }

      const customIcon = L.divIcon({
        className: "custom-cloudburst-marker",
        html: markerHtml,
        iconSize: markerSize,
        iconAnchor: iconAnchor,
        popupAnchor: [0, -14],
      });

      const marker = L.marker([st.latitude, st.longitude], { icon: customIcon });

      // Interactive popup
      const popupContent = `
        <div style="min-width: 250px; padding: 12px 14px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
            <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${st.name}</h3>
            <span style="font-size: 11px; font-family: monospace; font-weight: 600; color: #64748b;">${st.countryCode || "INTL"}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            ${st.region ? `${st.region}, ` : ""}${st.country} ${st.elevationM ? `· ${st.elevationM} m` : ""}
            ${isUserSearched ? ` · <span style="color: #0284c7; font-weight: 600;">Searched City</span>` : ""}
          </div>

          <div style="margin-top: 10px; padding: 8px 10px; border-radius: 6px; background-color: ${
            currentLevel === "High"
              ? "#fef2f2"
              : currentLevel === "Watch"
              ? "#fffbeb"
              : "#ecfdf5"
          }; border: 1px solid ${
        currentLevel === "High"
          ? "#fecaca"
          : currentLevel === "Watch"
          ? "#fde68a"
          : "#a7f3d0"
      };">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 700; color: ${
                currentLevel === "High"
                  ? "#b91c1c"
                  : currentLevel === "Watch"
                  ? "#b45309"
                  : "#047857"
              };">
                ${currentLevel === "High" ? "🚨 HIGH CLOUDBURST RISK" : currentLevel === "Watch" ? "⚠️ ELEVATED WATCH" : "✅ NORMAL RISK"}
              </span>
              <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">
                ${currentScore}/100
              </span>
            </div>
            <div style="font-size: 11px; color: #334155; margin-top: 4px; line-height: 1.3;">
              ${st.hazardType}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; font-size: 11px; font-family: monospace;">
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px;">
              <span style="color: #64748b;">Rain Rate:</span> <strong>${st.rainfallRateMmH || 0} mm/h</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px;">
              <span style="color: #64748b;">CAPE:</span> <strong>${st.capeJkg || 0} J/kg</strong>
            </div>
          </div>

          <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
            <strong>Catchment / Grid:</strong> ${st.basin || st.powerAsset}
          </div>

          <button
            id="btn-select-${st.id}"
            style="margin-top: 10px; width: 100%; background: #1d4ed8; color: #ffffff; border: none; padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; text-align: center; transition: background 0.2s;"
            onmouseover="this.style.background='#1e40af'"
            onmouseout="this.style.background='#1d4ed8'"
          >
            Inspect in Live Dashboard &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.on("click", () => {
        setSelectedStation(st);
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-select-${st.id}`);
        if (btn && onSelectCity) {
          btn.onclick = () => {
            onSelectCity({
              name: st.name.split("&")[0].trim(),
              state: st.region,
              country: st.country,
              countryCode: st.countryCode,
              latitude: st.latitude,
              longitude: st.longitude,
              elevationM: st.elevationM,
              basin: st.basin,
              powerAsset: st.powerAsset,
              metAgency: st.metAgency,
              isPriorityStation: true,
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
          };
        }
      });

      marker.addTo(markersGroup);
    });
  }, [filteredStations, activeCity, liveWeather, onSelectCity]);

  // When activeCity in the main dashboard changes, draw a target reticle and pan map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !activeCity) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (activeReticleRef.current) {
      map.removeLayer(activeReticleRef.current);
      activeReticleRef.current = null;
    }

    if (
      Number.isFinite(activeCity.latitude) &&
      Number.isFinite(activeCity.longitude)
    ) {
      // Cyan glowing reticle circle marker
      activeReticleRef.current = L.circleMarker(
        [activeCity.latitude, activeCity.longitude],
        {
          radius: 18,
          color: "#06b6d4", // Cyan
          weight: 3,
          opacity: 0.9,
          fillColor: "#0891b2",
          fillOpacity: 0.2,
          dashArray: "4, 4",
        }
      ).addTo(map);

      activeReticleRef.current.bindTooltip(
        `<strong>ACTIVE DASHBOARD NODE</strong><br/>${activeCity.name}`,
        { permanent: false, direction: "top" }
      );
    }
  }, [activeCity]);

  // Quick region zoom helper
  const zoomToRegion = (regionKey) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    switch (regionKey) {
      case "himalayas":
        map.flyTo([30.5, 79.5], 7, { duration: 1.2 });
        break;
      case "western-ghats":
        map.flyTo([13.5, 75.5], 6.5, { duration: 1.2 });
        break;
      case "europe":
        map.flyTo([46.5, 8.5], 6, { duration: 1.2 });
        break;
      case "americas":
        map.flyTo([38.0, -100.0], 4.5, { duration: 1.2 });
        break;
      case "global":
      default:
        map.flyTo([25.0, 30.0], 2.5, { duration: 1.2 });
        break;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <section
      id="world-map"
      className={`relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "my-8"
      }`}
      aria-label="Global Cloudburst & Hydrological Risk Map"
    >
      {/* Map Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Globe2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                World Cloudburst &amp; Flash Flood Risk Map
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                LIVE TELEMETRY SYNC
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {stationsWithLiveData.length} CITIES PLOTTED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-risk zones marked in red with radar pings. Search any city to automatically add it to the map.
            </p>
          </div>
        </div>

        {/* Live Active City Indicator Pill */}
        {activeCity && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-slate-300 font-medium">ACTIVE:</span>
            <span className="text-white font-bold">{activeCity.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                liveWeather?.risk?.level === "High"
                  ? "bg-red-500/20 text-red-300"
                  : liveWeather?.risk?.level === "Watch"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {liveWeather?.risk?.level || "SYNC"} ({liveWeather?.risk?.score ?? 15}/100)
            </span>
          </div>
        )}
      </div>

      {/* Control Bar: Risk Filters, Region Jumps, Search Input, Layer Options */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Risk Level Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <button
            type="button"
            onClick={() => setRiskFilter("ALL")}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              riskFilter === "ALL"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
            }`}
          >
            All Cities ({stationsWithLiveData.length})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("High")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "High"
                ? "bg-red-700 text-white shadow-xs"
                : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:bg-red-100 border border-red-300 dark:border-red-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            High Risk ({highRiskCount})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("Watch")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "Watch"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 border border-amber-300 dark:border-amber-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Watch ({watchRiskCount})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("Low")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "Low"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Normal ({lowRiskCount})
          </button>
        </div>

        {/* Map Search Input with Autocomplete to Add Any City */}
        <div ref={searchContainerRef} className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder={`Search ${stationsWithLiveData.length}+ cities or add to map...`}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
              {/* 1. Matches already on the map */}
              {filteredStations.length > 0 && (
                <div className="p-1 border-b border-slate-100 dark:border-slate-700">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Plotted Stations on Map ({filteredStations.length})
                  </div>
                  {filteredStations.slice(0, 5).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchOpen(false);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo([st.latitude, st.longitude], 9, { duration: 1.2 });
                        }
                        if (onSelectCity) onSelectCity(st);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        {st.name} <span className="text-slate-400 font-normal">({st.countryCode})</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          st.riskLevel === "High"
                            ? "bg-red-100 text-red-700"
                            : st.riskLevel === "Watch"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {st.riskScore}/100
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Global World Cities Search Results to Add to Map */}
              {externalResults.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Add City to Map</span>
                    <span className="text-blue-500 font-normal">Click to plot</span>
                  </div>
                  {externalResults.map((city) => (
                    <button
                      key={`${city.id}-${city.latitude}-${city.longitude}`}
                      type="button"
                      onClick={() => handleAddCityToMap(city)}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs group"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <PlusCircle className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                          {city.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {city.state ? `${city.state}, ` : ""}{city.country}
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded font-medium">
                        + Plot on Map
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredStations.length === 0 && externalResults.length === 0 && !isSearchingExternal && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No cities found for "{searchQuery}". Try a major city name.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Region Jumps */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Jump to:
          </span>

          <button
            type="button"
            onClick={() => zoomToRegion("himalayas")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 font-medium cursor-pointer"
          >
            Himalayas &amp; IHR
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("western-ghats")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 font-medium cursor-pointer"
          >
            Western Ghats
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("europe")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 font-medium cursor-pointer"
          >
            Alps
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("americas")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 font-medium cursor-pointer"
          >
            Americas
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("global")}
            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-medium cursor-pointer"
          >
            World Overview
          </button>
        </div>

        {/* Layer Controls & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Corridor Toggle */}
          <button
            type="button"
            onClick={() => setShowCorridors(!showCorridors)}
            className={`px-2.5 py-1 rounded border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCorridors
                ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Corridors {showCorridors ? "ON" : "OFF"}
          </button>

          {/* Map Style Selector (100% Free & Keyless) */}
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="esri-dark">Dark Radar (Esri)</option>
            <option value="osm">Standard Light (OSM)</option>
            <option value="topo">Mountain Topo (Esri)</option>
            <option value="satellite">Satellite (Esri)</option>
          </select>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full bg-slate-950 ${
            isFullscreen ? "h-[calc(100vh-105px)]" : "h-[540px]"
          }`}
        />

        {/* Floating Active Station Status Card in Top-Right */}
        {activeCity && (
          <div className="absolute top-4 right-4 z-[400] max-w-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg p-3 shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                ACTIVE STATION
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                  liveWeather?.risk?.level === "High"
                    ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                    : liveWeather?.risk?.level === "Watch"
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {liveWeather?.risk?.score ?? 18}/100
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {activeCity.name}, {activeCity.countryCode || "IN"}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeCity.state || activeCity.region || "Catchment Corridor"}
            </div>
          </div>
        )}

        {/* Legend Overlay in Bottom-Left */}
        <div className="absolute bottom-4 left-4 z-[400] max-w-xs bg-slate-900/90 dark:bg-slate-950/95 text-white backdrop-blur-md rounded-lg p-3 shadow-lg border border-slate-700 text-xs space-y-2 pointer-events-auto">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] border-b border-slate-700/80 pb-1.5">
            <OctagonAlert className="w-3.5 h-3.5 text-red-400" />
            Cloudburst Risk Thresholds
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex items-center justify-center w-3.5 h-3.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[8px] font-bold text-white">
                !
              </span>
            </span>
            <span className="text-[11px]">
              <strong className="text-red-400">HIGH RISK (Red):</strong> &gt;100 mm/h or Score &ge; 60. Severe convective hazard.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0"></span>
            <span className="text-[11px]">
              <strong className="text-amber-400">WATCH (Amber):</strong> 25–59 Score. Elevated moisture / convective watch.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0"></span>
            <span className="text-[11px]">
              <strong className="text-emerald-400">LOW (Green):</strong> &lt;25 Score. Normal baseline weather.
            </span>
          </div>

          {showCorridors && (
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
              <span className="text-red-400 font-mono">---</span> Dashed Red Line: High-hazard orographic corridor
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
