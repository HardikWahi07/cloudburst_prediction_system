import allCities from "all-the-cities";

const priorityStations = [
  {
    id: "ihr-dehradun",
    name: "Dehradun",
    state: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    basin: "Ganga-Yamuna Foothills",
    elevationM: 640,
    powerAsset: "Lakhwar-Vyasi Hydro Complex & Regional Grid",
    metAgency: "IMD Meteorological Centre Dehradun",
    population: 578420,
    latitude: 30.3165,
    longitude: 78.0322,
    isPriorityStation: true,
  },
  {
    id: "ihr-joshimath",
    name: "Joshimath",
    state: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    basin: "Alaknanda Basin",
    elevationM: 1890,
    powerAsset: "Tapovan-Vishnugad & Vishnuprayag Hydro Corridor",
    metAgency: "IMD Dehradun · Chamoli Telemetry Node",
    population: 16709,
    latitude: 30.5506,
    longitude: 79.5658,
    isPriorityStation: true,
  },
  {
    id: "ihr-tehri",
    name: "Tehri",
    state: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    basin: "Bhagirathi Basin",
    elevationM: 1750,
    powerAsset: "Tehri Dam & Pumped Storage Plant (2,400 MW)",
    metAgency: "IMD Dehradun · Tehri Reservoir Observatory",
    population: 25423,
    latitude: 30.3772,
    longitude: 78.4803,
    isPriorityStation: true,
  },
  {
    id: "ihr-rudraprayag",
    name: "Rudraprayag",
    state: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    basin: "Mandakini-Alaknanda Confluence",
    elevationM: 895,
    powerAsset: "Srinagar & Singoli-Bhatwari Hydro Stations",
    metAgency: "IMD Dehradun · Mandakini Valley Station",
    population: 9313,
    latitude: 30.2844,
    longitude: 78.9811,
    isPriorityStation: true,
  },
  {
    id: "ihr-manali",
    name: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    basin: "Upper Beas Basin",
    elevationM: 2050,
    powerAsset: "Parbati-II & Larji Hydroelectric Corridor",
    metAgency: "IMD Meteorological Centre Shimla · Kullu Node",
    population: 8096,
    latitude: 32.2396,
    longitude: 77.1887,
    isPriorityStation: true,
  },
  {
    id: "ihr-shimla",
    name: "Shimla",
    state: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    basin: "Sutlej Basin",
    elevationM: 2205,
    powerAsset: "Nathpa Jhakri (1,500 MW) & Rampur Hydro Grid",
    metAgency: "IMD Meteorological Centre Shimla",
    population: 169578,
    latitude: 31.1048,
    longitude: 77.1734,
    isPriorityStation: true,
  },
  {
    id: "ihr-reckong-peo",
    name: "Reckong Peo",
    state: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    basin: "Upper Sutlej Gorge",
    elevationM: 2290,
    powerAsset: "Karcham Wangtoo & Baspa-II Hydroelectric Plants",
    metAgency: "IMD Shimla · Kinnaur High-Altitude Station",
    population: 5200,
    latitude: 31.5409,
    longitude: 78.2738,
    isPriorityStation: true,
  },
  {
    id: "ihr-leh",
    name: "Leh",
    state: "Ladakh",
    country: "India",
    countryCode: "IN",
    basin: "Upper Indus Basin",
    elevationM: 3500,
    powerAsset: "Nimoo Bazgo & Chutak Hydroelectric Stations",
    metAgency: "IMD Meteorological Centre Leh",
    population: 30870,
    latitude: 34.1526,
    longitude: 77.5771,
    isPriorityStation: true,
  },
  {
    id: "ihr-gangtok",
    name: "Gangtok",
    state: "Sikkim",
    country: "India",
    countryCode: "IN",
    basin: "Teesta Basin",
    elevationM: 1650,
    powerAsset: "Teesta-V (510 MW) & Teesta Stage-III Corridor",
    metAgency: "IMD Meteorological Centre Gangtok",
    population: 100286,
    latitude: 27.3314,
    longitude: 88.6138,
    isPriorityStation: true,
  },
  {
    id: "ihr-roing",
    name: "Roing",
    state: "Arunachal Pradesh",
    country: "India",
    countryCode: "IN",
    basin: "Dibang-Brahmaputra Basin",
    elevationM: 390,
    powerAsset: "Lower Dibang Valley & Subansiri Hydro Corridor",
    metAgency: "IMD Meteorological Centre Itanagar",
    population: 11389,
    latitude: 28.1411,
    longitude: 95.8355,
    isPriorityStation: true,
  },
];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function getCountryName(code) {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

let indexedCities = null;
let countrySummary = null;

function ensureWorldIndex() {
  if (indexedCities && countrySummary) return;

  const countryMap = new Map();
  const priorityByKey = new Map(
    priorityStations.map((s) => [`${s.name.toLowerCase()}|${s.countryCode}`, s]),
  );

  const mapped = allCities
    .slice()
    .sort((a, b) => (b.population || 0) - (a.population || 0))
    .map((c) => {
      const countryName = getCountryName(c.country);
      const countEntry = countryMap.get(c.country) || {
        code: c.country,
        name: countryName,
        cityCount: 0,
      };
      countEntry.cityCount += 1;
      countryMap.set(c.country, countEntry);

      const priority = priorityByKey.get(`${c.name.toLowerCase()}|${c.country}`);
      const [longitude, latitude] = c.loc.coordinates;

      return {
        id: priority ? priority.id : `geonames-${c.cityId}`,
        name: c.name,
        altName: c.altName || "",
        state: priority?.state || (c.adminCode ? `Region ${c.adminCode}` : countryName),
        country: countryName,
        countryCode: c.country,
        basin: priority?.basin || `${countryName} Catchment`,
        elevationM: priority?.elevationM ?? null,
        powerAsset:
          priority?.powerAsset || "Regional Grid & Hydrological Monitoring",
        metAgency:
          priority?.metAgency || `National Meteorological Service (${c.country})`,
        population: c.population || 0,
        latitude,
        longitude,
        isPriorityStation: Boolean(priority),
        _nameLower: c.name.toLowerCase(),
        _altLower: (c.altName || "").toLowerCase(),
        _countryLower: countryName.toLowerCase(),
      };
    });

  // Include any priority stations that were below population cutoff (e.g., Reckong Peo)
  const existingIds = new Set(mapped.map((m) => m.id));
  for (const station of priorityStations) {
    if (!existingIds.has(station.id)) {
      mapped.unshift({
        ...station,
        altName: "",
        _nameLower: station.name.toLowerCase(),
        _altLower: "",
        _countryLower: station.country.toLowerCase(),
      });
    }
  }

  indexedCities = mapped;
  countrySummary = Array.from(countryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function serializeCity(c) {
  return {
    id: c.id,
    name: c.name,
    state: c.state,
    country: c.country,
    countryCode: c.countryCode,
    basin: c.basin,
    elevationM: c.elevationM,
    powerAsset: c.powerAsset,
    metAgency: c.metAgency,
    population: c.population,
    latitude: c.latitude,
    longitude: c.longitude,
    isPriorityStation: c.isPriorityStation,
  };
}

async function fetchLiveGeocodingExtras(query, countryCode) {
  if (!query || query.length < 2) return [];
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query,
      count: "15",
      language: "en",
      format: "json",
    }).toString();

    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data?.results)) return [];

    return data.results
      .filter((r) => !countryCode || r.country_code === countryCode)
      .map((r) => ({
        id: `om-${r.id}`,
        name: r.name,
        state: r.admin1 || r.country || "",
        country: r.country || getCountryName(r.country_code),
        countryCode: r.country_code || "",
        basin: `${r.admin1 || r.country || "Global"} Catchment`,
        elevationM: Number.isFinite(r.elevation) ? Math.round(r.elevation) : null,
        powerAsset: "Regional Grid & Hydrological Monitoring",
        metAgency: `National Meteorological Service (${r.country_code || "INTL"})`,
        population: Number.isFinite(r.population) ? r.population : 0,
        latitude: r.latitude,
        longitude: r.longitude,
        isPriorityStation: false,
      }));
  } catch {
    return [];
  }
}

export const getLocations = (_req, res) => res.json(priorityStations);

export const getCountries = (_req, res) => {
  ensureWorldIndex();
  res.json({
    totalCities: indexedCities.length,
    countries: countrySummary,
  });
};

export const searchLocations = async (req, res) => {
  ensureWorldIndex();

  const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const queryLower = rawQuery.toLowerCase();
  const countryCode =
    typeof req.query.country === "string"
      ? req.query.country.trim().toUpperCase()
      : "";
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit || "50"), 10) || 50),
  );
  const offset = Math.max(
    0,
    Number.parseInt(String(req.query.offset || "0"), 10) || 0,
  );

  let pool = indexedCities;
  if (countryCode && countryCode !== "ALL") {
    pool = pool.filter((c) => c.countryCode === countryCode);
  }

  let exactMatches = [];
  let prefixMatches = [];
  let partialMatches = [];

  if (queryLower) {
    for (const c of pool) {
      if (c._nameLower === queryLower) {
        exactMatches.push(c);
      } else if (c._nameLower.startsWith(queryLower)) {
        prefixMatches.push(c);
      } else if (
        c._nameLower.includes(queryLower) ||
        c._altLower.includes(queryLower) ||
        c._countryLower.includes(queryLower)
      ) {
        partialMatches.push(c);
      }
    }
    pool = [...exactMatches, ...prefixMatches, ...partialMatches];
  }

  const total = pool.length;
  let results = pool.slice(offset, offset + limit).map(serializeCity);

  // When searching by name on the first page, merge live Open-Meteo geocoding results
  // to include smaller villages and elevation metadata if reachable.
  if (queryLower.length >= 2 && offset === 0 && results.length < limit) {
    const extras = await fetchLiveGeocodingExtras(rawQuery, countryCode === "ALL" ? "" : countryCode);
    if (extras.length > 0) {
      const seen = new Set(
        results.map(
          (r) =>
            `${r.name.toLowerCase()}|${r.countryCode}|${r.latitude.toFixed(1)}`,
        ),
      );
      for (const extra of extras) {
        const key = `${extra.name.toLowerCase()}|${extra.countryCode}|${extra.latitude.toFixed(1)}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(extra);
          if (results.length >= limit) break;
        }
      }
    }
  }

  res.json({
    total,
    totalWorldCities: indexedCities.length,
    offset,
    limit,
    results,
  });
};
