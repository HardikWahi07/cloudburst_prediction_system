import { queryPostgres } from "../db/postgres.js";
import {
  HIMALAYAN_DISTRICTS,
  HIMALAYAN_MONITORING_LOCATIONS,
  HIMALAYAN_STATES,
} from "../db/seedData.js";

// Fast in-memory lookup maps for instant fallback
const statesById = new Map(HIMALAYAN_STATES.map((s) => [s.id, s]));
const statesByCode = new Map(HIMALAYAN_STATES.map((s) => [s.code.toUpperCase(), s]));
const districtsById = new Map(HIMALAYAN_DISTRICTS.map((d) => [d.id, d]));

/**
 * Retrieves all Indian Himalayan Region states & Union Territories
 */
export async function getHimalayanStates() {
  const sql = `
    SELECT s.*, 
      COUNT(DISTINCT d.id)::int AS district_count,
      COUNT(DISTINCT l.id)::int AS monitoring_location_count
    FROM himalayan_states s
    LEFT JOIN himalayan_districts d ON s.id = d.state_id
    LEFT JOIN himalayan_monitoring_locations l ON s.id = l.state_id
    GROUP BY s.id
    ORDER BY s.name ASC;
  `;

  const rows = await queryPostgres(sql);
  if (rows) return rows;

  // Fallback
  return HIMALAYAN_STATES.map((s) => {
    const districtCount = HIMALAYAN_DISTRICTS.filter((d) => d.state_id === s.id).length;
    const locationCount = HIMALAYAN_MONITORING_LOCATIONS.filter((l) => l.state_id === s.id).length;
    return {
      ...s,
      district_count: districtCount,
      monitoring_location_count: locationCount,
    };
  });
}

/**
 * Retrieves districts in the Indian Himalayan Region, optionally filtered by state
 * @param {string|null} stateIdOrCode State ID or Code (e.g. 'ihr-state-uttarakhand' or 'UK')
 */
export async function getHimalayanDistricts(stateIdOrCode = null) {
  let matchedState = null;
  if (stateIdOrCode) {
    matchedState =
      statesById.get(stateIdOrCode) ||
      statesByCode.get(stateIdOrCode.toUpperCase());
  }

  const stateFilterId = matchedState ? matchedState.id : stateIdOrCode;

  if (stateFilterId) {
    const sql = `
      SELECT d.*, s.name AS state_name, s.code AS state_code,
        COUNT(l.id)::int AS monitoring_location_count
      FROM himalayan_districts d
      JOIN himalayan_states s ON d.state_id = s.id
      LEFT JOIN himalayan_monitoring_locations l ON d.id = l.district_id
      WHERE d.state_id = $1
      GROUP BY d.id, s.name, s.code
      ORDER BY d.name ASC;
    `;
    const rows = await queryPostgres(sql, [stateFilterId]);
    if (rows) return rows;

    return HIMALAYAN_DISTRICTS.filter((d) => d.state_id === stateFilterId).map((d) => {
      const state = statesById.get(d.state_id);
      const locCount = HIMALAYAN_MONITORING_LOCATIONS.filter((l) => l.district_id === d.id).length;
      return {
        ...d,
        state_name: state?.name || "Uttarakhand",
        state_code: state?.code || "UK",
        monitoring_location_count: locCount,
      };
    });
  }

  const sql = `
    SELECT d.*, s.name AS state_name, s.code AS state_code,
      COUNT(l.id)::int AS monitoring_location_count
    FROM himalayan_districts d
    JOIN himalayan_states s ON d.state_id = s.id
    LEFT JOIN himalayan_monitoring_locations l ON d.id = l.district_id
    GROUP BY d.id, s.name, s.code
    ORDER BY s.name ASC, d.name ASC;
  `;
  const rows = await queryPostgres(sql);
  if (rows) return rows;

  return HIMALAYAN_DISTRICTS.map((d) => {
    const state = statesById.get(d.state_id);
    const locCount = HIMALAYAN_MONITORING_LOCATIONS.filter((l) => l.district_id === d.id).length;
    return {
      ...d,
      state_name: state?.name || "Uttarakhand",
      state_code: state?.code || "UK",
      monitoring_location_count: locCount,
    };
  });
}

/**
 * Spatial Bounding-Box Query:
 * Retrieves all Himalayan monitoring locations inside a geographic bounding box [minLat, maxLat, minLon, maxLon]
 * @param {number} minLat Southern bound (-90 to 90)
 * @param {number} maxLat Northern bound (-90 to 90)
 * @param {number} minLon Western bound (-180 to 180)
 * @param {number} maxLon Eastern bound (-180 to 180)
 * @param {object} options Optional elevation filters and pagination
 */
export async function getLocationsInBoundingBox(minLat, maxLat, minLon, maxLon, options = {}) {
  const minElevation = Number.isFinite(options.minElevation) ? options.minElevation : 0;
  const maxElevation = Number.isFinite(options.maxElevation) ? options.maxElevation : 9000;
  const limit = Math.min(200, Math.max(1, Number(options.limit || 100)));

  const sql = `
    SELECT l.*, 
      d.name AS district_name, d.headquarters AS district_headquarters,
      s.name AS state_name, s.code AS state_code
    FROM himalayan_monitoring_locations l
    JOIN himalayan_states s ON l.state_id = s.id
    LEFT JOIN himalayan_districts d ON l.district_id = d.id
    WHERE l.latitude BETWEEN $1 AND $2
      AND l.longitude BETWEEN $3 AND $4
      AND l.elevation_m BETWEEN $5 AND $6
    ORDER BY l.elevation_m DESC
    LIMIT $7;
  `;

  const rows = await queryPostgres(sql, [minLat, maxLat, minLon, maxLon, minElevation, maxElevation, limit]);
  if (rows) return rows;

  // Fallback: In-memory geospatial scan
  return HIMALAYAN_MONITORING_LOCATIONS
    .filter((loc) => {
      const latOk = loc.latitude >= minLat && loc.latitude <= maxLat;
      const lonOk = loc.longitude >= minLon && loc.longitude <= maxLon;
      const elevOk = loc.elevation_m >= minElevation && loc.elevation_m <= maxElevation;
      return latOk && lonOk && elevOk;
    })
    .slice(0, limit)
    .map((loc) => {
      const state = statesById.get(loc.state_id);
      const district = districtsById.get(loc.district_id);
      return {
        ...loc,
        district_name: district?.name || null,
        district_headquarters: district?.headquarters || null,
        state_name: state?.name || "Uttarakhand",
        state_code: state?.code || "UK",
      };
    })
    .sort((a, b) => b.elevation_m - a.elevation_m);
}

/**
 * Searches and looks up Himalayan monitoring locations by name, district, or river basin
 * @param {string} query Search text
 * @param {object} options
 */
export async function lookupHimalayanLocation(query, options = {}) {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return [];

  const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
  const searchPattern = `%${q}%`;

  const sql = `
    SELECT l.*, 
      d.name AS district_name, d.headquarters AS district_headquarters,
      s.name AS state_name, s.code AS state_code
    FROM himalayan_monitoring_locations l
    JOIN himalayan_states s ON l.state_id = s.id
    LEFT JOIN himalayan_districts d ON l.district_id = d.id
    WHERE l.id = $1
      OR l.name ILIKE $2
      OR d.name ILIKE $2
      OR l.basin ILIKE $2
      OR l.sub_basin ILIKE $2
      OR s.name ILIKE $2
    ORDER BY 
      CASE WHEN LOWER(l.name) = LOWER($1) THEN 0
           WHEN l.name ILIKE $2 THEN 1
           ELSE 2 END,
      l.elevation_m DESC
    LIMIT $3;
  `;

  const rows = await queryPostgres(sql, [q, searchPattern, limit]);
  if (rows) return rows;

  // Fallback
  const qLower = q.toLowerCase();
  return HIMALAYAN_MONITORING_LOCATIONS
    .filter((loc) => {
      const state = statesById.get(loc.state_id);
      const district = districtsById.get(loc.district_id);
      return (
        loc.id === q ||
        loc.name.toLowerCase().includes(qLower) ||
        (loc.basin && loc.basin.toLowerCase().includes(qLower)) ||
        (loc.sub_basin && loc.sub_basin.toLowerCase().includes(qLower)) ||
        (district && district.name.toLowerCase().includes(qLower)) ||
        (state && state.name.toLowerCase().includes(qLower))
      );
    })
    .slice(0, limit)
    .map((loc) => {
      const state = statesById.get(loc.state_id);
      const district = districtsById.get(loc.district_id);
      return {
        ...loc,
        district_name: district?.name || null,
        district_headquarters: district?.headquarters || null,
        state_name: state?.name || "Uttarakhand",
        state_code: state?.code || "UK",
      };
    });
}

/**
 * Retrieves a single Himalayan location by its primary key identifier
 * @param {string} id Location ID
 */
export async function getHimalayanLocationById(id) {
  if (!id) return null;

  const sql = `
    SELECT l.*, 
      d.name AS district_name, d.headquarters AS district_headquarters,
      s.name AS state_name, s.code AS state_code, s.capital AS state_capital
    FROM himalayan_monitoring_locations l
    JOIN himalayan_states s ON l.state_id = s.id
    LEFT JOIN himalayan_districts d ON l.district_id = d.id
    WHERE l.id = $1
    LIMIT 1;
  `;

  const rows = await queryPostgres(sql, [id]);
  if (rows && rows.length > 0) return rows[0];

  // Fallback
  const loc = HIMALAYAN_MONITORING_LOCATIONS.find((l) => l.id === id);
  if (!loc) return null;

  const state = statesById.get(loc.state_id);
  const district = districtsById.get(loc.district_id);
  return {
    ...loc,
    district_name: district?.name || null,
    district_headquarters: district?.headquarters || null,
    state_name: state?.name || "Uttarakhand",
    state_code: state?.code || "UK",
    state_capital: state?.capital || "Dehradun",
  };
}

/**
 * Comprehensive multi-parameter filtering of monitoring locations
 */
export async function getHimalayanLocations(filters = {}) {
  const {
    stateId,
    stateCode,
    districtId,
    riskTier,
    minElevation,
    maxElevation,
    basin,
    limit = 50,
    offset = 0,
  } = filters;

  const clauses = [];
  const params = [];
  let paramIdx = 1;

  if (stateId) {
    clauses.push(`l.state_id = $${paramIdx++}`);
    params.push(stateId);
  } else if (stateCode) {
    clauses.push(`s.code = $${paramIdx++}`);
    params.push(stateCode.toUpperCase());
  }

  if (districtId) {
    clauses.push(`l.district_id = $${paramIdx++}`);
    params.push(districtId);
  }

  if (riskTier && riskTier !== "ALL") {
    clauses.push(`l.cloudburst_risk_tier = $${paramIdx++}`);
    params.push(riskTier);
  }

  if (Number.isFinite(minElevation)) {
    clauses.push(`l.elevation_m >= $${paramIdx++}`);
    params.push(minElevation);
  }

  if (Number.isFinite(maxElevation)) {
    clauses.push(`l.elevation_m <= $${paramIdx++}`);
    params.push(maxElevation);
  }

  if (basin) {
    clauses.push(`l.basin ILIKE $${paramIdx++}`);
    params.push(`%${basin}%`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const numLimit = Math.min(150, Math.max(1, Number(limit)));
  const numOffset = Math.max(0, Number(offset));

  const sql = `
    SELECT l.*, 
      d.name AS district_name, d.headquarters AS district_headquarters,
      s.name AS state_name, s.code AS state_code
    FROM himalayan_monitoring_locations l
    JOIN himalayan_states s ON l.state_id = s.id
    LEFT JOIN himalayan_districts d ON l.district_id = d.id
    ${whereClause}
    ORDER BY l.elevation_m DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  params.push(numLimit, numOffset);

  const rows = await queryPostgres(sql, params);
  if (rows) return rows;

  // Fallback
  return HIMALAYAN_MONITORING_LOCATIONS
    .filter((loc) => {
      const state = statesById.get(loc.state_id);
      if (stateId && loc.state_id !== stateId) return false;
      if (stateCode && state?.code !== stateCode.toUpperCase()) return false;
      if (districtId && loc.district_id !== districtId) return false;
      if (riskTier && riskTier !== "ALL" && loc.cloudburst_risk_tier !== riskTier) return false;
      if (Number.isFinite(minElevation) && loc.elevation_m < minElevation) return false;
      if (Number.isFinite(maxElevation) && loc.elevation_m > maxElevation) return false;
      if (basin && !loc.basin.toLowerCase().includes(basin.toLowerCase())) return false;
      return true;
    })
    .slice(numOffset, numOffset + numLimit)
    .map((loc) => {
      const state = statesById.get(loc.state_id);
      const district = districtsById.get(loc.district_id);
      return {
        ...loc,
        district_name: district?.name || null,
        district_headquarters: district?.headquarters || null,
        state_name: state?.name || "Uttarakhand",
        state_code: state?.code || "UK",
      };
    })
    .sort((a, b) => b.elevation_m - a.elevation_m);
}
