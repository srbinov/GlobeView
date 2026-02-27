import { useState, useEffect, useRef } from 'react'
import * as satellite from 'satellite.js'

// We generate synthetic TLE sets for a rich visual display.
// Optionally, we also try fetching from CelesTrak's GP JSON (CORS-enabled).
const CELESTRAK_GP = 'https://celestrak.org/SOCRATES/query.php?FORMAT=json'

function propagateAll(satrecs, date) {
  const positions = []
  for (const { name, satrec } of satrecs) {
    try {
      const pv = satellite.propagate(satrec, date)
      if (!pv?.position || pv.position === false) continue
      const gmst = satellite.gstime(date)
      const geo  = satellite.eciToGeodetic(pv.position, gmst)
      const lat  = satellite.degreesLat(geo.latitude)
      const lon  = satellite.degreesLong(geo.longitude)
      const alt  = geo.height // km
      if (!isFinite(lat) || !isFinite(lon) || !isFinite(alt)) continue
      positions.push({ name, lat, lon, alt })
    } catch { /* skip degenerate orbits */ }
  }
  return positions
}

function buildSyntheticSatrecs() {
  // Build ~180 synthetic satrecs at various inclinations and altitudes
  // These represent a realistic cross-section of the operational catalog.
  const REAL_TLES = [
    // ISS
    ['ISS (ZARYA)', '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9993', '2 25544  51.6400 208.9163 0006317  86.9974 273.1813 15.49212164 30000'],
    // Hubble
    ['HUBBLE',      '1 20580U 90037B   24001.00000000  .00001000  00000-0  30000-4 0  9991', '2 20580  28.4700 120.0000 0002500 200.0000 160.0000 15.09700000 40001'],
    // GPS II
    ['GPS IIR-10',  '1 26360U 00025A   24001.00000000  .00000000  00000-0  00000-0 0  9992', '2 26360  55.5000  45.0000 0100000   0.0000   0.0000  2.00563107 40002'],
  ]

  const satrecs = []

  // Add real ones first
  for (const [name, l1, l2] of REAL_TLES) {
    try {
      const satrec = satellite.twoline2satrec(l1, l2)
      if (satrec.error === 0) satrecs.push({ name, satrec })
    } catch { /* skip */ }
  }

  // Synthetic orbital shells
  // [inclination°, altitude km, count]
  const shells = [
    [0,     35786, 8],   // GEO
    [51.6,  408,   12],  // ISS-like LEO
    [53,    550,   20],  // Starlink shell 1
    [53.2,  560,   20],  // Starlink shell 2
    [70,    540,   15],  // High-inclination LEO
    [86,    450,   15],  // Sun-sync-ish
    [97.8,  500,   20],  // SSO
    [63.4,  1200,  15],  // Molniya-ish
    [28.5,  400,   10],  // Cape launch LEO
    [90,    650,   10],  // Polar
    [0,     20200, 6],   // GPS altitude
  ]

  let satNum = 70000
  for (const [inc, altKm, cnt] of shells) {
    const raanStep = 360 / cnt
    // Mean motion (rev/day) from altitude
    const mu = 398600.4418 // km³/s²
    const r  = 6371 + altKm
    const n  = Math.sqrt(mu / (r * r * r)) * 86400 / (2 * Math.PI)

    for (let i = 0; i < cnt; i++) {
      const raan = (i * raanStep + satNum * 0.7) % 360
      const ma   = (i * (360 / cnt) * 1.37) % 360
      // Format as TLE strings
      const l1 = `1 ${String(satNum).padStart(5)}U 24001A   24001.50000000  .00000050  00000-0  50000-5 0  9991`
      const l2 = `2 ${String(satNum).padStart(5)}  ${inc.toFixed(4)} ${raan.toFixed(4)} 0001000   0.0000 ${ma.toFixed(4)} ${n.toFixed(8)}    10`
      try {
        const satrec = satellite.twoline2satrec(l1, l2)
        if (satrec.error === 0) {
          satrecs.push({ name: `${altKm < 2000 ? 'LEO' : altKm < 25000 ? 'MEO' : 'GEO'}-${satNum}`, satrec })
        }
      } catch { /* skip */ }
      satNum++
      if (satrecs.length >= 180) break
    }
    if (satrecs.length >= 180) break
  }

  return satrecs
}

export function useSatellites(enabled) {
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [count,     setCount]     = useState(0)
  const satrecsRef  = useRef([])
  const timerRef    = useRef(null)

  // Propagate all satrecs to current time, update state
  const tick = () => {
    if (satrecsRef.current.length > 0) {
      const pos = propagateAll(satrecsRef.current, new Date())
      setPositions(pos)
    }
    timerRef.current = setTimeout(tick, 1000)
  }

  useEffect(() => {
    if (!enabled) {
      setPositions([])
      clearTimeout(timerRef.current)
      return
    }

    setLoading(true)

    // Try live CelesTrak GP data first, fall back to synthetics
    const loadData = async () => {
      let satrecs = []
      try {
        const res = await fetch(CELESTRAK_GP, { signal: AbortSignal.timeout(6000) })
        if (res.ok) {
          const json = await res.json()
          for (const sat of json.slice(0, 180)) {
            try {
              const rec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2)
              if (rec.error === 0) satrecs.push({ name: sat.OBJECT_NAME, satrec: rec })
            } catch { /* skip */ }
          }
        }
      } catch { /* network error or CORS block → use synthetics */ }

      if (satrecs.length < 20) {
        satrecs = buildSyntheticSatrecs()
      }

      satrecsRef.current = satrecs
      setCount(satrecs.length)
      setError(null)
      setLoading(false)
    }

    loadData()
    tick()

    return () => clearTimeout(timerRef.current)
  }, [enabled])

  return { positions, loading, error, count }
}
