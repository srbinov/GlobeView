import { useState, useEffect, useRef, useCallback } from 'react'

// adsb.lol regional proxy routes (all via Vite dev server — no CORS)
// 3 hemispheric queries give full global coverage
const ADSB_REGIONS = [
  '/proxy/adsb-eur',   // Europe / Africa / Middle East
  '/proxy/adsb-nam',   // Americas
  '/proxy/adsb-asi',   // Asia / Pacific / Oceania
]
const OPENSKY_URL = '/proxy/opensky'

const POLL_MS = 20_000

// ── Only include flights with a real-looking callsign (not hex fallback or empty)
function isValidCallsign(callsign) {
  const cs = (callsign || '').trim()
  if (cs.length < 2) return false
  const hasLetter = /[A-Za-z]/.test(cs)
  const hasDigit = /\d/.test(cs)
  const isHexOnly = /^[0-9A-Fa-f]+$/.test(cs) && cs.length >= 6
  return hasLetter && (hasDigit || cs.length >= 3) && !isHexOnly
}

// ── Pick up to maxCount flights spread around the globe (avoid clusters)
function spreadFlightsGlobally(flights, maxCount = 15) {
  if (flights.length <= maxCount) return flights
  // Grid: 5 lat bands × 6 lon bands = 30 cells; pick at most 1 per cell, then fill remaining
  const cells = new Map() // key = "latBand,lonBand"
  const latBand = (lat) => Math.max(0, Math.min(4, Math.floor((lat + 90) / 36)))
  const lonBand = (lon) => Math.max(0, Math.min(5, Math.floor((lon + 180) / 60)))
  const key = (f) => `${latBand(f.lat)},${lonBand(f.lon)}`
  for (const f of flights) {
    const k = key(f)
    if (!cells.has(k)) cells.set(k, [])
    cells.get(k).push(f)
  }
  const result = []
  const used = new Set()
  // Sort cell keys so we pick from diverse regions (e.g. alternate lat bands)
  const cellKeys = [...cells.keys()].sort((a, b) => {
    const [la, lo] = a.split(',').map(Number)
    const [lb, lbo] = b.split(',').map(Number)
    return la !== lb ? la - lb : lo - lbo
  })
  for (const k of cellKeys) {
    if (result.length >= maxCount) break
    const list = cells.get(k)
    const f = list[Math.floor(Math.random() * list.length)]
    if (!used.has(f.id)) { result.push(f); used.add(f.id) }
  }
  // If still under limit, add any remaining flights
  if (result.length < maxCount) {
    for (const f of flights) {
      if (result.length >= maxCount) break
      if (!used.has(f.id)) { result.push(f); used.add(f.id) }
    }
  }
  return result.slice(0, maxCount)
}

// ── Parse one adsb.lol regional response ──────────────────────────────────
// Response: { ac: [...], total, msg, now }
// alt_baro: feet (or string "ground"), gs: knots, baro_rate: ft/min, track: degrees
function parseAdsbRegion(data) {
  const ac = data.ac || []
  return ac.filter(s =>
    s.hex &&
    s.lat != null && s.lon != null &&
    typeof s.alt_baro === 'number' && s.alt_baro > 100
  )
}

function mapAdsb(s) {
  return {
    id:         s.hex,
    callsign:   (s.flight || s.r || s.hex).trim(),
    country:    s.r ? s.r.slice(0, 2) : '',
    lon:        s.lon,
    lat:        s.lat,
    alt:        Math.round(s.alt_baro * 0.3048),   // ft → m
    speedMs:    (s.gs ?? 0) * 0.51444,              // kts → m/s
    speed:      Math.round(s.gs ?? 0),              // kts
    heading:    s.track ?? 0,
    vertRate:   (s.baro_rate ?? 0) * 0.00508,       // ft/min → m/s
    squawk:     s.squawk || null,
    lastUpdate: Date.now(),
  }
}

// ── Parse OpenSky fallback ─────────────────────────────────────────────────
function parseOpenSky(data) {
  if (!data.states) return []
  return data.states
    .filter(s => s[5] != null && s[6] != null && !s[8])
    .map(s => ({
      id:         s[0],
      callsign:   (s[1] || s[0] || '???').trim(),
      country:    s[2] || '',
      lon:        s[5],
      lat:        s[6],
      alt:        s[7] ? Math.round(s[7]) : 0,
      speedMs:    s[9] || 0,
      speed:      s[9] ? Math.round(s[9] * 1.94384) : 0,
      heading:    s[10] || 0,
      vertRate:   s[11] || 0,
      squawk:     s[14] || null,
      lastUpdate: Date.now(),
    }))
}

export function useFlights(enabled) {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const intervalRef = useRef(null)
  const retryRef    = useRef(null)

  const fetchFlights = useCallback(async () => {
    try {
      setLoading(true)
      let mapped = null

      // ── Primary: adsb.lol — 3 regional queries in parallel
      try {
        console.log('[useFlights] querying adsb.lol (3 regions in parallel)…')
        const results = await Promise.all(
          ADSB_REGIONS.map(url =>
            fetch(url)
              .then(r => {
                console.log(`[useFlights] ${url} → ${r.status}`)
                return r.ok ? r.json() : null
              })
              .catch(e => { console.warn(`[useFlights] ${url} threw: ${e.message}`); return null })
          )
        )

        // Merge all regions, deduplicate by hex
        const seen = new Map()
        for (const data of results) {
          if (!data) continue
          const ac = parseAdsbRegion(data)
          console.log(`[useFlights]   region raw ac: ${(data.ac||[]).length}, airborne: ${ac.length}`)
          for (const s of ac) {
            if (!seen.has(s.hex)) seen.set(s.hex, s)
          }
        }

        if (seen.size > 0) {
          const all = [...seen.values()].map(mapAdsb).filter((f) => isValidCallsign(f.callsign))
          mapped = spreadFlightsGlobally(all, 15)
          console.log(`[useFlights] ✓ adsb.lol merged: ${all.length} → ${mapped.length} globally spread`)
        } else {
          console.warn('[useFlights] adsb.lol returned 0 airborne tracks across all regions')
        }
      } catch (e) {
        console.warn('[useFlights] adsb.lol block threw:', e.name, e.message)
      }

      // ── Fallback: OpenSky
      if (!mapped) {
        console.log('[useFlights] falling back to OpenSky…')
        const res = await fetch(OPENSKY_URL)
        console.log(`[useFlights] opensky → ${res.status}`)

        if (res.status === 429) {
          const wait = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000
          const msg  = `OpenSky rate-limited — retrying in ${Math.round(wait / 1000)}s`
          console.warn('[useFlights]', msg)
          setError(msg)
          retryRef.current = setTimeout(fetchFlights, wait)
          return
        }
        if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`)

        const data = await res.json()
        const all = parseOpenSky(data).filter((f) => isValidCallsign(f.callsign))
        mapped = spreadFlightsGlobally(all, 15)
        console.log(`[useFlights] ✓ opensky: ${all.length} → ${mapped.length} globally spread`)
      }

      if (mapped && mapped.length > 0) {
        setFlights(mapped)
        setError(null)
      } else {
        console.warn('[useFlights] all sources returned 0 tracks — keeping stale data')
      }

    } catch (e) {
      console.error('[useFlights] fatal:', e.name, e.message)
      setError(`${e.name}: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-retry on error (15 s)
  useEffect(() => {
    if (!error || !enabled) return
    const tid = setTimeout(fetchFlights, 15_000)
    return () => clearTimeout(tid)
  }, [error, enabled, fetchFlights])

  useEffect(() => {
    if (!enabled) {
      setFlights([])
      clearInterval(intervalRef.current)
      clearTimeout(retryRef.current)
      return
    }
    fetchFlights()
    intervalRef.current = setInterval(fetchFlights, POLL_MS)
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(retryRef.current)
    }
  }, [enabled, fetchFlights])

  return { flights, loading, error, count: flights.length, refetch: fetchFlights }
}
