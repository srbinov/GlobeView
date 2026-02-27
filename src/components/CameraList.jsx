import { useState, useMemo, useEffect, useCallback } from 'react'

const CITY_TABS = [
  { key: 'ALL',        label: 'ALL',    col: '#ff2d2d' },
  { key: 'London',     label: 'LON',    col: '#ff2d2d' },
  { key: 'New York',   label: 'NYC',    col: '#ff8c00' },
  { key: 'Ontario',    label: 'ONT',    col: '#ffd700' },
]

export default function CameraList({ cameras, loading, onSelect, onClose }) {
  const [city,  setCity]  = useState('ALL')
  const [query, setQuery] = useState('')

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cameras
      .filter(c => city === 'ALL' || c.city === city)
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  }, [cameras, city, query])

  // Group counts per city
  const counts = useMemo(() => {
    const m = { ALL: cameras.length }
    cameras.forEach(c => { m[c.city] = (m[c.city] || 0) + 1 })
    return m
  }, [cameras])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 220, bottom: 0,
      width: 270, zIndex: 200, pointerEvents: 'all',
    }}>
      <div className="panel" style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: 0, border: '1px solid rgba(255,45,45,0.45)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.6)',
      }}>

        {/* ── Header */}
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#ff2d2d', fontSize: 9, letterSpacing: '0.15em' }}>◈ CAMERA BROWSER</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,45,45,0.6)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>[×]</button>
        </div>

        {/* ── Status bar */}
        <div style={{
          padding: '4px 10px', fontSize: 8, letterSpacing: '0.08em', flexShrink: 0,
          color: 'rgba(255,45,45,0.5)', borderBottom: '1px solid rgba(255,45,45,0.12)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{loading ? 'LOADING FEEDS…' : `${cameras.length} FEEDS ONLINE`}</span>
          {filtered.length !== cameras.length && (
            <span style={{ color: '#ff2d2d' }}>{filtered.length} SHOWN</span>
          )}
        </div>

        {/* ── City filter tabs */}
        <div style={{ display: 'flex', gap: 3, padding: '6px 8px', flexShrink: 0 }}>
          {CITY_TABS.map(tab => {
            const cnt = tab.key === 'ALL' ? counts.ALL : counts[tab.key] || 0
            const active = city === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setCity(tab.key)}
                style={{
                  flex: 1, fontSize: 7, padding: '4px 2px',
                  background: active ? `rgba(${tab.col === '#ff2d2d' ? '255,45,45' : tab.col === '#ff8c00' ? '255,140,0' : '255,215,0'},0.18)` : 'rgba(0,0,0,0.4)',
                  border: `1px solid ${active ? tab.col : 'rgba(255,45,45,0.15)'}`,
                  color: active ? tab.col : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em', lineHeight: 1.4,
                }}
              >
                <div>{tab.label}</div>
                <div style={{ fontSize: 6, opacity: 0.7 }}>{cnt}</div>
              </button>
            )
          })}
        </div>

        {/* ── Search box */}
        <div style={{ padding: '0 8px 6px', flexShrink: 0 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SEARCH CAMERAS…"
            spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,45,45,0.06)',
              border: '1px solid rgba(255,45,45,0.25)',
              color: 'var(--c-green)',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              padding: '5px 9px', letterSpacing: '0.05em',
              outline: 'none',
            }}
          />
        </div>

        {/* ── Camera list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && cameras.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 9, color: 'rgba(255,45,45,0.35)', letterSpacing: '0.1em' }}>
              <div className="blink-fast">● SCANNING FEEDS…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 9, color: 'rgba(255,45,45,0.3)', letterSpacing: '0.08em' }}>
              NO FEEDS MATCH
            </div>
          ) : filtered.map((c, i) => {
            const col = c.country === 'US' ? '#ff8c00' : c.country === 'Canada' ? '#ffd700' : '#ff2d2d'
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                style={{
                  width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', padding: '6px 10px',
                  background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(255,45,45,0.07)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,45,45,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0 }}>
                  <span style={{ color: col, fontSize: 8, flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: 9, color: 'var(--c-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ fontSize: 7, color: 'rgba(255,45,45,0.38)', marginTop: 2, marginLeft: 14, letterSpacing: '0.06em' }}>
                  {c.city} · {c.country}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Footer hint */}
        <div style={{
          padding: '5px 10px', borderTop: '1px solid rgba(255,45,45,0.12)',
          fontSize: 7, color: 'rgba(255,45,45,0.3)', letterSpacing: '0.08em', flexShrink: 0,
        }}>
          CLICK ANY FEED TO VIEW LIVE · ESC TO CLOSE
        </div>
      </div>
    </div>
  )
}
