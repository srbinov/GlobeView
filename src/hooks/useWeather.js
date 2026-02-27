import { useState, useEffect } from 'react'

// RainViewer provides free radar tiles — no API key needed
const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json'

export function useWeather(enabled) {
  const [tileUrl, setTileUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) { setTileUrl(null); return }

    const fetch_ = async () => {
      try {
        setLoading(true)
        const res = await fetch(RAINVIEWER_API)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // Get latest radar frame
        const radar = data.radar
        if (!radar?.past?.length) throw new Error('No radar data')
        const latest = radar.past[radar.past.length - 1]
        // Tile URL template
        const url = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`
        setTileUrl(url)
        setError(null)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetch_()
    const id = setInterval(fetch_, 600000) // refresh every 10 min
    return () => clearInterval(id)
  }, [enabled])

  return { tileUrl, loading, error }
}
