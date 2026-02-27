import { useState, useEffect, useRef } from 'react'

const OPENSKY_URL = 'https://opensky-network.org/api/states/all'

export function useFlights(enabled) {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchFlights = async () => {
    try {
      setLoading(true)
      const res = await fetch(OPENSKY_URL, {
        headers: { 'Accept': 'application/json' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.states) { setFlights([]); return }

      // Map OpenSky state vectors to friendly objects
      // [icao24, callsign, origin_country, time_pos, last_contact,
      //  lon, lat, baro_alt, on_ground, velocity, true_track, vertical_rate,
      //  sensors, geo_alt, squawk, spi, position_source]
      const mapped = data.states
        .filter(s => s[5] != null && s[6] != null && !s[8]) // has coords, airborne
        .slice(0, 250) // cap for performance
        .map(s => ({
          id: s[0],
          callsign: (s[1] || s[0] || '???').trim(),
          country: s[2] || '',
          lon: s[5],
          lat: s[6],
          alt: s[7] ? Math.round(s[7]) : 0,
          speedMs: s[9] || 0,
          speed: s[9] ? Math.round(s[9] * 1.94384) : 0,
          heading: s[10] || 0,
          vertRate: s[11] || 0,
          squawk: s[14] || null,
          lastUpdate: Date.now(),
        }))
      setFlights(mapped)
      setError(null)
    } catch (e) {
      setError(e.message)
      // On error keep stale data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) {
      setFlights([])
      clearInterval(intervalRef.current)
      return
    }
    fetchFlights()
    intervalRef.current = setInterval(fetchFlights, 30000) // OpenSky rate limit: every 10s
    return () => clearInterval(intervalRef.current)
  }, [enabled])

  return { flights, loading, error, count: flights.length }
}
