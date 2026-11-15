-- Indian Himalayan Geospatial Location Database Schema (PostgreSQL)
-- Provides multi-level administrative hierarchy: States -> Districts -> Monitoring Locations
-- Stores WGS84 Latitude, Longitude, and Elevation in meters (AMSL)
-- Optimized for geospatial bounding-box queries, elevation slicing, and hydrological basin lookups.

CREATE TABLE IF NOT EXISTS himalayan_states (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL DEFAULT 'State',
    capital VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL DEFAULT 'Indian Himalayan Region',
    min_lat NUMERIC(7, 4) NOT NULL,
    max_lat NUMERIC(7, 4) NOT NULL,
    min_lon NUMERIC(7, 4) NOT NULL,
    max_lon NUMERIC(7, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS himalayan_districts (
    id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(64) NOT NULL REFERENCES himalayan_states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    headquarters VARCHAR(100) NOT NULL,
    elevation_min_m INTEGER NOT NULL DEFAULT 500,
    elevation_max_m INTEGER NOT NULL DEFAULT 3500,
    primary_river_basin VARCHAR(150) NOT NULL,
    vulnerability_score INTEGER NOT NULL CHECK (vulnerability_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS himalayan_monitoring_locations (
    id VARCHAR(64) PRIMARY KEY,
    district_id VARCHAR(64) REFERENCES himalayan_districts(id) ON DELETE SET NULL,
    state_id VARCHAR(64) NOT NULL REFERENCES himalayan_states(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    elevation_m INTEGER NOT NULL,
    basin VARCHAR(150) NOT NULL,
    sub_basin VARCHAR(150),
    hazard_profile VARCHAR(255) NOT NULL,
    cloudburst_risk_tier VARCHAR(30) NOT NULL DEFAULT 'Moderate',
    critical_power_asset VARCHAR(255),
    monitoring_agency VARCHAR(150) NOT NULL,
    station_type VARCHAR(50) DEFAULT 'Automatic Weather Station',
    is_telemetry_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial Bounding-Box Index for fast coordinate range scans
CREATE INDEX IF NOT EXISTS idx_himalayan_locations_coords ON himalayan_monitoring_locations (latitude, longitude);

-- Altitude and elevation filtering index
CREATE INDEX IF NOT EXISTS idx_himalayan_locations_elevation ON himalayan_monitoring_locations (elevation_m);

-- Foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_himalayan_locations_state ON himalayan_monitoring_locations (state_id);
CREATE INDEX IF NOT EXISTS idx_himalayan_locations_district ON himalayan_monitoring_locations (district_id);
CREATE INDEX IF NOT EXISTS idx_himalayan_districts_state ON himalayan_districts (state_id);

