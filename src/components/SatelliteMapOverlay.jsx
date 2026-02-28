import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import StreetViewModal from './StreetViewModal'
import MalvinaPeoplePopover from './MalvinaPeoplePopover'
import { MALVINA_RESIDENCE } from '../data/malvinaResidence'

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
export default function SatelliteMapOverlay({ globeRef, altitude, imageryStyle = 'satellite', onZoomOut, filterStyle }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const tileRef      = useRef(null)
  const markerRef   = useRef(null)
  const styleRef     = useRef(imageryStyle)
  const onZoomOutRef = useRef(onZoomOut)
  const controlsRef  = useRef(null)

  const [currentZoom, setCurrentZoom] = useState(null)
  const [svLocation,  setSvLocation]  = useState(null)
  const [peoplePopup, setPeoplePopup] = useState(null)   // { x, y } when open, null when closed

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

    // ── Residence marker: 3519 Malvina Ct, Naperville IL — people button
    const { lat: resLat, lng: resLng } = MALVINA_RESIDENCE
    const divIcon = L.divIcon({
      className: 'malvina-people-marker',
      html: '<div style="width:32px;height:32px;background:rgba(0,12,0,0.95);border:2px solid rgba(0,255,65,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 10px rgba(0,255,65,0.3);cursor:pointer;">👥</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
    const marker = L.marker([resLat, resLng], { icon: divIcon }).addTo(map)
    marker.on('click', () => {
      const mapEl = map.getContainer()
      const rect = mapEl.getBoundingClientRect()
      const pt = map.latLngToContainerPoint(marker.getLatLng())
      setPeoplePopup({ x: rect.left + pt.x, y: rect.top + pt.y })
    })
    markerRef.current = marker

    return () => {
      marker.remove()
      markerRef.current = null
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

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      <style>{`
        .malvina-people-marker.leaflet-div-icon { background: none !important; border: none !important; }
      `}</style>
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

          {/* ── People at Malvina Ct — photos with lines to house */}
          {peoplePopup && (
            <MalvinaPeoplePopover
              markerScreenPos={peoplePopup}
              filterStyle={filterStyle}
              onClose={() => setPeoplePopup(null)}
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
