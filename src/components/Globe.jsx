import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import ReactGlobe from 'react-globe.gl'
import * as THREE from 'three'
import SatelliteMapOverlay from './SatelliteMapOverlay'
import SearchBar from './SearchBar'

const GLOBE_IMG  = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg'
const BUMP_IMG   = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png'
const STARS_IMG  = 'https://unpkg.com/three-globe@2.31.1/example/img/night-sky.png'
const FOLLOW_ALT = 0.4   // altitude when tracking a flight (~2500 km above)
const ZOOM_MIN   = 0.05
const ZOOM_MAX   = 5.0

// ── Logarithmic zoom mapping  (inverted: slider UP = zoom IN = lower altitude)
// With writingMode:vertical-lr + direction:rtl the slider thumb sits at the TOP when value=100.
// So value=100 → altitude=ZOOM_MIN (closest), value=0 → altitude=ZOOM_MAX (farthest globe view).
const altToSlider = a => 100 - Math.log(a / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN) * 100
const sliderToAlt = v => ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, (100 - v) / 100)

// ── Draw top-down airplane silhouette (nose = up = north)
function makePlaneCanvas(color, S = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const h = S / 2
  ctx.clearRect(0, 0, S, S)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = S * 0.10
  ctx.save()
  ctx.translate(h, h)
  // Fuselage
  ctx.beginPath()
  ctx.ellipse(0, 0, h * 0.13, h * 0.64, 0, 0, Math.PI * 2)
  ctx.fill()
  // Right wing
  ctx.beginPath()
  ctx.moveTo( h*.10, -h*.06); ctx.lineTo( h*.88, h*.20)
  ctx.lineTo( h*.78,  h*.38); ctx.lineTo( h*.10, h*.26)
  ctx.closePath(); ctx.fill()
  // Left wing
  ctx.beginPath()
  ctx.moveTo(-h*.10, -h*.06); ctx.lineTo(-h*.88, h*.20)
  ctx.lineTo(-h*.78,  h*.38); ctx.lineTo(-h*.10, h*.26)
  ctx.closePath(); ctx.fill()
  // Right stabilizer
  ctx.beginPath()
  ctx.moveTo( h*.08, h*.50); ctx.lineTo( h*.40, h*.67)
  ctx.lineTo( h*.34, h*.77); ctx.lineTo( h*.08, h*.61)
  ctx.closePath(); ctx.fill()
  // Left stabilizer
  ctx.beginPath()
  ctx.moveTo(-h*.08, h*.50); ctx.lineTo(-h*.40, h*.67)
  ctx.lineTo(-h*.34, h*.77); ctx.lineTo(-h*.08, h*.61)
  ctx.closePath(); ctx.fill()
  ctx.restore()
  return c
}

// ── Correct screen-space heading for any globe orientation
// Uses the camera matrixWorld to project world-north onto the camera plane.
// All plain math — zero allocations, safe to call at 60 fps.
function screenRotation(x, y, z, camMatrix, heading) {
  const len = Math.sqrt(x*x + y*y + z*z) || 1
  const rx = x/len, ry = y/len, rz = z/len          // radial (outward normal)
  // Tangent-north: project world-up (0,1,0) onto globe surface tangent plane
  const dot = ry                                      // (0,1,0)·radial = ry
  const tnx = -dot*rx, tny = 1-dot*ry, tnz = -dot*rz
  const tnl = Math.sqrt(tnx*tnx + tny*tny + tnz*tnz) || 1
  const nx = tnx/tnl, ny = tny/tnl, nz = tnz/tnl   // world-space north tangent
  // Camera right (col 0) and up (col 1) from column-major matrixWorld
  const m = camMatrix
  const crx=m[0],cry=m[1],crz=m[2]
  const cux=m[4],cuy=m[5],cuz=m[6]
  // Screen-space angle of north (counterclockwise from screen-up)
  const projR = nx*crx + ny*cry + nz*crz
  const projU = nx*cux + ny*cuy + nz*cuz
  return Math.atan2(projR, projU) - (heading||0) * Math.PI / 180
}

function deadReckon(lat, lon, spd, hdg, dt) {
  if (!spd || dt <= 0) return { lat, lon }
  const R = 6371000, r = (hdg||0)*Math.PI/180
  const cl = Math.cos(lat*Math.PI/180) || 1e-9
  return { lat: lat + spd*Math.cos(r)*dt/R*(180/Math.PI),
           lon: lon + spd*Math.sin(r)*dt/(R*cl)*(180/Math.PI) }
}

// ── Zoom bar button style
const ZBT = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--c-green)', fontSize: 18, fontFamily: 'var(--font-mono)',
  lineHeight: 1, padding: '2px 6px', userSelect: 'none',
}

const SATELLITE_ALT_THRESHOLD = 0.15  // below this altitude show Leaflet map overlay
const GLOBE_RETURN_ALT        = 0.20  // altitude used when returning to globe from Leaflet

const EARTH_RADIUS_KM = 6371

const Globe = forwardRef(function Globe({
  layers, flights, satellites = [], cameras = [], news = [],
  viewMode, bloom, sharpen,
  onFlightClick, onSatelliteClick, onCameraClick, onNewsClick,
  followFlightId, followSatelliteId, satelliteOrbitPath = [],
  selectedNews,
  onNewsPinScreenPosition,
  imageryStyle = 'satellite',
}, ref) {
  const globeRef = useRef()
  const [dims, setDims]       = useState({ w: window.innerWidth, h: window.innerHeight })
  const [zoomAlt, setZoomAlt] = useState(2.5)

  // Stable flight objects: ThreeDigest stores __threeObjCustom on the data item itself.
  // Reusing the same object reference means the sprite is reused (updateSprite, not makeSprite).
  const stableRef     = useRef(new Map())   // id → stable flight object
  const [stableFlights, setStableFlights] = useState([])

  // Refs so rAF / interval closures always see latest values
  const onClickRef       = useRef(onFlightClick)
  const onCameraClickRef = useRef(onCameraClick)
  const onNewsPinRef     = useRef(onNewsPinScreenPosition)
  const followIdRef      = useRef(followFlightId)
  useEffect(() => { onClickRef.current       = onFlightClick  }, [onFlightClick])
  useEffect(() => { onCameraClickRef.current = onCameraClick  }, [onCameraClick])
  useEffect(() => { onNewsPinRef.current     = onNewsPinScreenPosition }, [onNewsPinScreenPosition])
  useEffect(() => { followIdRef.current      = followFlightId }, [followFlightId])

  // Texture cache — only 3-4 colours ever used
  const texCache = useRef(new Map())
  const getTex = useCallback(color => {
    if (!texCache.current.has(color))
      texCache.current.set(color, new THREE.CanvasTexture(makePlaneCanvas(color)))
    return texCache.current.get(color)
  }, [])

  const flightColor = f =>
    f.id === followIdRef.current ? '#ffb000'
    : f.vertRate > 1 ? '#00ffe5' : f.vertRate < -1 ? '#ff8c00' : '#00ff41'

  useImperativeHandle(ref, () => ({
    flyTo(lat, lon, alt = 2.5) {
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: alt }, 1800)
    }
  }))

  useEffect(() => {
    const fn = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 0)
  }, [])

  // ── Sync zoomAlt from the globe's actual OrbitControls (scroll wheel / pinch / animation)
  // This is critical: without it, zoomAlt is only updated by the zoom bar buttons,
  // so scrolling to zoom leaves the zoom bar frozen and the overlay showing at wrong times.
  useEffect(() => {
    let controls = null
    let cleanupFn = null

    const handler = () => {
      const pov = globeRef.current?.pointOfView?.()
      if (pov?.altitude == null) return
      setZoomAlt(prev => {
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pov.altitude))
        // Only trigger re-render if altitude changed meaningfully (avoids 60fps setState spam)
        return Math.abs(next - prev) > 0.003 ? next : prev
      })
    }

    const tryAttach = () => {
      controls = globeRef.current?.controls?.()
      if (!controls) return false
      controls.addEventListener('change', handler)
      cleanupFn = () => controls.removeEventListener('change', handler)
      return true
    }

    // Globe controls aren't ready until Three.js initialises — poll briefly
    if (tryAttach()) return () => cleanupFn?.()
    const id = setInterval(() => { if (tryAttach()) clearInterval(id) }, 100)
    return () => { clearInterval(id); cleanupFn?.() }
  }, [])

  // ── Sync stable map when API data changes (every ~30 s)
  useEffect(() => {
    const now = Date.now()
    const ids = new Set(flights.map(f => f.id))
    for (const id of stableRef.current.keys())
      if (!ids.has(id)) stableRef.current.delete(id)
    for (const f of flights) {
      if (!stableRef.current.has(f.id)) {
        stableRef.current.set(f.id, { ...f, _baseLat: f.lat, _baseLon: f.lon, _t: now })
      } else {
        Object.assign(stableRef.current.get(f.id), f,
          { _baseLat: f.lat, _baseLon: f.lon, _t: now })
      }
    }
    setStableFlights([...stableRef.current.values()])
  }, [flights])

  // ── rAF loop: dead-reckon sprite positions + correct heading rotation
  //    Runs at 60 fps, zero React re-renders, zero object allocations in hot path.
  useEffect(() => {
    if (!layers.flights) return
    let rafId
    const tick = () => {
      const globe = globeRef.current
      if (!globe) { rafId = requestAnimationFrame(tick); return }
      const gc     = globe.getCoords
      const cam    = globe.camera?.()
      const camMat = cam?.matrixWorld?.elements
      const now    = Date.now()

      for (const f of stableRef.current.values()) {
        const sprite = f.__threeObjCustom
        if (!sprite || !gc) continue

        const { lat, lon } = deadReckon(f._baseLat, f._baseLon, f.speedMs, f.heading, (now-f._t)/1000)
        f.lat = lat; f.lon = lon

        const p = gc.call(globe, lat, lon, 0.005)
        if (p) {
          sprite.position.set(p.x, p.y, p.z)
          if (camMat) sprite.material.rotation = screenRotation(p.x, p.y, p.z, camMat, f.heading)
        }
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [layers.flights])   // restarts only on layer toggle — stableRef always current

  // ── Follow camera — setInterval keeps it smooth without fighting 60fps rAF
  useEffect(() => {
    if (!followFlightId || !globeRef.current) return
    const f0 = stableRef.current.get(followFlightId)
    if (f0) globeRef.current.pointOfView({ lat: f0.lat, lng: f0.lon, altitude: FOLLOW_ALT }, 2000)
    const id = setInterval(() => {
      const f = stableRef.current.get(followFlightId)
      if (f) globeRef.current?.pointOfView({ lat: f.lat, lng: f.lon, altitude: FOLLOW_ALT }, 500)
    }, 600)
    return () => clearInterval(id)
  }, [followFlightId])

  // ── Follow satellite camera (same pattern; satellites update from hook every 30s)
  const followSatRef = useRef(followSatelliteId)
  useEffect(() => { followSatRef.current = followSatelliteId }, [followSatelliteId])
  useEffect(() => {
    if (!followSatelliteId || !globeRef.current || !layers.satellites) return
    const sat = satellites.find(s => s.id === followSatelliteId)
    if (sat) globeRef.current.pointOfView({ lat: sat.lat, lng: sat.lon, altitude: 0.6 }, 2000)
    const id = setInterval(() => {
      if (followSatRef.current !== followSatelliteId) return
      const s = satellites.find(x => x.id === followSatRef.current)
      if (s) globeRef.current?.pointOfView({ lat: s.lat, lng: s.lon, altitude: 0.6 }, 500)
    }, 2000)
    return () => clearInterval(id)
  }, [followSatelliteId, layers.satellites, satellites])


  // ── Project selected news pin (lat/lng) to screen for connector line
  const vec3 = useRef(new THREE.Vector3())
  useEffect(() => {
    if (!selectedNews) {
      onNewsPinScreenPosition?.(null)
      return
    }
    if (typeof onNewsPinScreenPosition !== 'function') return
    let rafId
    const tick = () => {
      const globe = globeRef.current
      const cb = onNewsPinRef.current
      if (!globe || !cb) { rafId = requestAnimationFrame(tick); return }
      const gc = globe.getCoords
      const cam = globe.camera?.()
      if (!gc || !cam) { rafId = requestAnimationFrame(tick); return }
      const p = gc.call(globe, selectedNews.lat, selectedNews.lng, 0.001)
      if (!p) { rafId = requestAnimationFrame(tick); return }
      vec3.current.set(p.x, p.y, p.z)
      vec3.current.project(cam)
      const w = dims.w, h = dims.h
      const x = (vec3.current.x + 1) * 0.5 * w
      const y = (1 - vec3.current.y) * 0.5 * h
      if (vec3.current.z <= 1) cb({ x, y })
      else cb(null)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [selectedNews, onNewsPinScreenPosition, dims.w, dims.h])

  // ── Globe CSS filter
  const globeFilter = useCallback(() => {
    const b = 0.75 + (bloom/100)*0.85, c = 1.0 + (sharpen/100)*1.2
    let x = ''
    switch (viewMode) {
      case 'crt':   x = 'hue-rotate(90deg) saturate(2)'; break
      case 'nvg':   x = 'hue-rotate(75deg) saturate(3) brightness(1.1)'; break
      case 'flir':  x = 'sepia(1) hue-rotate(-30deg) saturate(8) brightness(1.05)'; break
      case 'noir':  x = 'grayscale(1) contrast(1.3)'; break
      case 'anime': x = 'saturate(2.5) contrast(1.3)'; break
      case 'snow':  x = 'brightness(1.5) grayscale(0.4)'; break
      case 'ai':    x = 'hue-rotate(200deg) saturate(3)'; break
    }
    return `brightness(${b.toFixed(2)}) contrast(${c.toFixed(2)}) ${x}`.trim()
  }, [viewMode, bloom, sharpen])

  // ── Create sprite — called once per new flight by ThreeDigest
  const makeSprite = useCallback(f => {
    const mat = new THREE.SpriteMaterial({ map: getTex(flightColor(f)), transparent: true, depthTest: false })
    const sp = new THREE.Sprite(mat)
    sp.scale.set(5, 5, 1)
    return sp
  }, [getTex])

  // ── Update sprite visuals (colour / scale) on data changes
  //    Position is handled by the rAF loop above.
  const updateSprite = useCallback((obj, f) => {
    const color = flightColor(f)
    const tex   = getTex(color)
    if (obj.material.map !== tex) { obj.material.map = tex; obj.material.needsUpdate = true }
    const s = f.id === followIdRef.current ? 8 : 5
    if (obj.scale.x !== s) obj.scale.set(s, s, 1)
  }, [getTex])

  // ── Zoom bar helpers
  const applyZoom = useCallback(alt => {
    const a = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, alt))
    setZoomAlt(a)
    globeRef.current?.pointOfView({ altitude: a }, 400)
  }, [])

  // ── Called by SatelliteMapOverlay when the user zooms out of the Leaflet map.
  //    We snap zoomAlt above the threshold first (hides overlay, re-enables controls
  //    via overlay cleanup), then position the globe at the Leaflet center instantly
  //    (duration=0) to avoid intermediate altitudes re-triggering the overlay.
  const handleOverlayZoomOut = useCallback((lat, lng) => {
    setZoomAlt(GLOBE_RETURN_ALT)
    requestAnimationFrame(() => {
      globeRef.current?.pointOfView({ lat, lng: lng, altitude: GLOBE_RETURN_ALT }, 0)
    })
  }, [])

  // ── Search animation: zoom out → rotate → zoom in (Google Earth style)
  const [animating,  setAnimating]  = useState(false)
  const animTimers = useRef([])

  // Cancel any in-flight search animation
  const cancelSearchAnim = useCallback(() => {
    animTimers.current.forEach(clearTimeout)
    animTimers.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => cancelSearchAnim, [cancelSearchAnim])

  const handleSearchSelect = useCallback(({ lat, lng }) => {
    cancelSearchAnim()

    // Lock the overlay so it never flickers on/off during the animation.
    // Also snap zoomAlt above threshold so the Leaflet overlay unmounts immediately
    // (which re-enables OrbitControls so pointOfView can drive the camera).
    setAnimating(true)
    setZoomAlt(GLOBE_RETURN_ALT)

    const sched = (fn, delay) => {
      const id = setTimeout(fn, delay)
      animTimers.current.push(id)
    }

    // ─ Step 1 (t ≈ 80 ms): pull back to full globe view
    sched(() => {
      globeRef.current?.pointOfView({ altitude: 2.5 }, 800)
    }, 80)

    // ─ Step 2 (t ≈ 980 ms): rotate globe so the target is centred — altitude stays 2.5
    sched(() => {
      globeRef.current?.pointOfView({ lat, lng, altitude: 2.5 }, 1100)
    }, 980)

    // ─ Step 3 (t ≈ 2 180 ms): plunge all the way in to street level
    sched(() => {
      globeRef.current?.pointOfView({ lat, lng, altitude: ZOOM_MIN }, 1800)
    }, 2180)

    // ─ Release lock (t ≈ 4 280 ms): animation is done, let the overlay appear
    sched(() => {
      setAnimating(false)
      setZoomAlt(ZOOM_MIN)   // ensure state matches camera in case change event was missed
    }, 4280)
  }, [cancelSearchAnim])

  // ── Arc trails: 15-min forward path (computed from raw API data during render)
  const flightArcs = layers.flights ? flights.map(f => {
    const dt   = (Date.now() - (f.lastUpdate||Date.now())) / 1000
    const src  = deadReckon(f.lat, f.lon, f.speedMs, f.heading, dt)
    const end  = deadReckon(f.lat, f.lon, f.speedMs, f.heading, dt+900)
    const isF  = f.id === followFlightId
    return { startLat:src.lat, startLng:src.lon, endLat:end.lat, endLng:end.lon,
             color: isF ? '#ffb000' : 'rgba(0,255,65,0.2)', stroke: isF ? 1.5 : 0.35 }
  }) : []

  // ── Satellite orbit path (only for the one we're tracking — no clutter)
  const satelliteArcs = satelliteOrbitPath.length >= 2
    ? satelliteOrbitPath.slice(0, -1).map((p, i) => {
        const q = satelliteOrbitPath[i + 1]
        return {
          startLat: p.lat, startLng: p.lon,
          endLat: q.lat, endLng: q.lon,
          color: 'rgba(0,229,255,0.35)',
          stroke: 0.5,
        }
      })
    : []
  const allArcs = [...flightArcs, ...satelliteArcs]

  // ── Non-flight points
  const otherPoints = []
  if (layers.cctv) cameras.forEach(c => {
    const col = c.country === 'US' ? '#ff8c00' : c.country === 'Canada' ? '#ffd700' : '#ff2d2d'
    otherPoints.push({
      lat: c.lat, lng: c.lon, altitude: 0.002,
      radius: 0.22, color: col,
      label: `<div style="font-family:monospace;background:rgba(20,0,0,.97);border:1px solid ${col};padding:6px 10px;color:${col};font-size:10px">
        <div style="font-size:7px;margin-bottom:3px;letter-spacing:.1em">◈ LIVE CCTV</div>
        <div style="color:#fff;font-size:12px;margin-bottom:2px">${c.name}</div>
        <div style="font-size:8px;color:#aaa">${c.city} · ${c.country} · Click to view</div></div>`,
      data: c, type: 'cctv',
    })
  })
  // ── News: broadcast screenshot — real article photo framed like a TV news grab, sticking out from origin
  if (layers.news) news.forEach(n => {
    const title = (n.title || '').replace(/</g, '&lt;').replace(/"/g, '&quot;').slice(0, 68)
    const country = (n.country || n.source || '').replace(/</g, '&lt;')
    const imgUrl = n.image ? n.image.replace(/"/g, '&quot;') : ''
    otherPoints.push({
      lat: n.lat,
      lng: n.lng,
      altitude: 0.032,
      radius: 0.52,
      color: '#cc0000',
      label: `<div style="font-family:system-ui,sans-serif;width:260px;background:#000;border:4px solid #2a2a2a;box-shadow:inset 0 0 0 1px #111,0 12px 40px rgba(0,0,0,0.95),0 0 0 2px #cc0000;overflow:hidden;border-radius:8px">
        <div style="position:relative;width:100%;height:146px;background:#0d0d0d;overflow:hidden">
          ${imgUrl ? `<img src="${imgUrl}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.background='#0a0a0a'" />` : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a1a,#0d0d0d);display:flex;align-items:center;justify-content:center;color:#444;font-size:10px">NO IMAGE</div>'}
          <div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(180deg,rgba(204,0,0,0.96) 0%,rgba(160,0,0,0.85) 100%);color:#fff;padding:6px 12px;font-size:11px;font-weight:800;letter-spacing:0.28em;text-shadow:0 1px 3px rgba(0,0,0,0.9)">● LIVE</div>
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,rgba(0,0,0,0.94) 0%,transparent 70%);padding:32px 12px 12px;color:#fff;font-size:12px;font-weight:600;line-height:1.28;text-shadow:0 1px 4px #000">${title}${(n.title||'').length > 68 ? '…' : ''}</div>
          <div style="position:absolute;bottom:10px;right:12px;color:#ffb000;font-size:9px;letter-spacing:0.1em;text-shadow:0 1px 2px #000">${country}</div>
        </div>
        <div style="height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:12px solid #000;margin:0 auto;width:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))"></div>
      </div>`,
      data: n,
      type: 'news',
    })
  })
  if (layers.satellites) satellites.forEach(s => {
    const name = (s.name || '').replace(/</g, '&lt;').slice(0, 40)
    const altKm = Math.round(s.altKm ?? 0)
    const isF = s.id === followSatelliteId
    otherPoints.push({
      lat: s.lat, lng: s.lon,
      altitude: Math.max(0.002, (s.altKm ?? 400) / EARTH_RADIUS_KM),
      radius: isF ? 0.35 : 0.22,
      color: isF ? '#ffb000' : '#00e5ff',
      label: `<div style="font-family:monospace;background:rgba(0,12,20,.97);border:1px solid ${isF ? '#ffb000' : '#00e5ff'};padding:6px 10px;color:${isF ? '#ffb000' : '#00e5ff'};font-size:10px">
        <div style="font-size:7px;margin-bottom:2px;letter-spacing:.1em">◈ SATELLITE</div>
        <div style="color:#fff;font-size:11px">${name}${(s.name||'').length > 40 ? '…' : ''}</div>
        <div style="font-size:8px;color:#aaa;margin-top:2px">${altKm} km · NORAD ${s.noradId || s.id} · Click to track</div></div>`,
      data: s, type: 'satellite',
    })
  })

  // Leaflet overlay active when zoomed in close — suppressed while search animation runs
  // so the overlay never flickers into view at intermediate altitudes during the zoom.
  const overlayActive = !animating && zoomAlt < SATELLITE_ALT_THRESHOLD

  return (
    <>
      {/* ── Zoomed-in overlay: map (Mapbox or Leaflet) — OUTSIDE globe filter so it stays visible */}
      {overlayActive && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, width: '100%', height: '100%' }}>
          <SatelliteMapOverlay
            globeRef={globeRef}
            altitude={zoomAlt}
            imageryStyle={imageryStyle}
            trafficLayer={layers.traffic}
            onZoomOut={handleOverlayZoomOut}
            filterStyle={globeFilter()}
          />
        </div>
      )}

      <div style={{ position:'absolute', inset:0, filter:globeFilter(), transition:'filter .6s ease', pointerEvents: overlayActive ? 'none' : 'auto' }}>
        {/* ── Search bar — always visible, top-right of screen */}
        <SearchBar onSelect={handleSearchSelect} />

        <ReactGlobe
        ref={globeRef}
        width={dims.w} height={dims.h}
        globeImageUrl={GLOBE_IMG} bumpImageUrl={BUMP_IMG} backgroundImageUrl={STARS_IMG}
        showAtmosphere atmosphereColor="#00cc33" atmosphereAltitude={0.15}
        showGraticules

        // ── THREE.js plane sprites
        customLayerData={layers.flights ? stableFlights : []}
        customThreeObject={makeSprite}
        customThreeObjectUpdate={updateSprite}
        onCustomLayerClick={d => onClickRef.current?.(d)}

        // ── Animated arc trails
        arcsData={allArcs}
        arcStartLat="startLat" arcStartLng="startLng"
        arcEndLat="endLat"     arcEndLng="endLng"
        arcColor="color"       arcStroke="stroke"
        arcAltitudeAutoScale={0.12}
        arcDashLength={0.4} arcDashGap={0.6} arcDashAnimateTime={5000}

        // ── Other points
        pointsData={otherPoints}
        pointLat="lat" pointLng="lng" pointAltitude="altitude"
        pointRadius="radius" pointColor="color" pointLabel="label"
        onPointClick={pt => {
          if (pt.type === 'cctv')     onCameraClickRef.current?.(pt.data)
          if (pt.type === 'news')     onNewsClick?.(pt.data)
          if (pt.type === 'satellite') onSatelliteClick?.(pt.data)
        }}
        pointResolution={4}
      />

      {/* ── Zoom Bar (hidden when Leaflet overlay is active — it has its own controls) */}
      {!overlayActive && <div style={{
        position: 'fixed', left: 228, top: '50%', transform: 'translateY(-50%)',
        zIndex: 200, pointerEvents: 'all',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'rgba(0,8,0,0.9)', border: '1px solid rgba(0,255,65,0.22)',
        padding: '8px 4px',
      }}>
        <button style={ZBT} onClick={() => applyZoom(zoomAlt * 0.55)} title="Zoom in">+</button>

        <div style={{ height: 130, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <input
            type="range" min={0} max={100} step={0.5}
            value={altToSlider(zoomAlt)}
            onChange={e => applyZoom(sliderToAlt(+e.target.value))}
            style={{
              writingMode: 'vertical-lr', direction: 'rtl',
              height: 120, width: 22,
              appearance: 'slider-vertical',
              accentColor: '#00ff41',
              cursor: 'pointer',
            }}
          />
        </div>

        <button style={ZBT} onClick={() => applyZoom(zoomAlt * 1.8)} title="Zoom out">−</button>

        <div style={{
          fontSize: 7, letterSpacing: '0.08em',
          color: 'rgba(0,255,65,0.45)', textAlign: 'center', lineHeight: 1.4,
        }}>
          {zoomAlt < 0.6 ? 'REGIO\nNAL' : zoomAlt < 2 ? ' MID\nRANGE' : 'GLOBE'}
        </div>
      </div>}
      </div>
    </>
  )
})

export default Globe
