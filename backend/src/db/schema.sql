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

-- Early-Warning and Alert Engine Table
-- Tracks threshold-triggered alerts, affected locations, severity, duplicate suppression, and acknowledgements.
CREATE TABLE IF NOT EXISTS early_warning_alerts (
    id VARCHAR(64) PRIMARY KEY,
    location_id VARCHAR(64),
    location_name VARCHAR(150) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    elevation_m INTEGER,
    basin VARCHAR(150),
    power_asset VARCHAR(255),
    severity VARCHAR(30) NOT NULL DEFAULT 'WATCH', -- 'CRITICAL', 'WARNING', 'WATCH', 'ADVISORY'
    alert_code VARCHAR(50) NOT NULL DEFAULT 'ORANGE_ALERT',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    triggers JSONB NOT NULL DEFAULT '[]',
    metrics_snapshot JSONB NOT NULL DEFAULT '{}',
    recommended_actions JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED', 'SUPERSEDED'
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    cooldown_until TIMESTAMPTZ,
    suppression_count INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(150),
    acknowledgment_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(150),
    resolution_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON early_warning_alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON early_warning_alerts (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON early_warning_alerts (location_id);
CREATE INDEX IF NOT EXISTS idx_alerts_state_basin ON early_warning_alerts (state, basin);


