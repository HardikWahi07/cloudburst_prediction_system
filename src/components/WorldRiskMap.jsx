import { useEffect, useRef, useState } from "react";
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
  ShieldCheck,
  Zap,
} from "lucide-react";

// Global database of major cloudburst-vulnerable mountainous regions, hydropower nodes,
// and steep orographic catchment basins across the world.
export const CLOUDBURST_GLOBAL_STATIONS = [
  // --- Indian Himalayan Region (IHR) & Karakoram ---
  {
    id: "ihr-kedarnath",
    name: "Kedarnath & Upper Mandakini",
    region: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Mandakini Gorge & Chorabari Basin",
    elevationM: 3583,
    latitude: 30.7346,
    longitude: 79.0669,
    riskLevel: "High",
    riskScore: 92,
    rainfallRateMmH: 114.5,
    capeJkg: 2450,
    pressureDrop3h: 3.8,
    hazardType: "Catastrophic Orographic Deluge & Glacial Lake Breach Risk",
    powerAsset: "Singoli-Bhatwari & Mandakini Hydro Corridors",
    metAgency: "IMD Dehradun · High Altitude Telemetry Node",
    advisory: "Red Alert: Upstream evacuation protocol; stage emergency reservoir release.",
  },
  {
    id: "ihr-joshimath",
    name: "Joshimath",
    region: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Alaknanda Basin",
    elevationM: 1890,
    latitude: 30.5506,
    longitude: 79.5658,
    riskLevel: "High",
    riskScore: 88,
    rainfallRateMmH: 102.0,
    capeJkg: 2180,
    pressureDrop3h: 3.1,
    hazardType: "Narrow Canyon Orographic Funneling & Landslide Damming",
    powerAsset: "Tapovan-Vishnugad & Vishnuprayag Hydro Complexes",
    metAgency: "IMD Dehradun · Chamoli Telemetry Node",
    advisory: "Red Alert: Inspect silt gates and notify downstream intake tunnels.",
  },
  {
    id: "ihr-dehradun",
    name: "Dehradun",
    region: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Ganga-Yamuna Foothills",
    elevationM: 640,
    latitude: 30.3165,
    longitude: 78.0322,
    riskLevel: "Watch",
    riskScore: 54,
    rainfallRateMmH: 42.0,
    capeJkg: 1350,
    pressureDrop3h: 1.8,
    hazardType: "Foothill Cloudburst & Flash River Surges",
    powerAsset: "Lakhwar-Vyasi Hydro Complex & Regional Grid",
    metAgency: "IMD Meteorological Centre Dehradun",
    advisory: "Watch: Silt monitoring active; maintain 3-hour telemetry bulletins.",
  },
  {
    id: "ihr-tehri",
    name: "Tehri",
    region: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Bhagirathi Basin",
    elevationM: 1750,
    latitude: 30.3772,
    longitude: 78.4803,
    riskLevel: "Watch",
    riskScore: 48,
    rainfallRateMmH: 36.5,
    capeJkg: 1100,
    pressureDrop3h: 1.4,
    hazardType: "Reservoir Inflow Surges & Silt Accumulation",
    powerAsset: "Tehri Dam & Pumped Storage Plant (2,400 MW)",
    metAgency: "IMD Dehradun · Tehri Reservoir Observatory",
    advisory: "Watch: Monitor Bhagirathi intake inflow trends and headpond level.",
  },
  {
    id: "ihr-rudraprayag",
    name: "Rudraprayag",
    region: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Mandakini-Alaknanda Confluence",
    elevationM: 895,
    latitude: 30.2844,
    longitude: 78.9811,
    riskLevel: "High",
    riskScore: 86,
    rainfallRateMmH: 98.0,
    capeJkg: 2200,
    pressureDrop3h: 2.9,
    hazardType: "Confluence Backwater Surge & Sudden Flash Floods",
    powerAsset: "Srinagar & Singoli-Bhatwari Hydro Stations",
    metAgency: "IMD Dehradun · Mandakini Valley Station",
    advisory: "Red Alert: Pre-alert downstream Srinagar Hydro dam control room.",
  },
  {
    id: "ihr-manali",
    name: "Manali & Solang",
    region: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Upper Beas Basin",
    elevationM: 2050,
    latitude: 32.2396,
    longitude: 77.1887,
    riskLevel: "High",
    riskScore: 89,
    rainfallRateMmH: 108.0,
    capeJkg: 2310,
    pressureDrop3h: 3.4,
    hazardType: "Valley Cloudburst, Torrential Runoff & Riverbank Scour",
    powerAsset: "Parbati-II & Larji Hydroelectric Corridor",
    metAgency: "IMD Shimla · Kullu Node",
    advisory: "Red Alert: Flash flood alarm along Beas gorge; restrict riverside access.",
  },
  {
    id: "ihr-shimla",
    name: "Shimla",
    region: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Sutlej Basin",
    elevationM: 2205,
    latitude: 31.1048,
    longitude: 77.1734,
    riskLevel: "Watch",
    riskScore: 45,
    rainfallRateMmH: 32.0,
    capeJkg: 980,
    pressureDrop3h: 1.2,
    hazardType: "Steep Ridge Slope Saturation & Drainage Overflows",
    powerAsset: "Nathpa Jhakri (1,500 MW) & Rampur Hydro Grid",
    metAgency: "IMD Meteorological Centre Shimla",
    advisory: "Watch: Municipal stormwater clearing and slope stabilization watch.",
  },
  {
    id: "ihr-dharamshala",
    name: "Dharamshala",
    region: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Kangra Valley · Dhauladhar Slopes",
    elevationM: 1457,
    latitude: 32.219,
    longitude: 76.3234,
    riskLevel: "High",
    riskScore: 84,
    rainfallRateMmH: 94.0,
    capeJkg: 2050,
    pressureDrop3h: 2.7,
    hazardType: "Extreme Dhauladhar Orographic Cloudburst Wall",
    powerAsset: "Gaj & Pong Dam Hydrological Network",
    metAgency: "IMD Shimla · Kangra Telemetry",
    advisory: "Red Alert: High probability of localized cloudburst in foothill rivulets.",
  },
  {
    id: "ihr-leh",
    name: "Leh",
    region: "Ladakh",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Upper Indus Basin",
    elevationM: 3500,
    latitude: 34.1526,
    longitude: 77.5771,
    riskLevel: "High",
    riskScore: 82,
    rainfallRateMmH: 78.0,
    capeJkg: 1750,
    pressureDrop3h: 2.6,
    hazardType: "Cold Desert Cloudburst & Torrential Mud Debris Flows",
    powerAsset: "Nimoo Bazgo & Chutak Hydroelectric Stations",
    metAgency: "IMD Meteorological Centre Leh",
    advisory: "Red Alert: Dry alluvial gullies at extreme risk of hyper-concentrated mud flows.",
  },
  {
    id: "ihr-gangtok",
    name: "Gangtok & Teesta Valley",
    region: "Sikkim",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Teesta Basin",
    elevationM: 1650,
    latitude: 27.3314,
    longitude: 88.6138,
    riskLevel: "High",
    riskScore: 91,
    rainfallRateMmH: 112.0,
    capeJkg: 2500,
    pressureDrop3h: 3.5,
    hazardType: "Extreme Monsoon Cloudburst & Glacial Outburst Risk",
    powerAsset: "Teesta-V (510 MW) & Teesta Stage-III Cascade",
    metAgency: "IMD Meteorological Centre Gangtok",
    advisory: "Red Alert: Emergency barrage pre-release and Teesta riverbank warning.",
  },
  {
    id: "ihr-roing",
    name: "Roing",
    region: "Arunachal Pradesh",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Dibang-Brahmaputra Basin",
    elevationM: 390,
    latitude: 28.1411,
    longitude: 95.8355,
    riskLevel: "Watch",
    riskScore: 52,
    rainfallRateMmH: 45.0,
    capeJkg: 1400,
    pressureDrop3h: 1.6,
    hazardType: "Eastern Himalayan Cloudburst & Mountain Washouts",
    powerAsset: "Lower Dibang Valley & Subansiri Hydro Corridor",
    metAgency: "IMD Meteorological Centre Itanagar",
    advisory: "Watch: Monitor mountain tributary stages and bridge abutments.",
  },
  {
    id: "ihr-cherrapunji",
    name: "Cherrapunji & Mawsynram",
    region: "Meghalaya",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Khasi Hills · Bay of Bengal Inflow",
    elevationM: 1484,
    latitude: 25.2986,
    longitude: 91.7337,
    riskLevel: "High",
    riskScore: 95,
    rainfallRateMmH: 130.0,
    capeJkg: 2800,
    pressureDrop3h: 4.2,
    hazardType: "Global Record Orographic Cloudburst Funnel",
    powerAsset: "Umiam Hydro Cascade & Regional Grid",
    metAgency: "IMD Regional Met Centre Guwahati",
    advisory: "Red Alert: Extreme intense precipitation cloudburst threshold breached.",
  },
  {
    id: "ihr-wayanad",
    name: "Wayanad & Meppadi",
    region: "Kerala",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Western Ghats · Chaliyar Catchment",
    elevationM: 900,
    latitude: 11.6854,
    longitude: 76.132,
    riskLevel: "High",
    riskScore: 90,
    rainfallRateMmH: 106.0,
    capeJkg: 2350,
    pressureDrop3h: 3.2,
    hazardType: "Western Ghats Cloudburst, Multi-Tier Landslides & Debris Flow",
    powerAsset: "Banasura Sagar Dam & Malabar Hydro Corridor",
    metAgency: "IMD Thiruvananthapuram · Wayanad Observatory",
    advisory: "Red Alert: Evacuate tea estate valleys; flood surge in Chaliyar tributary.",
  },
  {
    id: "ihr-mahabaleshwar",
    name: "Mahabaleshwar",
    region: "Maharashtra",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    basin: "Western Ghats Escarpment · Krishna Basin",
    elevationM: 1353,
    latitude: 17.9237,
    longitude: 73.6586,
    riskLevel: "High",
    riskScore: 85,
    rainfallRateMmH: 96.0,
    capeJkg: 2100,
    pressureDrop3h: 2.8,
    hazardType: "Monsoon Windward Cloudburst & Koyna Catchment Inflows",
    powerAsset: "Koyna Hydroelectric Project (1,960 MW)",
    metAgency: "IMD Pune · Mahabaleshwar High Altitude Lab",
    advisory: "Red Alert: Koyna reservoir spillway pre-discharge coordination active.",
  },

  // --- Nepal, Karakoram & South Asia ---
  {
    id: "nepal-pokhara",
    name: "Pokhara & Annapurna Foothills",
    region: "Gandaki",
    country: "Nepal",
    countryCode: "NP",
    continent: "Asia",
    basin: "Seti River Gorge & Kali Gandaki",
    elevationM: 822,
    latitude: 28.2096,
    longitude: 83.9856,
    riskLevel: "High",
    riskScore: 87,
    rainfallRateMmH: 104.0,
    capeJkg: 2280,
    pressureDrop3h: 3.1,
    hazardType: "Annapurna Orographic Cloudburst & Seti Flash Flood",
    powerAsset: "Middle Marsyangdi & Kaligandaki 'A' Hydro",
    metAgency: "Department of Hydrology & Meteorology Nepal",
    advisory: "Red Alert: Rapid rise in Seti river gorge; low-lying settlements alert.",
  },
  {
    id: "pak-gilgit",
    name: "Gilgit & Hunza Valley",
    region: "Gilgit-Baltistan",
    country: "Pakistan",
    countryCode: "PK",
    continent: "Asia",
    basin: "Hunza-Gilgit-Indus Confluence",
    elevationM: 1500,
    latitude: 35.9221,
    longitude: 74.3087,
    riskLevel: "High",
    riskScore: 83,
    rainfallRateMmH: 80.0,
    capeJkg: 1800,
    pressureDrop3h: 2.7,
    hazardType: "Karakoram Glacial Stream Cloudburst & GLOF",
    powerAsset: "Diamer-Bhasha Hydropower Dam Corridor",
    metAgency: "Pakistan Meteorological Department",
    advisory: "Red Alert: High risk of sudden mountain washouts and debris surges.",
  },

  // --- European Alpine Convective Arc ---
  {
    id: "eu-innsbruck",
    name: "Innsbruck & Tyrolean Alps",
    region: "Tyrol",
    country: "Austria",
    countryCode: "AT",
    continent: "Europe",
    basin: "Inn Valley Catchment",
    elevationM: 574,
    latitude: 47.2692,
    longitude: 11.4041,
    riskLevel: "Watch",
    riskScore: 56,
    rainfallRateMmH: 48.0,
    capeJkg: 1550,
    pressureDrop3h: 2.1,
    hazardType: "Alpine Valley Convective Storm & Flash Inundation",
    powerAsset: "Tyrol Alpine Pumped Hydro Storage Network",
    metAgency: "GeoSphere Austria (ZAMG)",
    advisory: "Watch: Silt trapping in mountain streams; localized flash flood alerts.",
  },
  {
    id: "eu-chamonix",
    name: "Chamonix & Mont Blanc",
    region: "Haute-Savoie",
    country: "France",
    countryCode: "FR",
    continent: "Europe",
    basin: "Arve Alpine Valley",
    elevationM: 1035,
    latitude: 45.9237,
    longitude: 6.8694,
    riskLevel: "High",
    riskScore: 78,
    rainfallRateMmH: 74.0,
    capeJkg: 1900,
    pressureDrop3h: 2.4,
    hazardType: "High Alpine Convective Cloudburst & Glacial Torrent Swells",
    powerAsset: "Électricité de France Alpine Hydro Network",
    metAgency: "Météo-France Chamonix Node",
    advisory: "Red Alert: Torrent des Bossons and Arve valley flash flood watch.",
  },
  {
    id: "eu-bergamo",
    name: "Bergamo & Orobie Alps",
    region: "Lombardy",
    country: "Italy",
    countryCode: "IT",
    continent: "Europe",
    basin: "Brembo & Serio Basins",
    elevationM: 249,
    latitude: 45.6983,
    longitude: 9.6773,
    riskLevel: "High",
    riskScore: 81,
    rainfallRateMmH: 86.0,
    capeJkg: 2150,
    pressureDrop3h: 2.9,
    hazardType: "Pre-Alpine Supercell Cloudburst & Severe Hailstorm",
    powerAsset: "Enel Hydroelectric Stations · Po Valley Grid",
    metAgency: "Aeronautica Militare Servizio Meteorologico",
    advisory: "Red Alert: High-velocity runoff in Serio gorge; pre-flood civil protection alert.",
  },
  {
    id: "eu-zermatt",
    name: "Zermatt & Mattertal",
    region: "Valais",
    country: "Switzerland",
    countryCode: "CH",
    continent: "Europe",
    basin: "Vispa-Rhone Alpine Catchment",
    elevationM: 1608,
    latitude: 45.9765,
    longitude: 7.7491,
    riskLevel: "Watch",
    riskScore: 50,
    rainfallRateMmH: 38.0,
    capeJkg: 1200,
    pressureDrop3h: 1.5,
    hazardType: "Alpine Glacier Runoff Surge & Steep Debris Funnels",
    powerAsset: "Grande Dixence Hydro Complex (2,000 MW)",
    metAgency: "MeteoSwiss Alpine Station",
    advisory: "Watch: Continuous telemetry check on Vispa torrent weirs.",
  },

  // --- Americas (Rockies, Appalachians, Andes) ---
  {
    id: "us-boulder",
    name: "Boulder & Front Range Canyons",
    region: "Colorado",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    basin: "South Platte · Boulder Creek Gorge",
    elevationM: 1655,
    latitude: 40.015,
    longitude: -105.2705,
    riskLevel: "High",
    riskScore: 84,
    rainfallRateMmH: 92.0,
    capeJkg: 2300,
    pressureDrop3h: 3.0,
    hazardType: "Rocky Mountain Front Range Flash Flood & Canyon Trapping",
    powerAsset: "Western Area Power Grid & Hydro Reservoirs",
    metAgency: "NOAA National Weather Service Boulder",
    advisory: "Red Alert: Extreme canyon flash flood risk; immediate canyon road closures.",
  },
  {
    id: "us-asheville",
    name: "Asheville & Blue Ridge",
    region: "North Carolina",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    basin: "French Broad & Swannanoa Basins",
    elevationM: 650,
    latitude: 35.5951,
    longitude: -82.5515,
    riskLevel: "High",
    riskScore: 89,
    rainfallRateMmH: 105.0,
    capeJkg: 2400,
    pressureDrop3h: 3.6,
    hazardType: "Appalachian Orographic Deluge & Mountain River Cresting",
    powerAsset: "Duke Energy Mountain Hydro & Grid Distribution",
    metAgency: "NOAA NWS Greenville-Spartanburg",
    advisory: "Red Alert: Catastrophic inundation threshold along French Broad river.",
  },
  {
    id: "us-rapid-city",
    name: "Rapid City & Black Hills",
    region: "South Dakota",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    basin: "Rapid Creek Basin",
    elevationM: 976,
    latitude: 44.0805,
    longitude: -103.231,
    riskLevel: "Watch",
    riskScore: 47,
    rainfallRateMmH: 35.0,
    capeJkg: 1450,
    pressureDrop3h: 1.7,
    hazardType: "Isolated Orographic Convective Supercell Flash Flood",
    powerAsset: "Pactola Reservoir & Black Hills Power Co",
    metAgency: "NOAA NWS Rapid City",
    advisory: "Watch: Pactola reservoir spillway standby and creek stage logging.",
  },
  {
    id: "sa-medellin",
    name: "Medellín & Aburrá Valley",
    region: "Antioquia",
    country: "Colombia",
    countryCode: "CO",
    continent: "South America",
    basin: "Medellín River & Andes Slopes",
    elevationM: 1495,
    latitude: 6.2442,
    longitude: -75.5812,
    riskLevel: "High",
    riskScore: 86,
    rainfallRateMmH: 98.0,
    capeJkg: 2250,
    pressureDrop3h: 2.8,
    hazardType: "Tropical Mountain Valley Convective Downpours & Mudslides",
    powerAsset: "EPM Empresas Públicas Hydro & Transmission Grid",
    metAgency: "IDEAM Colombia · SIATA Early Warning System",
    advisory: "Red Alert: Sirens active on steep eastern hillside drainage channels.",
  },
  {
    id: "sa-huaraz",
    name: "Huaraz & Cordillera Blanca",
    region: "Ancash",
    country: "Peru",
    countryCode: "PE",
    continent: "South America",
    basin: "Santa River Valley",
    elevationM: 3052,
    latitude: -9.5278,
    longitude: -77.5278,
    riskLevel: "High",
    riskScore: 80,
    rainfallRateMmH: 72.0,
    capeJkg: 1600,
    pressureDrop3h: 2.3,
    hazardType: "High Andes Cloudburst, Debris Avalanches (Aluviones)",
    powerAsset: "Cañón del Pato Hydroelectric Plant (263 MW)",
    metAgency: "SENAMHI Peru · Glaciology Unit",
    advisory: "Red Alert: Upstream glacial lagoon outflow sensors triggered.",
  },
  {
    id: "sa-quito",
    name: "Quito & Pichincha Slopes",
    region: "Pichincha",
    country: "Ecuador",
    countryCode: "EC",
    continent: "South America",
    basin: "Guayllabamba & Machángara Basins",
    elevationM: 2850,
    latitude: -0.1807,
    longitude: -78.4678,
    riskLevel: "Watch",
    riskScore: 53,
    rainfallRateMmH: 40.0,
    capeJkg: 1300,
    pressureDrop3h: 1.5,
    hazardType: "Equatorial High Altitude Convective Downpour",
    powerAsset: "Coca Codo Sinclair Regional Feeder Grid",
    metAgency: "INAMHI Ecuador",
    advisory: "Watch: Slope mud containment basins monitored at La Gasca.",
  },

  // --- East Asia & Pacific ---
  {
    id: "ea-zhengzhou",
    name: "Zhengzhou & Taihang Foothills",
    region: "Henan",
    country: "China",
    countryCode: "CN",
    continent: "Asia",
    basin: "Yellow River Tributaries",
    elevationM: 108,
    latitude: 34.7466,
    longitude: 113.6253,
    riskLevel: "High",
    riskScore: 94,
    rainfallRateMmH: 125.0,
    capeJkg: 2750,
    pressureDrop3h: 4.0,
    hazardType: "Meso-Scale Convective Vortex & Catastrophic Inundation",
    powerAsset: "State Grid Henan & Yellow River Dams",
    metAgency: "China Meteorological Administration (CMA)",
    advisory: "Red Alert: Maximum flood containment protocol; underground transit halts.",
  },
  {
    id: "ea-hiroshima",
    name: "Hiroshima & Chugoku Mountains",
    region: "Chugoku",
    country: "Japan",
    countryCode: "JP",
    continent: "Asia",
    basin: "Ota River Valley",
    elevationM: 30,
    latitude: 34.3853,
    longitude: 132.4553,
    riskLevel: "High",
    riskScore: 83,
    rainfallRateMmH: 88.0,
    capeJkg: 2100,
    pressureDrop3h: 2.7,
    hazardType: "Linear Precipitation Train (Senjo-Kousuitai) Cloudburst",
    powerAsset: "Chugoku Electric Power Company Hydro Grid",
    metAgency: "Japan Meteorological Agency (JMA) Hiroshima",
    advisory: "Red Alert: Level 5 emergency warning for localized mountain slope washouts.",
  },
  {
    id: "ea-taipei",
    name: "Taipei & Yangmingshan Slopes",
    region: "Northern Taiwan",
    country: "Taiwan",
    countryCode: "TW",
    continent: "Asia",
    basin: "Tamsui & Keelung River Basins",
    elevationM: 25,
    latitude: 25.033,
    longitude: 121.5654,
    riskLevel: "Watch",
    riskScore: 58,
    rainfallRateMmH: 52.0,
    capeJkg: 1650,
    pressureDrop3h: 2.0,
    hazardType: "Typhoon Spiral Band & Orographic Rain Trapping",
    powerAsset: "Feitsui Dam & Taipower Hydro Transmission",
    metAgency: "Central Weather Administration (CWA) Taiwan",
    advisory: "Watch: Feitsui reservoir automated gate management active.",
  },
  {
    id: "ea-baguio",
    name: "Baguio & Cordillera Central",
    region: "Benguet",
    country: "Philippines",
    countryCode: "PH",
    continent: "Asia",
    basin: "Amburayan & Agno River Basins",
    elevationM: 1470,
    latitude: 16.4023,
    longitude: 120.596,
    riskLevel: "High",
    riskScore: 90,
    rainfallRateMmH: 108.0,
    capeJkg: 2500,
    pressureDrop3h: 3.3,
    hazardType: "World-Record Monsoon Tropical Mountain Cloudbursts",
    powerAsset: "Ambuklao & Binga Hydro Complexes",
    metAgency: "PAGASA Baguio Synoptic Station",
    advisory: "Red Alert: Kennon & Marcos mountain pass roads flagged for closures.",
  },

  // --- Middle East & Africa ---
  {
    id: "me-wadi-rum",
    name: "Petra & Wadi Rum Canyons",
    region: "Aqaba",
    country: "Jordan",
    countryCode: "JO",
    continent: "Asia",
    basin: "Wadi Musa & Dead Sea Drainage",
    elevationM: 950,
    latitude: 30.3285,
    longitude: 35.4444,
    riskLevel: "High",
    riskScore: 82,
    rainfallRateMmH: 68.0,
    capeJkg: 1700,
    pressureDrop3h: 2.5,
    hazardType: "Desert Slotted-Canyon Sudden Cloudburst & Torrents",
    powerAsset: "National Electric Power Company (NEPCO) Grid",
    metAgency: "Jordan Meteorological Department",
    advisory: "Red Alert: Complete evacuation of Siq canyon and dry river wadis.",
  },
  {
    id: "af-nairobi",
    name: "Rift Valley Escarpment",
    region: "Nakuru / Naivasha",
    country: "Kenya",
    countryCode: "KE",
    continent: "Africa",
    basin: "Great Rift Valley Catchment",
    elevationM: 1884,
    latitude: -0.7172,
    longitude: 36.431,
    riskLevel: "Watch",
    riskScore: 55,
    rainfallRateMmH: 44.0,
    capeJkg: 1500,
    pressureDrop3h: 1.8,
    hazardType: "Rift Valley Volcanic Silt Cloudbursts & Dam Failures",
    powerAsset: "Olkaria Geothermal & KenGen Hydro Complex",
    metAgency: "Kenya Meteorological Department",
    advisory: "Watch: Saturated volcanic loam slopes under heavy runoff surveillance.",
  },

  // --- Baseline Low Risk Benchmark Stations ---
  {
    id: "base-reykjavik",
    name: "Reykjavik",
    region: "Capital Region",
    country: "Iceland",
    countryCode: "IS",
    continent: "Europe",
    basin: "Faxaflói Coastal Catchment",
    elevationM: 15,
    latitude: 64.1466,
    longitude: -21.9426,
    riskLevel: "Low",
    riskScore: 12,
    rainfallRateMmH: 2.1,
    capeJkg: 40,
    pressureDrop3h: 0.3,
    hazardType: "Stable Maritime Climate · Negligible Convective Cloudburst Risk",
    powerAsset: "Hellisheiði Geothermal & Landsvirkjun Grid",
    metAgency: "Icelandic Meteorological Office",
    advisory: "Normal: Standard meteorological monitoring.",
  },
  {
    id: "base-cairo",
    name: "Cairo",
    region: "Nile Delta",
    country: "Egypt",
    countryCode: "EG",
    continent: "Africa",
    basin: "Lower Nile",
    elevationM: 23,
    latitude: 30.0444,
    longitude: 31.2357,
    riskLevel: "Low",
    riskScore: 15,
    rainfallRateMmH: 0.0,
    capeJkg: 120,
    pressureDrop3h: 0.4,
    hazardType: "Arid Flatland Basin · Trace Precipitation",
    powerAsset: "Aswan Transmission Corridor & New Administrative Grid",
    metAgency: "Egyptian Meteorological Authority",
    advisory: "Normal: Standard operations; routine bulletin logging.",
  },
  {
    id: "base-singapore",
    name: "Singapore Central",
    region: "Central Area",
    country: "Singapore",
    countryCode: "SG",
    continent: "Asia",
    basin: "Marina Catchment",
    elevationM: 15,
    latitude: 1.3521,
    longitude: 103.8198,
    riskLevel: "Watch",
    riskScore: 48,
    rainfallRateMmH: 36.0,
    capeJkg: 1800,
    pressureDrop3h: 1.1,
    hazardType: "High Tropical Convection with High-Capacity Pumping Drainage",
    powerAsset: "SP Group Underground Substation Network",
    metAgency: "Meteorological Service Singapore",
    advisory: "Watch: Automated tidal barrage pump stations activated.",
  },
  {
    id: "base-london",
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    countryCode: "GB",
    continent: "Europe",
    basin: "Thames Estuary",
    elevationM: 25,
    latitude: 51.5074,
    longitude: -0.1278,
    riskLevel: "Low",
    riskScore: 18,
    rainfallRateMmH: 3.5,
    capeJkg: 150,
    pressureDrop3h: 0.6,
    hazardType: "Moderate Maritime Fronts · Thames Barrier Protected",
    powerAsset: "National Grid ESO · London Ring Main",
    metAgency: "UK Met Office",
    advisory: "Normal: Routine river monitoring.",
  },
];

// Major orographic cloudburst corridors across the globe
const CLOUDBURST_CORRIDORS = [
  {
    name: "Himalayan Cloudburst Arc (Red Alert Front)",
    description: "World's most active cloudburst corridor spanning Jammu & Kashmir, Himachal Pradesh, Uttarakhand, Nepal, Sikkim, and Arunachal Pradesh.",
    color: "#dc2626", // Red
    weight: 4,
    dashArray: "6, 6",
    coordinates: [
      [34.15, 74.8], // Kashmir
      [32.24, 77.19], // Manali
      [31.1, 77.17], // Shimla
      [30.55, 79.56], // Joshimath
      [28.21, 83.98], // Pokhara, Nepal
      [27.7, 85.32], // Kathmandu
      [27.33, 88.61], // Gangtok, Sikkim
      [25.3, 91.73], // Cherrapunji
      [28.14, 95.84], // Roing, Arunachal
    ],
  },
  {
    name: "Western Ghats Monsoonal Escarpment",
    description: "Steep windward mountain wall intercepting the Arabian Sea monsoon with sudden convective burst cells.",
    color: "#ea580c", // Orange-Red
    weight: 3.5,
    dashArray: "4, 6",
    coordinates: [
      [19.0, 73.5], // Western Maharashtra
      [17.92, 73.66], // Mahabaleshwar
      [14.5, 74.8], // Karnataka Ghats
      [11.68, 76.13], // Wayanad, Kerala
      [9.5, 77.0], // Idukki
    ],
  },
  {
    name: "Alpine Severe Convective Arc",
    description: "European high alpine trench funneling warm Mediterranean air over glaciated mountain crests.",
    color: "#d97706", // Amber
    weight: 3,
    dashArray: "5, 5",
    coordinates: [
      [45.92, 6.87], // Chamonix
      [45.98, 7.75], // Zermatt
      [45.7, 9.68], // Bergamo
      [47.27, 11.4], // Innsbruck
      [47.5, 13.0], // Salzburg Alps
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
];

export default function WorldRiskMap({ activeCity, onSelectCity, liveWeather }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const corridorsGroupRef = useRef(null);
  const activeReticleRef = useRef(null);

  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, High, Watch, Low
  const [continentFilter, setContinentFilter] = useState("ALL");
  const [showCorridors, setShowCorridors] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark"); // dark, voyager, osm
  const [selectedStation, setSelectedStation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Statistics
  const highRiskCount = CLOUDBURST_GLOBAL_STATIONS.filter((s) => s.riskLevel === "High").length;
  const watchRiskCount = CLOUDBURST_GLOBAL_STATIONS.filter((s) => s.riskLevel === "Watch").length;
  const lowRiskCount = CLOUDBURST_GLOBAL_STATIONS.filter((s) => s.riskLevel === "Low").length;

  // Filter stations
  const filteredStations = CLOUDBURST_GLOBAL_STATIONS.filter((station) => {
    const matchesRisk = riskFilter === "ALL" || station.riskLevel === riskFilter;
    const matchesContinent =
      continentFilter === "ALL" || station.continent === continentFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      station.name.toLowerCase().includes(q) ||
      station.country.toLowerCase().includes(q) ||
      station.basin.toLowerCase().includes(q);
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
    if (!leafletReady || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const L = window.L;

    // Create map centered on the Himalayas / South Asia with world zoom
    const map = L.map(mapContainerRef.current, {
      center: [28.0, 78.5],
      zoom: 4,
      minZoom: 2,
      maxZoom: 14,
      worldCopyJump: true,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Tile layers
    const tileUrls = {
      dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    };

    const tileLayer = L.tileLayer(tileUrls[mapStyle] || tileUrls.dark, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

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

    const tileUrls = {
      dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    };

    if (map._activeTileLayer) {
      map.removeLayer(map._activeTileLayer);
    }

    const newTile = L.tileLayer(tileUrls[mapStyle] || tileUrls.dark, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

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
      // Determine if this is currently the active station in the parent dashboard
      const isDashboardActive =
        activeCity &&
        st.name.toLowerCase().includes(activeCity.name.toLowerCase());

      // If active station matches and parent has live weather, use live score!
      const currentScore =
        isDashboardActive && liveWeather?.risk?.score
          ? liveWeather.risk.score
          : st.riskScore;
      const currentLevel =
        isDashboardActive && liveWeather?.risk?.level
          ? liveWeather.risk.level
          : st.riskLevel;

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
            <div class="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
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
            <span style="font-size: 11px; font-family: monospace; font-weight: 600; color: #64748b;">${st.countryCode}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            ${st.region}, ${st.country} · ${st.elevationM ? `${st.elevationM} m` : ""}
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
              <span style="color: #64748b;">Rain Rate:</span> <strong>${st.rainfallRateMmH} mm/h</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px;">
              <span style="color: #64748b;">CAPE:</span> <strong>${st.capeJkg} J/kg</strong>
            </div>
          </div>

          <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
            <strong>Infrastructure:</strong> ${st.powerAsset}
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
      const reticle = L.circleMarker([activeCity.latitude, activeCity.longitude], {
        radius: 14,
        color: "#06b6d4",
        weight: 3,
        fillColor: "#22d3ee",
        fillOpacity: 0.35,
        dashArray: "3, 4",
      }).addTo(map);

      reticle.bindTooltip(
        `Active Station: <strong>${activeCity.name}</strong> (${activeCity.latitude.toFixed(2)}°, ${activeCity.longitude.toFixed(2)}°)`,
        { permanent: false, direction: "top" }
      );

      activeReticleRef.current = reticle;
    }
  }, [activeCity]);

  // Quick region zoom helper
  const zoomToRegion = (regionKey) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    switch (regionKey) {
      case "himalayas":
        map.flyTo([30.5, 79.0], 7, { duration: 1.2 });
        break;
      case "western-ghats":
        map.flyTo([13.5, 75.5], 7, { duration: 1.2 });
        break;
      case "europe":
        map.flyTo([46.5, 9.5], 6, { duration: 1.2 });
        break;
      case "americas":
        map.flyTo([39.0, -100.0], 5, { duration: 1.2 });
        break;
      case "east-asia":
        map.flyTo([30.0, 120.0], 5, { duration: 1.2 });
        break;
      case "global":
      default:
        map.flyTo([25.0, 30.0], 3, { duration: 1.2 });
        break;
    }
  };

  return (
    <section
      id="world-map"
      className="mt-10 border border-slate-200 bg-white rounded-lg overflow-hidden shadow-xs"
      aria-labelledby="map-heading"
    >
      {/* Header with Title and Risk Statistics */}
      <div className="p-5 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-md bg-blue-50 text-blue-700">
              <Globe2 className="w-4 h-4" aria-hidden="true" />
            </span>
            <h2 id="map-heading" className="text-lg font-bold text-slate-900 tracking-tight">
              Global Cloudburst Risk &amp; Vulnerability Radar
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold font-mono animate-pulse">
              LIVE RADAR
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              Free OpenStreetMap · No API Key
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Open-source planetary observatory (powered by OpenStreetMap &amp; Leaflet — zero API keys or tokens needed) identifying steep orographic flash flood zones,
            Himalayan cloudburst corridors, convective instability hotspots, and monitored hydro assets.
          </p>
        </div>

        {/* Real-time stats pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 border border-red-200 text-red-900">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <span className="text-xs font-bold font-mono tabular-nums">{highRiskCount}</span>
            <span className="text-xs font-medium">High Risk (Red)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-950">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-xs font-bold font-mono tabular-nums">{watchRiskCount}</span>
            <span className="text-xs font-medium">Watch (Amber)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold font-mono tabular-nums">{lowRiskCount}</span>
            <span className="text-xs font-medium">Low / Base</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Risk Filters, Region Jumps, Layer Options */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Risk Level Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <button
            type="button"
            onClick={() => setRiskFilter("ALL")}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              riskFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
            }`}
          >
            All Stations ({CLOUDBURST_GLOBAL_STATIONS.length})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("High")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "High"
                ? "bg-red-700 text-white shadow-xs"
                : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            High Risk (Red Only)
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("Watch")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "Watch"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Watch (Amber)
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter("Low")}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              riskFilter === "Low"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Normal (Green)
          </button>
        </div>

        {/* Region Jumps */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Jump to:
          </span>

          <button
            type="button"
            onClick={() => zoomToRegion("himalayas")}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium cursor-pointer"
          >
            Himalayas &amp; IHR
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("western-ghats")}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium cursor-pointer"
          >
            Western Ghats
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("europe")}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium cursor-pointer"
          >
            Alps
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("americas")}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium cursor-pointer"
          >
            Americas
          </button>

          <button
            type="button"
            onClick={() => zoomToRegion("global")}
            className="px-2.5 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300 font-medium cursor-pointer"
          >
            World Overview
          </button>
        </div>

        {/* Layer style & Corridors toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCorridors(!showCorridors)}
            className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              showCorridors
                ? "bg-red-50 text-red-900 border-red-300"
                : "bg-white text-slate-600 border-slate-300"
            }`}
            title="Toggle Orographic Cloudburst Vulnerability Corridors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Corridors {showCorridors ? "ON" : "OFF"}</span>
          </button>

          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
            aria-label="Map Tile Style"
          >
            <option value="dark">Carto Dark Radar</option>
            <option value="voyager">Voyager Terrain</option>
            <option value="osm">OpenStreetMap</option>
          </select>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Map"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full transition-all ${
            isFullscreen ? "h-[750px]" : "h-[500px]"
          } bg-slate-950`}
        />

        {/* Legend Overlay inside Map */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white rounded-lg p-3 text-xs shadow-xl max-w-xs pointer-events-auto">
          <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
            <OctagonAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Cloudburst Risk Thresholds</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                !
              </span>
              <div>
                <span className="font-bold text-red-400">HIGH RISK (Red):</span>{" "}
                <span className="text-slate-300">
                  &gt;100 mm/h or Score &ge; 60. Severe convective hazard.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0"></span>
              <div>
                <span className="font-bold text-amber-400">WATCH (Amber):</span>{" "}
                <span className="text-slate-300">
                  25–59 Score. Elevated moisture / convective watch.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0"></span>
              <div>
                <span className="font-bold text-emerald-400">LOW (Green):</span>{" "}
                <span className="text-slate-300">&lt;25 Score. Normal baseline weather.</span>
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-700/80 flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500"></span>
              <span>Dashed Red Line: High-hazard orographic corridor</span>
            </div>
          </div>
        </div>

        {/* Active Station Card Overlay */}
        {activeCity && (
          <div className="hidden sm:flex absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md border border-slate-300 text-slate-900 rounded-lg p-3 text-xs shadow-lg max-w-xs pointer-events-auto items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Active Station
                </p>
                <p className="font-bold text-slate-900 truncate max-w-[170px]">
                  {activeCity.name}, {activeCity.countryCode || activeCity.state}
                </p>
              </div>
            </div>
            {liveWeather?.risk && (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  liveWeather.risk.level === "High"
                    ? "bg-red-100 text-red-800"
                    : liveWeather.risk.level === "Watch"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {liveWeather.risk.score}/100
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selected Station Quick Detail Footer Strip */}
      {selectedStation && (
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <span
              className={`p-1.5 rounded-md shrink-0 ${
                selectedStation.riskLevel === "High"
                  ? "bg-red-600 text-white"
                  : selectedStation.riskLevel === "Watch"
                  ? "bg-amber-500 text-slate-900"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {selectedStation.riskLevel === "High" ? (
                <OctagonAlert className="w-4 h-4" />
              ) : selectedStation.riskLevel === "Watch" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{selectedStation.name}</span>
                <span className="font-mono text-slate-400">
                  {selectedStation.region}, {selectedStation.country}
                </span>
                <span
                  className={`px-2 py-0.2 rounded font-mono font-bold text-[11px] ${
                    selectedStation.riskLevel === "High"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : selectedStation.riskLevel === "Watch"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {selectedStation.riskLevel.toUpperCase()} RISK ({selectedStation.riskScore}/100)
                </span>
              </div>
              <p className="text-slate-300 mt-1">{selectedStation.advisory}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Basin: {selectedStation.basin} · Rain Rate: {selectedStation.rainfallRateMmH} mm/h ·
                Instability (CAPE): {selectedStation.capeJkg} J/kg · Asset: {selectedStation.powerAsset}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onSelectCity) {
                onSelectCity({
                  name: selectedStation.name.split("&")[0].trim(),
                  state: selectedStation.region,
                  country: selectedStation.country,
                  countryCode: selectedStation.countryCode,
                  latitude: selectedStation.latitude,
                  longitude: selectedStation.longitude,
                  elevationM: selectedStation.elevationM,
                  basin: selectedStation.basin,
                  powerAsset: selectedStation.powerAsset,
                  metAgency: selectedStation.metAgency,
                  isPriorityStation: true,
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md transition-colors shrink-0 cursor-pointer"
          >
            Inspect in Live Dashboard &rarr;
          </button>
        </div>
      )}
    </section>
  );
}

