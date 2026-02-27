import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Transparent so the globe shows through where tiles aren't loaded — no black, smooth pan.
// Unloaded tile cells stay transparent; only loaded tile images are visible.

// Free tile layers (no API key). ESRI uses {z}/{y}/{x}.
const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
}

// Sync Leaflet view to globe POV (center + zoom derived from altitude)
function MapViewSync({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center && typeof zoom === 'number') map.setView([center.lat, center.lng], zoom)
  }, [map, center?.lat, center?.lng, zoom])
  return null
}

export default function SatelliteMapOverlay({ center, altitude, filterStyle, imageryStyle = 'satellite' }) {
  // Leaflet zoom: higher = more zoomed in. altitude lower = closer to ground = higher zoom.
  // altitude 0.05 -> ~18, 0.1 -> ~14, 0.15 -> ~10
  const zoom = Math.round(10 + (0.15 - Math.max(0.05, altitude)) * 80)
  const clampedZoom = Math.min(20, Math.max(10, zoom))
  const layer = TILE_LAYERS[imageryStyle] || TILE_LAYERS.satellite

  if (!center || center.lat == null || center.lng == null) return null

  return (
    <div
      className="satellite-map-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        filter: filterStyle || 'none',
        transition: 'filter .6s ease',
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      {/* Transparent everywhere: unloaded cells show the globe; no black, no green grid */}
      <style>{`
        .satellite-map-overlay .leaflet-container { background: transparent !important; }
        .satellite-map-overlay .leaflet-tile-pane { background: transparent !important; }
        .satellite-map-overlay .leaflet-tile { background: transparent !important; }
      `}</style>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={clampedZoom}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        preferCanvas
      >
        <TileLayer
          url={layer.url}
          attribution={layer.attribution}
          updateWhenIdle={false}
          keepBuffer={8}
        />
        <MapViewSync center={center} zoom={clampedZoom} />
      </MapContainer>
    </div>
  )
}
