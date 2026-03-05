import { useState, useEffect, useRef, useCallback } from 'react'
import * as satellite from 'satellite.js'

// CelesTrak: space stations + notable sats (real TLE data)
const CELESTRAK_STATIONS = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json'
const MAX_SATELLITES = 22
const TLE_POLL_MS = 30_000
const POSITION_UPDATE_MS = 5_000

function propagateToGeodetic(satrec, date) {
  try {
    const jday = satellite.jday(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    )
    const posVel = satellite.propagate(satrec, date)
    if (posVel.position && typeof posVel.position.x === 'number') {
      const gmst = satellite.gstime(jday)
      const geodetic = satellite.eciToGeodetic(posVel.position, gmst)
      const lat = satellite.radiansToDegrees(geodetic.latitude)
      const lon = satellite.radiansToDegrees(geodetic.longitude)
      const altKm = geodetic.height
      return { lat, lon, altKm }
    }
  } catch (_) {}
  return null
}

export function useSatellites(enabled) {
  const [satellites, setSatellites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)
  const positionIntervalRef = useRef(null)
  const satrecsRef = useRef(new Map())
  const listRef = useRef([])

  const fetchSatellites = useCallback(async () => {
    if (!enabled) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(CELESTRAK_STATIONS)
      if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`)
      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : []
      const now = new Date()
      const out = []
      satrecsRef.current.clear()

      for (let i = 0; i < Math.min(MAX_SATELLITES, list.length); i++) {
        const o = list[i]
        try {
          const satrec = satellite.json2satrec(o)
          satrecsRef.current.set(String(o.NORAD_CAT_ID), { satrec, name: o.OBJECT_NAME || `SAT ${o.NORAD_CAT_ID}` })
          const pos = propagateToGeodetic(satrec, now)
          if (pos) {
            out.push({
              id: String(o.NORAD_CAT_ID),
              name: (o.OBJECT_NAME || `SAT ${o.NORAD_CAT_ID}`).trim(),
              lat: pos.lat,
              lon: pos.lon,
              altKm: pos.altKm,
              noradId: o.NORAD_CAT_ID,
            })
          }
        } catch (_) {
          // skip invalid TLE
        }
      }

      listRef.current = out.map(s => ({ id: s.id, name: s.name, noradId: s.noradId }))
      setSatellites(out)
    } catch (e) {
      console.warn('[useSatellites]', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const updatePositions = useCallback(() => {
    const now = new Date()
    const out = []
    for (const { id, name, noradId } of listRef.current) {
      const entry = satrecsRef.current.get(String(id))
      if (!entry) continue
      const pos = propagateToGeodetic(entry.satrec, now)
      if (pos) out.push({ id, name, noradId, lat: pos.lat, lon: pos.lon, altKm: pos.altKm })
    }
    if (out.length) setSatellites(out)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setSatellites([])
      listRef.current = []
      satrecsRef.current.clear()
      clearInterval(intervalRef.current)
      clearInterval(positionIntervalRef.current)
      return
    }
    fetchSatellites()
    intervalRef.current = setInterval(fetchSatellites, TLE_POLL_MS)
    positionIntervalRef.current = setInterval(updatePositions, POSITION_UPDATE_MS)
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(positionIntervalRef.current)
    }
  }, [enabled, fetchSatellites, updatePositions])

  const getSatrec = useCallback((noradId) => {
    const entry = satrecsRef.current.get(String(noradId))
    return entry?.satrec ?? null
  }, [])

  const getOrbitPath = useCallback((noradId, minutesAhead = 90, stepMin = 2) => {
    const entry = satrecsRef.current.get(String(noradId))
    if (!entry?.satrec) return []
    const satrec = entry.satrec
    const now = new Date()
    const points = []
    for (let m = 0; m <= minutesAhead; m += stepMin) {
      const t = new Date(now.getTime() + m * 60 * 1000)
      const pos = propagateToGeodetic(satrec, t)
      if (pos) points.push(pos)
    }
    return points
  }, [])

  return {
    satellites,
    loading,
    error,
    count: satellites.length,
    refetch: fetchSatellites,
    getSatrec,
    getOrbitPath,
  }
}
