import { useState, useEffect, useCallback } from 'react'

// GNews API: https://gnews.io/docs/v4 — free tier has strict rate limits (429).
// Use a single Search request instead of many country requests to avoid 429.
const API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GNEWS_API_KEY
const SEARCH_URL = 'https://gnews.io/api/v4/search'

// Regions to spread pins across (when using search we don't have per-article country)
const REGIONS = [
  { lat: 38.9, lng: -77.0, label: 'United States' },
  { lat: 51.5, lng: -0.1, label: 'United Kingdom' },
  { lat: 28.6, lng: 77.2, label: 'India' },
  { lat: -33.9, lng: 151.2, label: 'Australia' },
  { lat: 52.5, lng: 13.4, label: 'Europe' },
  { lat: 35.7, lng: 139.7, label: 'Japan' },
  { lat: -23.5, lng: -46.6, label: 'Brazil' },
]

function buildSearchUrl() {
  const params = new URLSearchParams({
    apikey: API_KEY || '',
    q: 'world OR news OR headline',
    lang: 'en',
    max: '25',
    sortby: 'publishedAt',
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
        setError('Rate limit (429). Free tier allows limited requests — try again in 15–30 min.')
        setItems([])
        setLoading(false)
        return
      }
      if (!r.ok) {
        throw new Error(`GNews ${r.status}`)
      }
      const data = await r.json()
      const articles = data.articles || []
      const merged = articles.map((a, i) => {
        const region = REGIONS[i % REGIONS.length]
        return {
          id: `news-${i}-${a.url || Date.now()}`,
          title: a.title || 'No title',
          description: a.description || '',
          source: a.source?.name || 'News',
          url: a.url || '',
          publishedAt: a.publishedAt || new Date().toISOString(),
          image: a.image || null,
          lat: region.lat,
          lng: region.lng,
          country: region.label,
        }
      })
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
