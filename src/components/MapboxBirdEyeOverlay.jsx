/**
 * MapboxBirdEyeOverlay — bird's-eye view with 3D buildings when zoomed in.
 * Uses Mapbox GL JS; requires VITE_MAPBOX_ACCESS_TOKEN.
 * Traffic layer: real road routes + animated cars (Mapbox Directions API).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import StreetViewModal from './StreetViewModal'

const MAPBOX_TOKEN = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN

// ── Helpers: interpolate position along a polyline (t in [0,1])
function pathLength(coords) {
  let len = 0
  for (let i = 1; i < coords.length; i++) {
    const [a, b] = coords[i - 1]
    const [c, d] = coords[i]
    len += Math.hypot(c - a, d - b)
  }
  return len
}
function interpolateAlongPath(coords, t) {
  if (!coords?.length) return coords[0] || [0, 0]
  if (t <= 0) return coords[0]
  if (t >= 1) return coords[coords.length - 1]
  const total = pathLength(coords)
  let acc = 0
  for (let i = 1; i < coords.length; i++) {
    const [a, b] = coords[i - 1]
    const [c, d] = coords[i]
    const seg = Math.hypot(c - a, d - b)
    if (acc + seg >= t * total) {
      const u = (t * total - acc) / seg
      return [a + u * (c - a), b + u * (d - b)]
    }
    acc += seg
  }
  return coords[coords.length - 1]
}

// Globe altitude (0.05–0.15) → Mapbox zoom (roughly 15–19 for city)
function altToMapboxZoom(alt) {
  const clamped = Math.max(0.005, Math.min(0.15, alt))
  return 19 - (clamped - 0.005) / (0.15 - 0.005) * 4
}

const BACK_TO_GLOBE_ZOOM = 14
const BIRD_EYE_PITCH = 55
const BIRD_EYE_BEARING = 0

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

export default function MapboxBirdEyeOverlay({
  globeRef,
  altitude,
  imageryStyle = 'satellite',
  trafficLayer = false,
  onZoomOut,
  filterStyle,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const onZoomOutRef = useRef(onZoomOut)
  const trafficLayerIdRef = useRef(null)
  const trafficLayerRef = useRef(trafficLayer)
  const showLabelsRef = useRef(true)
  const [currentZoom, setCurrentZoom] = useState(null)
  const [svLocation, setSvLocation] = useState(null)
  const [showLabels, setShowLabels] = useState(true)
  useEffect(() => { showLabelsRef.current = showLabels }, [showLabels])

  useEffect(() => { onZoomOutRef.current = onZoomOut }, [onZoomOut])
  useEffect(() => { trafficLayerRef.current = trafficLayer }, [trafficLayer])

  const trafficRoutesRef = useRef([])
  const trafficCarsRef = useRef([])
  const trafficRafRef = useRef(null)

  // Fetch real road routes through the viewport (Mapbox Directions API, driving-traffic)
  const fetchRoutesForBounds = useCallback(async (map) => {
    if (!MAPBOX_TOKEN || !map) return []
    const b = map.getBounds()
    const ne = b.getNorthEast()
    const sw = b.getSouthWest()
    const center = map.getCenter()
    const pad = 0.008
    const waypoints = [
      [[sw.lng, center.lat], [ne.lng, center.lat]],
      [[center.lng, sw.lat], [center.lng, ne.lat]],
      [[sw.lng, sw.lat + pad], [ne.lng, ne.lat - pad]],
      [[sw.lng + pad, ne.lat], [ne.lng - pad, sw.lat]],
      [[sw.lng, ne.lat - pad], [ne.lng, sw.lat + pad]],
      [[ne.lng - pad, ne.lat], [sw.lng + pad, sw.lat]],
    ]
    const routes = []
    for (const [start, end] of waypoints) {
      try {
        const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
        const res = await fetch(url)
        if (!res.ok) continue
        const data = await res.json()
        const coordsList = data.routes?.[0]?.geometry?.coordinates
        if (coordsList?.length) routes.push(coordsList)
      } catch (_) {}
    }
    return routes
  }, [])

  // Start animated cars on routes; stop when traffic is toggled off
  const startTrafficCars = useCallback((map, routes) => {
    if (!map?.isStyleLoaded() || !routes?.length) return
    try {
      const carsPerRoute = Math.max(12, Math.min(28, Math.floor(180 / routes.length)))
      const cars = []
      routes.forEach((coords, ri) => {
        for (let i = 0; i < carsPerRoute; i++) {
          cars.push({
            routeIndex: ri,
            t: Math.random(),
            speed: 0.0008 + Math.random() * 0.0006,
          })
        }
      })
      trafficRoutesRef.current = routes
      trafficCarsRef.current = cars

      if (map.getSource('traffic-cars')) {
        trafficRoutesRef.current = routes
        trafficCarsRef.current = cars
        return
      }
      map.addSource('traffic-cars', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'traffic-cars-layer',
        type: 'circle',
        source: 'traffic-cars',
        paint: {
          'circle-radius': 3,
          'circle-color': '#00ff41',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,255,65,0.6)',
        },
      }, map.getLayer('3d-buildings') ? '3d-buildings' : undefined)
      trafficLayerIdRef.current = 'traffic-cars-layer'

      const tick = () => {
        const mapInst = mapRef.current
        const src = mapInst?.getSource('traffic-cars')
        if (!src || !trafficRoutesRef.current.length) {
          trafficRafRef.current = null
          return
        }
        const routeList = trafficRoutesRef.current
        const carList = trafficCarsRef.current
        for (let i = 0; i < carList.length; i++) {
          const c = carList[i]
          c.t += c.speed
          if (c.t > 1) c.t = 0
        }
        const features = carList.map(c => {
          const [lng, lat] = interpolateAlongPath(routeList[c.routeIndex], c.t)
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }
        })
        src.setData({ type: 'FeatureCollection', features })
        trafficRafRef.current = requestAnimationFrame(tick)
      }
      trafficRafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      console.warn('[MapboxBirdEyeOverlay] startTrafficCars:', err?.message || err)
    }
  }, [])

  const stopTrafficCars = useCallback((map) => {
    if (trafficRafRef.current) {
      cancelAnimationFrame(trafficRafRef.current)
      trafficRafRef.current = null
    }
    trafficRoutesRef.current = []
    trafficCarsRef.current = []
    if (!map) return
    try {
      if (map.getLayer('traffic-cars-layer')) map.removeLayer('traffic-cars-layer')
      if (map.getSource('traffic-cars')) map.removeSource('traffic-cars')
      trafficLayerIdRef.current = null
    } catch (_) {}
  }, [])

  // Apply or remove traffic (animated cars on real routes)
  const applyTrafficLayer = useCallback((map, trafficOn) => {
    if (!map || !map.isStyleLoaded()) return
    if (!trafficOn) {
      stopTrafficCars(map)
      return
    }
    stopTrafficCars(map)
    fetchRoutesForBounds(map).then((routes) => {
      if (routes.length && trafficLayerRef.current) startTrafficCars(mapRef.current, routes)
    }).catch((err) => console.warn('[MapboxBirdEyeOverlay] fetchRoutes:', err?.message || err))
  }, [fetchRoutesForBounds, startTrafficCars, stopTrafficCars])

  // Toggle labels/places visibility (symbol + circle layers)
  const applyLabelsVisibility = useCallback((map, visible) => {
    if (!map || !map.isStyleLoaded()) return
    try {
      const style = map.getStyle()
      const visibility = visible ? 'visible' : 'none'
      for (const layer of style.layers || []) {
        if (layer.type === 'symbol' || layer.type === 'circle') {
          if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', visibility)
        }
      }
    } catch (err) {
      console.warn('[MapboxBirdEyeOverlay] applyLabelsVisibility:', err?.message || err)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      map.once('load', () => applyLabelsVisibility(map, showLabels))
      return
    }
    applyLabelsVisibility(map, showLabels)
  }, [showLabels, applyLabelsVisibility])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) {
      if (!MAPBOX_TOKEN) console.warn('[MapboxBirdEyeOverlay] No VITE_MAPBOX_ACCESS_TOKEN')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN
    const globe = globeRef.current
    const pov = globe?.pointOfView?.()
    const lat = typeof pov?.lat === 'number' ? pov.lat : 0
    const lng = typeof pov?.lng === 'number' ? pov.lng : 0
    const zoom = altToMapboxZoom(typeof pov?.altitude === 'number' ? pov.altitude : altitude)

    let map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: imageryStyle === 'street'
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [lng, Math.max(-85.05, Math.min(85.05, lat))],
        zoom,
        pitch: BIRD_EYE_PITCH,
        bearing: BIRD_EYE_BEARING,
        antialias: true,
      })
    } catch (err) {
      console.error('[MapboxBirdEyeOverlay] Map init failed:', err?.message || err)
      return
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      try {
        map.resize()
        const layers = map.getStyle().layers
        const labelLayerId = layers?.find(l => l.type === 'symbol' && l.layout?.['text-field'])?.id
        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': imageryStyle === 'street' ? '#2a2a2a' : '#8a8a8a',
              'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['get', 'height']],
              'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['get', 'min_height']],
              'fill-extrusion-opacity': 0.92,
            },
          }, labelLayerId)
        }
        setCurrentZoom(map.getZoom())
        applyTrafficLayer(map, trafficLayerRef.current)
        applyLabelsVisibility(map, showLabelsRef.current)
      } catch (err) {
        console.warn('[MapboxBirdEyeOverlay] onLoad:', err?.message || err)
      }
    })

    map.on('error', (e) => {
      console.warn('[MapboxBirdEyeOverlay] map error:', e?.error?.message || e)
    })

    map.on('zoomend', () => {
      const z = map.getZoom()
      setCurrentZoom(z)
      if (z < BACK_TO_GLOBE_ZOOM) {
        const c = map.getCenter()
        onZoomOutRef.current?.(c.lat, c.lng)
      }
    })

    mapRef.current = map
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle traffic layer when prop changes — only run when style is loaded
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      map.once('load', () => applyTrafficLayer(map, trafficLayer))
      return
    }
    applyTrafficLayer(map, trafficLayer)
  }, [trafficLayer, applyTrafficLayer])

  // When traffic is on, refetch routes on pan/zoom so cars follow visible roads
  const trafficMoveEndRef = useRef(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !trafficLayer) return
    if (!map.isStyleLoaded()) return
    const onMoveEnd = () => {
      if (!trafficLayerRef.current) return
      clearTimeout(trafficMoveEndRef.current)
      trafficMoveEndRef.current = setTimeout(() => {
        fetchRoutesForBounds(map).then((routes) => {
          if (routes.length && trafficLayerRef.current) startTrafficCars(map, routes)
        })
      }, 400)
    }
    map.on('moveend', onMoveEnd)
    return () => {
      map.off('moveend', onMoveEnd)
      clearTimeout(trafficMoveEndRef.current)
    }
  }, [trafficLayer, fetchRoutesForBounds, startTrafficCars])

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    onZoomOutRef.current?.(c.lat, c.lng)
  }, [])

  const openStreetView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    setSvLocation({ lat: c.lat, lng: c.lng })
  }, [])

  const zoomLabel = currentZoom == null ? '' :
    currentZoom >= 17 ? 'STREET' :
    currentZoom >= 14 ? 'DISTRICT' :
    currentZoom >= 11 ? 'CITY' : 'REGIONAL'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {createPortal(
        <>
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
            <Btn onClick={() => setShowLabels(s => !s)}>
              {showLabels ? '◉ LABELS ON' : '○ LABELS OFF'}
            </Btn>
            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              <Btn onClick={() => mapRef.current?.zoomIn()}  sx={{ flex: 1, padding: '4px 0' }}>+</Btn>
              <Btn onClick={() => mapRef.current?.zoomOut()} sx={{ flex: 1, padding: '4px 0' }}>−</Btn>
            </div>
            {currentZoom != null && (
              <div style={{ fontSize: 8, color: 'rgba(0,255,65,0.45)', textAlign: 'center', letterSpacing: '0.1em', lineHeight: 1.5 }}>
                z{Math.round(currentZoom)} · {zoomLabel} · 3D
              </div>
            )}
          </div>

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

export { MAPBOX_TOKEN }
