import { useState, useEffect } from 'react'

// ── Source 1: TfL JamCam — ~900 London traffic cameras, live JPEG (updated ~1-2 min)
async function fetchLondon() {
  const r = await fetch('https://api.tfl.gov.uk/Place/Type/JamCam', {
    headers: { Accept: 'application/json' }
  })
  if (!r.ok) throw new Error(`TfL HTTP ${r.status}`)
  const data = await r.json()
  return (Array.isArray(data) ? data : [])
    .filter(c => c.lat && c.lon)
    .map(cam => {
      const props = {}
      ;(cam.additionalProperties || []).forEach(p => { props[p.key] = p.value })
      if (!props.imageUrl || props.available === 'false') return null
      return {
        id:      cam.id,
        name:    cam.commonName || cam.id,
        lat:     cam.lat,
        lon:     cam.lon,
        imageUrl: props.imageUrl,
        city:    'London',
        country: 'UK',
      }
    })
    .filter(Boolean)
    .slice(0, 500)
}

// ── Source 2: NYC DOT — hundreds of NYC traffic cameras, real-time JPEG
//    No auth required. Used in production: github.com/wttdotm/traffic_cam_photobooth
async function fetchNYC() {
  const r = await fetch('https://webcams.nyctmc.org/api/cameras')
  if (!r.ok) throw new Error(`NYC HTTP ${r.status}`)
  const data = await r.json()
  return (Array.isArray(data) ? data : [])
    .filter(c => c.latitude && c.longitude && c.isOnline !== false)
    .map(c => ({
      id:       `nyc_${c.id}`,
      name:     c.name || c.area || String(c.id),
      lat:      c.latitude,
      lon:      c.longitude,
      // imageUrl is in the response; fall back to constructing it from id
      imageUrl: c.imageUrl || `https://webcams.nyctmc.org/api/cameras/${c.id}/image`,
      city:     'New York',
      country:  'US',
    }))
    .slice(0, 400)
}

// ── Source 3: Ontario 511 — live highway cameras across Ontario, Canada
async function fetchOntario() {
  const r = await fetch('https://on.ibi511.com/api/v2/get/cameras')
  if (!r.ok) throw new Error(`Ontario HTTP ${r.status}`)
  const data = await r.json()
  const cams = Array.isArray(data) ? data : (data.cameras || data.Cameras || [])
  return cams
    .filter(c => (c.Latitude || c.latitude) && (c.Longitude || c.longitude))
    .map(c => {
      const imgUrl = c.Url || c.url || c.ImageUrl || c.imageUrl || null
      if (!imgUrl) return null
      return {
        id:       `on_${c.Id || c.id || Math.random()}`,
        name:     c.Name || c.name || c.RoadwayName || 'Highway Camera',
        lat:      c.Latitude || c.latitude,
        lon:      c.Longitude || c.longitude,
        imageUrl: imgUrl,
        city:     c.CityName || c.cityName || 'Ontario',
        country:  'Canada',
      }
    })
    .filter(Boolean)
    .slice(0, 300)
}

export function useCCTV(enabled) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!enabled) { setCameras([]); return }
    setLoading(true)

    Promise.all([
      fetchLondon().catch(e => { console.warn('[CCTV London]', e.message); return [] }),
      fetchNYC()   .catch(e => { console.warn('[CCTV NYC]',    e.message); return [] }),
      fetchOntario().catch(e => { console.warn('[CCTV Ontario]', e.message); return [] }),
    ]).then(([london, nyc, ontario]) => {
      const all = [...london, ...nyc, ...ontario]
      setCameras(all)
      setError(all.length === 0 ? 'All camera sources unreachable' : null)
    }).finally(() => setLoading(false))
  }, [enabled])

  return { cameras, loading, error, count: cameras.length }
}
