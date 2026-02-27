import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const EARTH_IMG = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg'
const DEG2RAD = Math.PI / 180
const PATH_RADIUS = 1.008 // Slightly above globe surface so path is visible (no z-fight)
const TUBE_RADIUS = 0.008

// Airport lat/lon from any common API shape (adsbdb uses latitude/longitude, OurAirports uses latitude_deg/longitude_deg)
function airportLat(ap) {
  if (!ap) return null
  const v = ap.latitude_deg ?? ap.lat ?? ap.latitude
  return typeof v === 'number' ? v : null
}
function airportLon(ap) {
  if (!ap) return null
  const v = ap.longitude_deg ?? ap.lon ?? ap.longitude
  return typeof v === 'number' ? v : null
}

// 2-letter country code → flag emoji (regional indicators)
function countryToFlagEmoji(cc) {
  if (!cc || cc.length < 2) return ''
  const c = String(cc).toUpperCase()
  const a = 0x1f1e6 - 65
  return String.fromCodePoint(a + c.charCodeAt(0), a + c.charCodeAt(1))
}

// ICAO 2-letter prefix → ISO 3166-1 alpha-2 for correct flag emoji (ICAO ≠ ISO for some countries)
const ICAO2_TO_ISO = {
  EG: 'GB', LF: 'FR', LE: 'ES', LI: 'IT', LD: 'IE', LP: 'PT', LG: 'GR', LK: 'CZ', LH: 'DE',
  EN: 'NO', ES: 'SE', EF: 'FI', EK: 'DK', EB: 'BE', ED: 'DE', ET: 'DE',
  K: 'US', C: 'CA', M: 'MX', Y: 'AU', Z: 'CN', R: 'JP', V: 'IN', U: 'RU',
}
function airportCountryCode(ap) {
  if (!ap) return ''
  const c = ap.country_code ?? ap.country_iso_code ?? ap.iso_country
  if (c && c.length >= 2) return c.toUpperCase().slice(0, 2)
  const icao = (ap.icao_code || ap.icao || '').toUpperCase()
  if (icao.length >= 2) return ICAO2_TO_ISO[icao.slice(0, 2)] ?? ''
  if (icao.length === 1) return ICAO2_TO_ISO[icao] ?? ''
  return ''
}

// Lat/lon (degrees) → unit vector (Y up: north pole = +Y)
function latLonToXYZ(lat, lon, radius = 1) {
  const la = lat * DEG2RAD
  const lo = lon * DEG2RAD
  const c = Math.cos(la)
  const x = c * Math.cos(lo)
  const y = Math.sin(la)
  const z = c * Math.sin(lo)
  return new THREE.Vector3(x * radius, y * radius, z * radius)
}

// Great-circle arc: sample points between A and B on sphere (normalized lerp)
function arcPoints(lat1, lon1, lat2, lon2, numPoints = 28, radius = 1) {
  const a = latLonToXYZ(lat1, lon1, 1)
  const b = latLonToXYZ(lat2, lon2, 1)
  const pts = []
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const p = new THREE.Vector3().lerpVectors(a, b, t).normalize().multiplyScalar(radius)
    pts.push(p)
  }
  return pts
}

// Spherical orbit: apply (theta, phi, radius) to camera position, looking at origin
function applyOrbit(camera, { theta, phi, radius }) {
  camera.position.set(
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta)
  )
  camera.lookAt(0, 0, 0)
}

// Initial orbit so camera faces the path (midpoint of path points on sphere)
function initialOrbitFromPath(pathPoints, radius = 2.2) {
  if (!pathPoints || pathPoints.length === 0) {
    return { theta: 0.6, phi: 0.35, radius }
  }
  const mid = new THREE.Vector3(0, 0, 0)
  pathPoints.forEach((p) => mid.add(p))
  mid.divideScalar(pathPoints.length)
  mid.normalize()
  const pos = mid.clone().multiplyScalar(radius)
  const theta = Math.atan2(pos.x, pos.z)
  const phi = Math.asin(Math.max(-0.99, Math.min(0.99, pos.y / radius)))
  return { theta, phi, radius }
}

export default function FlightPathGlobe({ flight, origin, destination, width = 380, height = 200 }) {
  const mountRef = useRef(null)
  const orbitRef = useRef({ theta: 0.6, phi: 0.35, radius: 2.2 })
  const dragRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })

  const oLat = airportLat(origin)
  const oLon = airportLon(origin)
  const dLat = airportLat(destination)
  const dLon = airportLon(destination)
  const hasOrigin = oLat != null && oLon != null
  const hasDest = dLat != null && dLon != null
  const hasCurrent = flight?.lat != null && flight?.lon != null
  const hasPath = hasOrigin && hasCurrent && hasDest

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000a00, 1)
    el.appendChild(renderer.domElement)

    const texLoader = new THREE.TextureLoader()
    const earthTex = texLoader.load(EARTH_IMG)
    const earthGeo = new THREE.SphereGeometry(1, 32, 24)
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTex,
      specular: new THREE.Color(0x222244),
      shininess: 8,
      transparent: true,
      opacity: 0.95,
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    scene.add(new THREE.AmbientLight(0x333333, 0.8))
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.position.set(2, 2, 1)
    scene.add(sun)

    const pathPoints = []
    if (hasOrigin && hasCurrent) {
      arcPoints(oLat, oLon, flight.lat, flight.lon, 24, PATH_RADIUS).forEach((p) => pathPoints.push(p))
    }
    if (hasCurrent && hasDest) {
      arcPoints(flight.lat, flight.lon, dLat, dLon, 24, PATH_RADIUS).forEach((p, i) => {
        if (i > 0) pathPoints.push(p)
      })
    }
    if (pathPoints.length === 0 && hasCurrent) {
      pathPoints.push(latLonToXYZ(flight.lat, flight.lon, PATH_RADIUS))
    }
    if (pathPoints.length === 0 && (hasOrigin || hasDest)) {
      if (hasOrigin) pathPoints.push(latLonToXYZ(oLat, oLon, PATH_RADIUS))
      if (hasDest) pathPoints.push(latLonToXYZ(dLat, dLon, PATH_RADIUS))
    }

    orbitRef.current = initialOrbitFromPath(pathPoints, 2.2)
    applyOrbit(camera, orbitRef.current)

    if (pathPoints.length > 1) {
      const curve = new THREE.CatmullRomCurve3(pathPoints, false)
      const tubeGeo = new THREE.TubeGeometry(curve, pathPoints.length * 2, TUBE_RADIUS, 8, false)
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tube)
    }

    if (hasCurrent) {
      const pos = latLonToXYZ(flight.lat, flight.lon, PATH_RADIUS)
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffb000 })
      )
      dot.position.copy(pos)
      scene.add(dot)
    }
    if (hasOrigin) {
      const pos = latLonToXYZ(oLat, oLon, PATH_RADIUS)
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 6),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      )
      dot.position.copy(pos)
      scene.add(dot)
    }
    if (hasDest) {
      const pos = latLonToXYZ(dLat, dLon, PATH_RADIUS)
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 6),
        new THREE.MeshBasicMaterial({ color: 0xff4444 })
      )
      dot.position.copy(pos)
      scene.add(dot)
    }

    const startDrag = (x, y) => {
      dragRef.current = true
      lastRef.current = { x, y }
      el.style.cursor = 'grabbing'
    }
    const moveDrag = (x, y) => {
      if (!dragRef.current) return
      const dx = (x - lastRef.current.x) * 0.012
      const dy = (y - lastRef.current.y) * 0.01
      orbitRef.current.theta -= dx
      orbitRef.current.phi = Math.max(-1.4, Math.min(1.4, orbitRef.current.phi - dy))
      lastRef.current = { x, y }
    }
    const endDrag = () => {
      dragRef.current = false
      el.style.cursor = 'grab'
    }
    const onWheel = (e) => {
      e.preventDefault()
      orbitRef.current.radius = Math.max(1.4, Math.min(3.5, orbitRef.current.radius + e.deltaY * 0.004))
    }

    el.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY))
    el.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY))
    el.addEventListener('mouseup', endDrag)
    el.addEventListener('mouseleave', endDrag)
    el.addEventListener('wheel', onWheel, { passive: false })
    const touchStart = (e) => {
      if (e.touches.length) startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    const touchMove = (e) => {
      e.preventDefault()
      if (e.touches.length) moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    el.addEventListener('touchstart', touchStart)
    el.addEventListener('touchmove', touchMove, { passive: false })
    el.addEventListener('touchend', endDrag)

    let rafId
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      applyOrbit(camera, orbitRef.current)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('mousedown', startDrag)
      el.removeEventListener('mousemove', moveDrag)
      el.removeEventListener('mouseup', endDrag)
      el.removeEventListener('mouseleave', endDrag)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', touchStart)
      el.removeEventListener('touchmove', touchMove)
      el.removeEventListener('touchend', endDrag)
      renderer.dispose()
      earthTex.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [flight?.lat, flight?.lon, oLat, oLon, dLat, dLon, width, height])

  const originFlag = countryToFlagEmoji(airportCountryCode(origin))
  const destFlag = countryToFlagEmoji(airportCountryCode(destination))
  const originLabel = origin ? (origin.iata_code || origin.icao_code || '') : ''
  const destLabel = destination ? (destination.iata_code || destination.icao_code || '') : ''

  return (
    <div style={{ flexShrink: 0, background: '#000a00' }}>
      {/* Origin / Destination flags and codes */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '6px 12px 8px',
        fontSize: 11,
        borderBottom: '1px solid rgba(0,255,65,0.12)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-green)' }}>
          <span style={{ fontSize: 18 }}>{originFlag || '◉'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            {originLabel || '—'} Origin
          </span>
        </span>
        <span style={{ color: 'rgba(0,255,65,0.4)' }}>→</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-amber)' }}>
          <span style={{ fontSize: 18 }}>{destFlag || '◉'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            {destLabel || '—'} Destination
          </span>
        </span>
      </div>
      {!hasPath && (hasOrigin || hasDest || hasCurrent) && (
        <div style={{ padding: '4px 12px', fontSize: 8, color: 'rgba(0,255,65,0.4)', textAlign: 'center' }}>
          {!hasOrigin && !hasDest ? 'Route unknown — no origin/destination from API' : 'Partial route — path shown where data available'}
        </div>
      )}
      <div
        ref={mountRef}
        style={{
          width,
          height,
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
        }}
      />
      <div style={{ padding: '3px 12px 6px', fontSize: 7, color: 'rgba(0,255,65,0.35)', letterSpacing: '0.08em' }}>
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  )
}
