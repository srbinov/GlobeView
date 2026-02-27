import { useState, useEffect, useRef } from 'react'

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'

export function useEarthquakes(enabled) {
  const [quakes, setQuakes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchQuakes = async () => {
    try {
      setLoading(true)
      const res = await fetch(USGS_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const mapped = (data.features || []).map(f => ({
        id: f.id,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        mag: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        url: f.properties.url,
      }))
      setQuakes(mapped)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) { setQuakes([]); clearInterval(intervalRef.current); return }
    fetchQuakes()
    intervalRef.current = setInterval(fetchQuakes, 300000) // 5 min
    return () => clearInterval(intervalRef.current)
  }, [enabled])

  return { quakes, loading, error, count: quakes.length }
}
