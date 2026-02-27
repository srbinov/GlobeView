import { useState, useEffect } from 'react'

// Relative paths hit Vite proxy (see vite.config.js) to avoid CORS

// ── Source 1: TfL JamCam — London traffic cameras (updated ~1–2 min)
async function fetchLondon() {
  const r = await fetch('https://api.tfl.gov.uk/Place/Type/JamCam', {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`TfL HTTP ${r.status}`)
  const data = await r.json()
  return (Array.isArray(data) ? data : [])
    .filter((c) => c.lat && c.lon)
    .map((cam) => {
      const props = {}
      ;(cam.additionalProperties || []).forEach((p) => { props[p.key] = p.value })
      if (!props.imageUrl || props.available === 'false') return null
      return {
        id: cam.id,
        name: cam.commonName || cam.id,
        lat: cam.lat,
        lon: cam.lon,
        imageUrl: props.imageUrl,
        city: 'London',
        country: 'UK',
      }
    })
    .filter(Boolean)
    .slice(0, 400)
}

// ── Source 2: NYC DOT — New York traffic cameras
async function fetchNYC() {
  const r = await fetch('/proxy/cctv-nyc')
  if (!r.ok) throw new Error(`NYC HTTP ${r.status}`)
  const data = await r.json()
  return (Array.isArray(data) ? data : [])
    .filter((c) => c.latitude && c.longitude && c.isOnline !== false)
    .map((c) => ({
      id: `nyc_${c.id}`,
      name: c.name || c.area || String(c.id),
      lat: c.latitude,
      lon: c.longitude,
      imageUrl: c.imageUrl || `https://webcams.nyctmc.org/api/cameras/${c.id}/image`,
      city: 'New York',
      country: 'US',
    }))
    .slice(0, 350)
}

// ── Source 3: Ontario 511 — Canada highway cameras
async function fetchOntario() {
  const r = await fetch('/proxy/cctv-ontario')
  if (!r.ok) throw new Error(`Ontario HTTP ${r.status}`)
  const data = await r.json()
  const cams = Array.isArray(data) ? data : (data.cameras || data.Cameras || [])
  return cams
    .filter((c) => (c.Latitude || c.latitude) && (c.Longitude || c.longitude))
    .map((c) => {
      const imgUrl = c.Url || c.url || c.ImageUrl || c.imageUrl || null
      if (!imgUrl) return null
      return {
        id: `on_${c.Id || c.id || Math.random()}`,
        name: c.Name || c.name || c.RoadwayName || 'Highway Camera',
        lat: c.Latitude || c.latitude,
        lon: c.Longitude || c.longitude,
        imageUrl: imgUrl,
        city: c.CityName || c.cityName || 'Ontario',
        country: 'Canada',
      }
    })
    .filter(Boolean)
    .slice(0, 300)
}

// ── Source 4: WSDOT — Washington State highway cameras
async function fetchWSDOT() {
  const r = await fetch('/proxy/cctv-wsdot')
  if (!r.ok) throw new Error(`WSDOT HTTP ${r.status}`)
  const data = await r.json()
  const list = Array.isArray(data) ? data : (data.Cameras || data.cameras || [])
  return list
    .filter((c) => (c.IsActive !== false) && (c.DisplayLatitude != null) && (c.DisplayLongitude != null) && c.ImageURL)
    .map((c) => ({
      id: `wsdot_${c.CameraID || c.CameraId || Math.random()}`,
      name: c.Title || c.Description || c.CameraLocation?.Description || 'WSDOT Camera',
      lat: c.DisplayLatitude ?? c.CameraLocation?.Latitude,
      lon: c.DisplayLongitude ?? c.CameraLocation?.Longitude,
      imageUrl: c.ImageURL,
      city: c.Region || 'Washington',
      country: 'US',
    }))
    .filter((c) => c.lat != null && c.lon != null)
    .slice(0, 350)
}

// ── Source 5: OpenTrafficCamMap — worldwide crowdsourced list (USA, GBR, CAN, AUS, etc.)
function flattenOTCMap(obj, countryCode, countryName, list = []) {
  if (!obj || typeof obj !== 'object') return list
  if (Array.isArray(obj)) {
    obj.forEach((c) => {
      if (c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && c.url) {
        const enc = (c.encoding || c.format || '').toUpperCase()
        const isImage = /JPEG|IMAGE|PNG|JPG/i.test(enc) || c.format === 'IMAGE_STREAM' || (c.updateRate != null)
        if (isImage || /\.(jpg|jpeg|png|gif)(\?|$)/i.test(c.url)) {
          list.push({
            id: `otc_${countryCode}_${list.length}_${Math.random().toString(36).slice(2, 9)}`,
            name: (c.description || c.direction || 'Camera').slice(0, 60),
            lat: c.latitude,
            lon: c.longitude,
            imageUrl: c.url,
            city: countryName,
            country: countryCode === 'USA' ? 'US' : countryCode === 'GBR' ? 'UK' : countryCode.slice(0, 2),
          })
        }
      }
    })
    return list
  }
  Object.values(obj).forEach((v) => flattenOTCMap(v, countryCode, countryName, list))
  return list
}

async function fetchOTC(countryCode, countryName) {
  try {
    const r = await fetch(`/proxy/otc/${countryCode}.json`)
    if (!r.ok) return []
    const data = await r.json()
    return flattenOTCMap(data, countryCode, countryName).slice(0, 400)
  } catch {
    return []
  }
}

// ── Fetch all sources in parallel; use proxy for CORS-prone APIs
const SOURCES = [
  () => fetchLondon().catch((e) => { console.warn('[CCTV London]', e.message); return [] }),
  () => fetchNYC().catch((e) => { console.warn('[CCTV NYC]', e.message); return [] }),
  () => fetchOntario().catch((e) => { console.warn('[CCTV Ontario]', e.message); return [] }),
  () => fetchWSDOT().catch((e) => { console.warn('[CCTV WSDOT]', e.message); return [] }),
  () => fetchOTC('USA', 'United States').catch((e) => { console.warn('[CCTV OTC USA]', e.message); return [] }),
  () => fetchOTC('GBR', 'United Kingdom').catch((e) => { console.warn('[CCTV OTC GBR]', e.message); return [] }),
  () => fetchOTC('CAN', 'Canada').catch((e) => { console.warn('[CCTV OTC CAN]', e.message); return [] }),
  () => fetchOTC('AUS', 'Australia').catch((e) => { console.warn('[CCTV OTC AUS]', e.message); return [] }),
  () => fetchOTC('DEU', 'Germany').catch((e) => { console.warn('[CCTV OTC DEU]', e.message); return [] }),
  () => fetchOTC('FRA', 'France').catch((e) => { console.warn('[CCTV OTC FRA]', e.message); return [] }),
]

export function useCCTV(enabled) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setCameras([])
      return
    }
    setLoading(true)
    Promise.all(SOURCES.map((fn) => fn())).then((results) => {
      const all = results.flat()
      const seen = new Set()
      const deduped = all.filter((c) => {
        const key = `${c.lat?.toFixed(4)}_${c.lon?.toFixed(4)}_${c.imageUrl?.slice(0, 40)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setCameras(deduped)
      setError(deduped.length === 0 ? 'All camera sources unreachable' : null)
    }).finally(() => setLoading(false))
  }, [enabled])

  return { cameras, loading, error, count: cameras.length }
}
