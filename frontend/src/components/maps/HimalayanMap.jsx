import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, Minimize2, Mountain, ArrowRight } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation.js';
import { MAP_CONFIG } from '../../data/constants.js';

// Component to dynamically pan the map when location state updates
function RecenterMap({ latitude, longitude }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], 8, { animate: true });
    }
  }, [latitude, longitude, map]);
  return null;
}

// Factory for custom SVG DivIcon markers
function createCustomMarker(isActive) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="marker-pin ${isActive ? 'active' : ''}">
        <div class="marker-icon-inner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });
}

export default function HimalayanMap({ height = '600px' }) {
  const { location, setLocation, locationsList } = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div className={`map-wrapper ${isFullscreen ? 'fullscreen' : ''}`} style={{ height: isFullscreen ? '100vh' : height }}>
      {/* Map Control Buttons Overlay */}
      <div className="map-controls-panel">
        <button
          className="map-control-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="map-legend">
        <div className="map-legend-title">Himalayan Spatial Network</div>
        <div className="map-legend-item">
          <span className="map-legend-color" style={{ background: '#ef4444' }} />
          <span>Active Selection ({location.name})</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-color" style={{ background: '#2563eb' }} />
          <span>Verified Himalayan Settlement</span>
        </div>
        <div style={{ marginTop: 'var(--space-2)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
          Spatial boundary: Indian Himalayan Region (IHR)
        </div>
      </div>

      <MapContainer
        center={[location.latitude || 30.5, location.longitude || 79.5]}
        zoom={7}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={MAP_CONFIG.tileUrl}
          attribution={MAP_CONFIG.tileAttribution}
        />

        <RecenterMap latitude={location.latitude} longitude={location.longitude} />

        {locationsList.map((loc) => {
          const isActive = loc.name === location.name;
          return (
            <Marker
              key={loc.name}
              position={[loc.latitude, loc.longitude]}
              icon={createCustomMarker(isActive)}
              eventHandlers={{
                click: () => setLocation(loc),
              }}
            >
              <Popup>
                <div style={{ padding: 'var(--space-1)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    {loc.name}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>
                    {loc.state}
                  </p>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <div>Coordinates: {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E</div>
                    {loc.elevation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Mountain size={12} /> {loc.elevation} m altitude
                      </div>
                    )}
                  </div>

                  {!isActive && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => setLocation(loc)}
                    >
                      <span>Select Location</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
