import { useState, useEffect, useCallback } from 'react'

// GNews API: https://gnews.io/docs/v4 — real search, real articles only. High-impact news only.
const API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GNEWS_API_KEY
const SEARCH_URL = 'https://gnews.io/api/v4/search'

// Real coordinates for real places — used to pin each article to the location it's about (parsed from title/description).
const PLACE_COORDS = [
  { keys: ['iran', 'tehran'], lat: 35.6892, lng: 51.3890, label: 'Iran' },
  { keys: ['israel', 'gaza', 'tel aviv', 'jerusalem', 'hamas', 'hezbollah'], lat: 31.7683, lng: 35.2137, label: 'Israel' },
  { keys: ['gaza', 'palestine', 'west bank'], lat: 31.5017, lng: 34.4668, label: 'Gaza' },
  { keys: ['ukraine', 'kyiv', 'kiev', 'russia', 'moscow', 'donbas', 'zelensky', 'putin'], lat: 50.4501, lng: 30.5234, label: 'Ukraine' },
  { keys: ['syria', 'damascus', 'idlib'], lat: 33.5138, lng: 36.2765, label: 'Syria' },
  { keys: ['afghanistan', 'kabul', 'taliban'], lat: 34.5553, lng: 69.2075, label: 'Afghanistan' },
  { keys: ['yemen', 'sanaa', 'houthi'], lat: 15.3694, lng: 44.1910, label: 'Yemen' },
  { keys: ['taiwan', 'china', 'beijing', 'xi jinping'], lat: 25.0330, lng: 121.5654, label: 'Taiwan' },
  { keys: ['north korea', 'pyongyang', 'kim jong'], lat: 39.0392, lng: 125.7625, label: 'North Korea' },
  { keys: ['united states', 'usa', 'u.s.', 'america', 'washington', 'dc', 'biden', 'trump', 'shooting', 'mass shooting'], lat: 38.9072, lng: -77.0369, label: 'United States' },
  { keys: ['france', 'paris'], lat: 48.8566, lng: 2.3522, label: 'France' },
  { keys: ['united kingdom', 'uk', 'britain', 'london'], lat: 51.5074, lng: -0.1278, label: 'United Kingdom' },
  { keys: ['india', 'delhi', 'mumbai', 'modi'], lat: 28.6139, lng: 77.2090, label: 'India' },
  { keys: ['pakistan', 'islamabad'], lat: 33.6844, lng: 73.0479, label: 'Pakistan' },
  { keys: ['iraq', 'baghdad'], lat: 33.3152, lng: 44.3661, label: 'Iraq' },
  { keys: ['lebanon', 'beirut'], lat: 33.8938, lng: 35.5018, label: 'Lebanon' },
  { keys: ['ethiopia', 'sudan', 'sahel'], lat: 9.0320, lng: 38.7469, label: 'Ethiopia' },
  { keys: ['nigeria', 'lagos'], lat: 6.5244, lng: 3.3792, label: 'Nigeria' },
  { keys: ['earthquake', 'turkey', 'türkiye', 'turkiye'], lat: 39.9334, lng: 32.8597, label: 'Turkey' },
  { keys: ['myanmar', 'burma', 'rohingya'], lat: 19.7633, lng: 96.0785, label: 'Myanmar' },
  { keys: ['mexico', 'cartel'], lat: 19.4326, lng: -99.1332, label: 'Mexico' },
  { keys: ['haiti', 'port-au-prince'], lat: 18.5944, lng: -72.3074, label: 'Haiti' },
  { keys: ['saudi', 'riyadh', 'uae', 'dubai', 'qatar'], lat: 24.7136, lng: 46.6753, label: 'Saudi Arabia' },
  { keys: ['nato', 'europe', 'eu'], lat: 50.8503, lng: 4.3517, label: 'Europe' },
]

function inferPlace(title, description) {
  const text = `${(title || '')} ${(description || '')}`.toLowerCase()
  for (const place of PLACE_COORDS) {
    for (const key of place.keys) {
      if (text.includes(key)) {
        return { lat: place.lat, lng: place.lng, label: place.label }
      }
    }
  }
  return null
}

// Single real GNews search — high-impact terms only. Returns real articles; we pin by inferred location.
function buildSearchUrl() {
  const q = 'war OR conflict OR attack OR Iran OR Israel OR Gaza OR Ukraine OR shooting OR explosion OR crisis OR disaster OR death OR terrorist OR military OR bombing'
  const params = new URLSearchParams({
    apikey: API_KEY || '',
    q,
    lang: 'en',
    max: '30',
    sortby: 'publishedAt',
    in: 'title,description',
  })
  return `${SEARCH_URL}?${params.toString()}`
}

export function useNews(enabled) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchNews = useCallback(async () => {
    if (!enabled) return
    if (!API_KEY || !API_KEY.trim()) {
      setError('Missing VITE_GNEWS_API_KEY in .env — get a free key at gnews.io')
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(buildSearchUrl())
      if (r.status === 429) {
        setError('Rate limit (429). Try again in 15–30 min.')
        setItems([])
        setLoading(false)
        return
      }
      if (!r.ok) {
        throw new Error(`GNews ${r.status}`)
      }
      const data = await r.json()
      const articles = (data.articles || []).filter(Boolean)
      const merged = []
      const seen = new Set()
      for (const a of articles) {
        const url = a.url || ''
        if (seen.has(url)) continue
        seen.add(url)
        const place = inferPlace(a.title, a.description)
        if (!place) continue
        merged.push({
          id: `news-${merged.length}-${(url || a.title || '').slice(0, 40)}`,
          title: a.title || 'No title',
          description: a.description || '',
          source: a.source?.name || 'News',
          url: url || '',
          publishedAt: a.publishedAt || new Date().toISOString(),
          image: a.image || null,
          lat: place.lat,
          lng: place.lng,
          country: place.label,
        })
      }
      setItems(merged)
    } catch (err) {
      setError(err.message || 'Failed to load news')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchNews()
    if (!enabled) return
    const interval = setInterval(fetchNews, 20 * 60 * 1000)
    return () => clearInterval(interval)
  }, [enabled, fetchNews])

  return {
    news: items,
    loading,
    error,
    count: items.length,
    refetch: fetchNews,
  }
}
