import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import StreetViewModal from './StreetViewModal'
import MapboxBirdEyeOverlay, { MAPBOX_TOKEN } from './MapboxBirdEyeOverlay'

// Zoom level below which we switch back to the 3D globe
const BACK_TO_GLOBE_ZOOM = 9

// Globe altitude → Leaflet tile zoom (linear, alt 0.15→z10, alt 0.05→z15)
function altToLeafletZoom(alt) {
  const clamped = Math.max(0.005, Math.min(0.15, alt))
  return Math.round(10 + (0.15 - clamped) * 50)
}

// ── Tile sources ────────────────────────────────────────────────────────────
const SAT_URL    = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const STREET_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function getTileLayer(style) {
  if (style === 'street') {
    return L.tileLayer(STREET_URL, { subdomains: 'abcd', maxZoom: 20, maxNativeZoom: 19, attribution: '' })
  }
  return L.tileLayer(SAT_URL, { maxZoom: 20, maxNativeZoom: 19, attribution: '' })
}

// ── Button component ─────────────────────────────────────────────────────────
function Btn({ onClick, disabled, children, sx }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'rgba(0,8,0,0.92)',
        border: '1px solid rgba(0,255,65,0.45)',
        color: disabled ? 'rgba(0,255,65,0.25)' : '#00ff41',
        fontFamily: "'JetBrains Mono','Courier New',monospace",
        fontSize: 10, letterSpacing: '0.1em',
        padding: '5px 10px', cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap', display: 'block', width: '100%',
        textAlign: 'center', lineHeight: 1.6,
        ...sx,
      }}
    >{children}</button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SatelliteMapOverlay({ globeRef, altitude, imageryStyle = 'satellite', trafficLayer = false, onZoomOut, filterStyle }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const tileRef      = useRef(null)
  const styleRef     = useRef(imageryStyle)
  const onZoomOutRef = useRef(onZoomOut)
  const controlsRef  = useRef(null)

  const [currentZoom, setCurrentZoom] = useState(null)
  const [svLocation,  setSvLocation]  = useState(null)

  useEffect(() => { onZoomOutRef.current = onZoomOut }, [onZoomOut])

  // ── Swap tile layer when style changes
  useEffect(() => {
    styleRef.current = imageryStyle
    const map = mapRef.current
    if (!map || !tileRef.current) return
    map.removeLayer(tileRef.current)
    tileRef.current = getTileLayer(imageryStyle).addTo(map)
  }, [imageryStyle])

  // ── Initialize Leaflet map (once on mount)
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const globe = globeRef.current
    const pov   = globe?.pointOfView?.()
    const lat   = typeof pov?.lat      === 'number' ? pov.lat      : 0
    const lng   = typeof pov?.lng      === 'number' ? pov.lng      : 0
    const alt   = typeof pov?.altitude === 'number' ? pov.altitude : altitude
    const zoom  = Math.max(altToLeafletZoom(alt), 10)

    const controls = globe?.controls?.()
    if (controls) { controls.enabled = false; controlsRef.current = controls }

    const map = L.map(container, {
      center: [Math.max(-85.05, Math.min(85.05, lat)), lng],
      zoom,
      zoomControl: false, attributionControl: false,
      fadeAnimation: true, zoomAnimation: true, preferCanvas: true,
    })

    tileRef.current = getTileLayer(styleRef.current).addTo(map)
    mapRef.current  = map
    setCurrentZoom(zoom)

    map.on('zoomend', () => {
      const z = map.getZoom()
      setCurrentZoom(z)
      if (z < BACK_TO_GLOBE_ZOOM) {
        const c = map.getCenter()
        onZoomOutRef.current?.(c.lat, c.lng)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null; tileRef.current = null
      if (controlsRef.current) { controlsRef.current.enabled = true; controlsRef.current = null }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── "← GLOBE" button
  const handleZoomOut = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const { lat, lng } = map.getCenter()
    onZoomOutRef.current?.(lat, lng)
  }, [])

  // ── Open street view at current map center
  const openStreetView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const { lat, lng } = map.getCenter()
    setSvLocation({ lat, lng })
  }, [])

  const zoomLabel = currentZoom == null ? '' :
    currentZoom >= 17 ? 'STREET' :
    currentZoom >= 14 ? 'DISTRICT' :
    currentZoom >= 11 ? 'CITY' : 'REGIONAL'

  // When Mapbox token is set, use bird's-eye 3D view; otherwise Leaflet (flat)
  if (MAPBOX_TOKEN) {
    return (
      <MapboxBirdEyeOverlay
        globeRef={globeRef}
        altitude={altitude}
        imageryStyle={imageryStyle}
        trafficLayer={trafficLayer}
        onZoomOut={onZoomOut}
        filterStyle={filterStyle}
      />
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {createPortal(
        <>
          {/* ── Control panel */}
          <div style={{
            position: 'fixed',
            left: 228, top: '50%', transform: 'translateY(-50%)',
            zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 5,
            width: 110, pointerEvents: 'all',
            background: 'rgba(0,8,0,0.9)', border: '1px solid rgba(0,255,65,0.22)',
            padding: '10px 6px',
          }}>
            <Btn onClick={handleZoomOut}>← GLOBE</Btn>
            <Btn onClick={openStreetView}>◈ STREET VIEW</Btn>

            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              <Btn onClick={() => mapRef.current?.zoomIn()}  sx={{ flex: 1, padding: '4px 0' }}>+</Btn>
              <Btn onClick={() => mapRef.current?.zoomOut()} sx={{ flex: 1, padding: '4px 0' }}>−</Btn>
            </div>

            {currentZoom != null && (
              <div style={{
                fontSize: 8, color: 'rgba(0,255,65,0.45)', textAlign: 'center',
                letterSpacing: '0.1em', lineHeight: 1.5,
              }}>
                z{currentZoom} · {zoomLabel}
              </div>
            )}
          </div>

          {/* ── Street view modal */}
          {svLocation && (
            <StreetViewModal
              lat={svLocation.lat}
              lng={svLocation.lng}
              onClose={() => setSvLocation(null)}
              filterStyle={filterStyle}
            />
          )}
        </>,
        document.body
      )}

      {/* ── Tactical grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 500,
        backgroundImage:
          'linear-gradient(rgba(0,204,51,0.04) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(0,204,51,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />
    </div>
  )
}
