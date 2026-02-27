import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import ReactGlobe from 'react-globe.gl'

const GLOBE_IMG = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg'
const BUMP_IMG  = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png'
const STARS_IMG = 'https://unpkg.com/three-globe@2.31.1/example/img/night-sky.png'

function quakeRingColor(mag) {
  if (mag >= 6)  return t => `rgba(255,${Math.round(t*20)},0,${(1-t)*0.85})`
  if (mag >= 5)  return t => `rgba(255,${Math.round(100+t*50)},0,${(1-t)*0.8})`
  if (mag >= 4)  return t => `rgba(255,200,0,${(1-t)*0.75})`
  return           t => `rgba(0,220,180,${(1-t)*0.6})`
}

function quakeMaxRadius(mag) {
  return Math.max(0.3, Math.pow(2, mag - 2) * 0.18)
}

const Globe = forwardRef(function Globe({
  layers, flights, satellites, quakes,
  viewMode, bloom, sharpen,
  onFlightClick, onQuakeClick,
}, ref) {
  const globeRef  = useRef()
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight })

  useImperativeHandle(ref, () => ({
    flyTo(lat, lon, alt = 2.5) {
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: alt }, 1800)
    }
  }))

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 0)
  }, [])

  // ── Compute CSS filter for globe wrapper
  const globeFilter = useCallback(() => {
    const b = 0.75 + (bloom   / 100) * 0.85
    const c = 1.0  + (sharpen / 100) * 1.2
    let extra = ''
    switch (viewMode) {
      case 'crt':   extra = 'hue-rotate(90deg) saturate(2)';          break
      case 'nvg':   extra = 'hue-rotate(75deg) saturate(3) brightness(1.1)'; break
      case 'flir':  extra = 'sepia(1) hue-rotate(-30deg) saturate(8) brightness(1.05)'; break
      case 'noir':  extra = 'grayscale(1) contrast(1.3)';             break
      case 'anime': extra = 'saturate(2.5) contrast(1.3)';            break
      case 'snow':  extra = 'brightness(1.5) grayscale(0.4)';         break
      case 'ai':    extra = 'hue-rotate(200deg) saturate(3)';         break
      default:      extra = ''
    }
    return `brightness(${b.toFixed(2)}) contrast(${c.toFixed(2)}) ${extra}`.trim()
  }, [viewMode, bloom, sharpen])

  // ── Build point data
  const allPoints = []

  // Flight points (on globe surface)
  if (layers.flights) {
    flights.forEach(f => {
      allPoints.push({
        lat: f.lat, lng: f.lon,
        altitude: 0.005,
        radius: 0.2,
        color: f.vertRate > 1 ? '#00ffe5' : f.vertRate < -1 ? '#ff8c00' : '#00ff41',
        label: `<div style="font-family:monospace;background:rgba(0,15,0,0.95);border:1px solid #00ff41;padding:6px 10px;color:#00ff41;font-size:11px;pointer-events:none">
          <div style="color:#ffb000;font-size:8px;letter-spacing:0.1em;margin-bottom:3px">✈ FLIGHT TRACK</div>
          <div style="font-size:14px">${f.callsign}</div>
          <div style="margin-top:4px;font-size:9px;color:#aaa">
            ALT ${f.alt}m &nbsp;·&nbsp; ${f.speed}kts &nbsp;·&nbsp; HDG ${Math.round(f.heading)}°
          </div>
        </div>`,
        data: f, type: 'flight',
      })
    })
  }

  // Quake points
  if (layers.earthquakes) {
    quakes.forEach(q => {
      allPoints.push({
        lat: q.lat, lng: q.lon,
        altitude: 0,
        radius: Math.max(0.15, q.mag * 0.1),
        color: q.mag >= 5 ? '#ff2d00' : q.mag >= 4 ? '#ff8c00' : '#ffdd00',
        label: `<div style="font-family:monospace;background:rgba(20,0,0,0.95);border:1px solid #ff3300;padding:6px 10px;color:#ff8c00;font-size:11px">
          <div style="color:#ff2d2d;font-size:8px;margin-bottom:3px">⚡ SEISMIC EVENT</div>
          <div style="font-size:16px;color:#fff">M${q.mag?.toFixed(1)}</div>
          <div style="font-size:9px;color:#aaa;margin-top:3px">${(q.place||'').slice(0,50)}</div>
          <div style="font-size:8px;color:#666;margin-top:2px">DEPTH: ${q.depth?.toFixed(0)}km</div>
        </div>`,
        data: q, type: 'quake',
      })
    })
  }

  // ── Satellite points (at altitude)
  const satPoints = layers.satellites ? satellites.map(s => ({
    lat: s.lat, lng: s.lon,
    altitude: Math.max(0.01, Math.min(s.alt / 6371, 1.8)),
    radius: 0.05,
    color: '#00e5ff',
    label: `<div style="font-family:monospace;background:rgba(0,0,20,0.95);border:1px solid #00e5ff;padding:5px 8px;color:#00e5ff;font-size:10px">
      <div style="color:#ffb000;font-size:7px;margin-bottom:2px">◈ ORBITAL ASSET</div>
      <div>${s.name}</div>
      <div style="font-size:8px;color:#aaa;margin-top:2px">ALT: ${Math.round(s.alt)}km</div>
    </div>`,
    data: s, type: 'sat',
  })) : []

  // ── Earthquake rings
  const quakeRings = layers.earthquakes ? quakes.map(q => ({
    lat: q.lat, lng: q.lon,
    maxR: quakeMaxRadius(q.mag),
    propagationSpeed: 1.5 + q.mag * 0.3,
    repeatPeriod: 900 - q.mag * 60,
    colorFn: quakeRingColor(q.mag),
  })) : []

  const handlePointClick = (pt) => {
    if (pt.type === 'flight') onFlightClick?.(pt.data)
    if (pt.type === 'quake')  onQuakeClick?.(pt.data)
  }

  const combinedPoints = [...allPoints, ...satPoints]

  return (
    <div
      className="globe-wrapper"
      style={{
        position: 'absolute', inset: 0,
        filter: globeFilter(),
        transition: 'filter 0.6s ease',
      }}
    >
      <ReactGlobe
        ref={globeRef}
        width={dims.w}
        height={dims.h}

        // Base imagery
        globeImageUrl={GLOBE_IMG}
        bumpImageUrl={BUMP_IMG}
        backgroundImageUrl={STARS_IMG}

        // Atmosphere — green-tinted for tactical look
        showAtmosphere={true}
        atmosphereColor="#00cc33"
        atmosphereAltitude={0.15}
        showGraticules={true}

        // ── Points (flights + quakes on surface, sats at altitude)
        pointsData={combinedPoints}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointRadius="radius"
        pointColor="color"
        pointLabel="label"
        onPointClick={handlePointClick}
        pointResolution={4}

        // ── Earthquake rings
        ringsData={quakeRings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor="colorFn"
        ringResolution={48}
      />
    </div>
  )
})

export default Globe
