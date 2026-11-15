import { getDatabaseStatus } from "../db/postgres.js";
import {
  getHimalayanDistricts,
  getHimalayanLocationById,
  getHimalayanLocations,
  getHimalayanStates,
  getLocationsInBoundingBox,
  lookupHimalayanLocation,
} from "../services/himalayan.service.js";

export const getStates = async (_req, res) => {
  try {
    const states = await getHimalayanStates();
    res.json({
      success: true,
      total: states.length,
      states,
    });
  } catch (error) {
    console.error("Himalayan States Controller Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Himalayan states" });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const { stateId, state, stateCode } = req.query;
    const filter = stateId || state || stateCode || null;
    const districts = await getHimalayanDistricts(filter);

    res.json({
      success: true,
      total: districts.length,
      filter: filter || "ALL",
      districts,
    });
  } catch (error) {
    console.error("Himalayan Districts Controller Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Himalayan districts" });
  }
};

export const getLocations = async (req, res) => {
  try {
    const {
      stateId,
      stateCode,
      districtId,
      riskTier,
      minElevation,
      maxElevation,
      basin,
      limit,
      offset,
    } = req.query;

    const filters = {
      stateId: typeof stateId === "string" ? stateId.trim() : undefined,
      stateCode: typeof stateCode === "string" ? stateCode.trim() : undefined,
      districtId: typeof districtId === "string" ? districtId.trim() : undefined,
      riskTier: typeof riskTier === "string" ? riskTier.trim() : undefined,
      minElevation: minElevation !== undefined ? Number(minElevation) : undefined,
      maxElevation: maxElevation !== undefined ? Number(maxElevation) : undefined,
      basin: typeof basin === "string" ? basin.trim() : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    };

    const locations = await getHimalayanLocations(filters);

    res.json({
      success: true,
      count: locations.length,
      filters,
      locations,
    });
  } catch (error) {
    console.error("Himalayan Locations Controller Error:", error);
    res.status(500).json({ success: false, message: "Failed to query Himalayan locations" });
  }
};

/**
 * Bounding-Box Query: /api/locations/himalayan/bbox?minLat=30.0&maxLat=31.5&minLon=78.0&maxLon=80.0
 */
export const queryBoundingBox = async (req, res) => {
  try {
    const { minLat, maxLat, minLon, maxLon, minElevation, maxElevation, limit } = req.query;

    if (minLat === undefined || maxLat === undefined || minLon === undefined || maxLon === undefined) {
      return res.status(400).json({
        success: false,
        message: "minLat, maxLat, minLon, and maxLon parameters are required for bounding-box query",
        example: "/api/locations/himalayan/bbox?minLat=29.5&maxLat=31.5&minLon=78.0&maxLon=80.5",
      });
    }

    const nMinLat = Number(minLat);
    const nMaxLat = Number(maxLat);
    const nMinLon = Number(minLon);
    const nMaxLon = Number(maxLon);

    if (
      !Number.isFinite(nMinLat) ||
      !Number.isFinite(nMaxLat) ||
      !Number.isFinite(nMinLon) ||
      !Number.isFinite(nMaxLon) ||
      nMinLat < -90 ||
      nMaxLat > 90 ||
      nMinLon < -180 ||
      nMaxLon > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bounding box coordinates",
      });
    }

    if (nMinLat > nMaxLat || nMinLon > nMaxLon) {
      return res.status(400).json({
        success: false,
        message: "minLat must be <= maxLat and minLon must be <= maxLon",
      });
    }

    const options = {
      minElevation: minElevation !== undefined ? Number(minElevation) : undefined,
      maxElevation: maxElevation !== undefined ? Number(maxElevation) : undefined,
      limit: limit ? Number(limit) : 100,
    };

    const locations = await getLocationsInBoundingBox(nMinLat, nMaxLat, nMinLon, nMaxLon, options);

    res.json({
      success: true,
      boundingBox: {
        south: nMinLat,
        north: nMaxLat,
        west: nMinLon,
        east: nMaxLon,
      },
      count: locations.length,
      locations,
    });
  } catch (error) {
    console.error("Bounding Box Controller Error:", error);
    res.status(500).json({ success: false, message: "Bounding box query failed" });
  }
};

/**
 * Text search / lookup by name, district, or basin
 */
export const lookupLocation = async (req, res) => {
  try {
    const { q, query, limit } = req.query;
    const searchTerm = q || query || "";

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' must be at least 2 characters",
      });
    }

    const results = await lookupHimalayanLocation(searchTerm.trim(), {
      limit: limit ? Number(limit) : 20,
    });

    res.json({
      success: true,
      query: searchTerm.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Location Lookup Controller Error:", error);
    res.status(500).json({ success: false, message: "Location lookup failed" });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await getHimalayanLocationById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Himalayan location '${id}' not found`,
      });
    }

    res.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error("Location By ID Controller Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch location by ID" });
  }
};

export const getDbStatus = async (_req, res) => {
  try {
    const status = await getDatabaseStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to retrieve database status" });
  }
};

