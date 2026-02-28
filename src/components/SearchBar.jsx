import { useState, useRef, useCallback, useEffect } from 'react'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

// ── Pick globe altitude based on result type (mirrors Google Earth zoom behaviour)
export function resultAltitude(r) {
  const type = r.type || ''
  if (type === 'country')                             return 1.8
  if (type === 'state'   || type === 'region')        return 0.9
  if (type === 'city'    || type === 'town')          return 0.09
  if (type === 'suburb'  || type === 'neighbourhood') return 0.05
  const cls = r.class || ''
  if (cls === 'amenity'  || cls === 'building' ||
      cls === 'shop'     || cls === 'tourism')        return 0.04
  return 0.09   // sensible default (city-level, triggers overlay)
}

// ── Small icon per result class
function typeIcon(r) {
  const cls = r.class || ''
  if (cls === 'place')    return '◉'
  if (cls === 'highway')  return '⟋'
  if (cls === 'amenity')  return '▪'
  if (cls === 'building') return '▦'
  if (cls === 'tourism')  return '◆'
  if (cls === 'shop')     return '◈'
  return '◈'
}

// Trim display_name into first line (city/POI) + second line (region/country)
function splitName(displayName) {
  const parts = displayName.split(',').map(s => s.trim())
  return {
    primary:   parts.slice(0, 2).join(', '),
    secondary: parts.slice(2).join(', ').slice(0, 70),
  }
}

const MONO = "'JetBrains Mono','Courier New',monospace"

// ── SearchBar ────────────────────────────────────────────────────────────────
export default function SearchBar({ onSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [cursor,  setCursor]  = useState(-1)

  const inputRef    = useRef(null)
  const debounceRef = useRef(null)
  const abortRef    = useRef(null)
  const wrapRef     = useRef(null)

  const doSearch = useCallback(async q => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    try {
      const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=7&addressdetails=0`
      const res  = await fetch(url, { signal: ac.signal })
      const data = await res.json()
      setResults(data)
      setOpen(true)
      setCursor(-1)
    } catch (e) {
      if (e.name !== 'AbortError') setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = e => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 380)
  }

  const pick = useCallback(r => {
    const { primary } = splitName(r.display_name)
    setQuery(primary)
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
    onSelect?.({
      lat:  parseFloat(r.lat),
      lng:  parseFloat(r.lon),
      name: r.display_name,
      alt:  resultAltitude(r),
    })
  }, [onSelect])

  const handleKeyDown = e => {
    if (!open || !results.length) {
      if (e.key === 'Enter' && query.trim()) doSearch(query)
      return
    }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter')     { if (cursor >= 0) pick(results[cursor]); else if (results[0]) pick(results[0]) }
    else if (e.key === 'Escape')    { setOpen(false); setResults([]); inputRef.current?.blur() }
  }

  const clear = () => {
    setQuery(''); setResults([]); setOpen(false)
    abortRef.current?.abort()
    inputRef.current?.focus()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false) } }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const showDrop = open && results.length > 0

  return (
    <div
      ref={wrapRef}
      style={{
        position:  'fixed',
        top:       14,
        right:     226,          // clears the 210px RightPanel + 16px gap
        width:     290,
        zIndex:    300,
        fontFamily: MONO,
      }}
    >
      {/* ── Input row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,6,0,0.96)',
        border: `1px solid ${open ? 'rgba(0,255,65,0.7)' : 'rgba(0,255,65,0.35)'}`,
        padding: '6px 10px',
        transition: 'border-color .2s',
        boxShadow: open ? '0 0 12px rgba(0,255,65,0.12)' : 'none',
      }}>
        <span style={{
          fontSize: 14, flexShrink: 0, lineHeight: 1,
          color: loading ? '#ffb000' : 'rgba(0,255,65,0.55)',
        }}>
          {loading ? '◌' : '⌕'}
        </span>

        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query) { setOpen(true); if (!results.length) doSearch(query) } }}
          placeholder="SEARCH LOCATION..."
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#00ff41', fontFamily: MONO,
            fontSize: 11, letterSpacing: '0.07em',
          }}
        />

        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); clear() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(0,255,65,0.4)', fontSize: 13, padding: 0, lineHeight: 1,
            }}
          >✕</button>
        )}
      </div>

      {/* ── Dropdown */}
      {showDrop && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'rgba(0,6,0,0.97)',
          border: '1px solid rgba(0,255,65,0.3)', borderTop: 'none',
          maxHeight: 340, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        }}>
          {results.map((r, i) => {
            const { primary, secondary } = splitName(r.display_name)
            const active = i === cursor
            return (
              <div
                key={r.place_id}
                onMouseDown={e => { e.preventDefault(); pick(r) }}
                onMouseEnter={() => setCursor(i)}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid rgba(0,255,65,0.07)',
                  cursor: 'pointer',
                  background: active ? 'rgba(0,255,65,0.1)' : 'transparent',
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  transition: 'background .1s',
                }}
              >
                <span style={{
                  fontSize: 10, color: active ? '#ffb000' : 'rgba(255,176,0,0.6)',
                  flexShrink: 0, marginTop: 2, lineHeight: 1,
                }}>
                  {typeIcon(r)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, color: active ? '#00ff41' : 'rgba(0,255,65,0.85)',
                    letterSpacing: '0.04em', fontFamily: MONO,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {primary}
                  </div>
                  {secondary && (
                    <div style={{
                      fontSize: 8, color: 'rgba(0,255,65,0.38)',
                      letterSpacing: '0.05em', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {secondary}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
