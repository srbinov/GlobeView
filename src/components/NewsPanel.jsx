import { useCallback, useEffect, useState, useMemo } from 'react'

const PANEL_LEFT = 228
const PANEL_WIDTH = 320

// Map GNews source name → that outlet's official live broadcast (YouTube embed ID or direct live URL).
// Normalized by lowercasing; we match by prefix/substring so "BBC News" and "BBC" both match.
const SOURCE_LIVE = [
  { keys: ['al jazeera', 'aljazeera'], ytId: 'gCNeDWCI0vo', label: 'Al Jazeera English' },
  { keys: ['bbc news', 'bbc'], ytId: null, liveUrl: 'https://www.bbc.com/watch-live-news', label: 'BBC News' },
  { keys: ['cnn'], ytId: null, liveUrl: 'https://www.cnn.com/live', label: 'CNN' },
  { keys: ['nbc news', 'nbc'], ytId: '5pjjyyj83r4', label: 'NBC News NOW' },
  { keys: ['cbs news', 'cbs'], ytId: '03zp9JvMLb4', label: 'CBS News 24/7' },
  { keys: ['sky news', 'sky'], ytId: '9Auq9mYxFEE', label: 'Sky News' },
  { keys: ['dw news', 'dw '], ytId: 'tZT2MCYu6Zw', label: 'DW News' },
  { keys: ['reuters'], ytId: 'wQO2CQn2Lcg', label: 'Reuters' },
  { keys: ['msnbc'], ytId: 'L-5NfNfdJ_c', label: 'MSNBC' },
  { keys: ['abc news', 'abc news'], ytId: 'w_Ma8oQLmSM', label: 'ABC News Live' },
  { keys: ['fox news', 'fox'], ytId: 'XWqYRpJ6Bco', label: 'Fox News' },
  { keys: ['france 24', 'france 24'], ytId: 'h3MuIUNCCzY', label: 'France 24' },
  { keys: ['wion'], ytId: 'VqQePvPvP3k', label: 'WION' },
]
function getLiveForSource(sourceName) {
  if (!sourceName || typeof sourceName !== 'string') return null
  const normalized = sourceName.toLowerCase().trim()
  for (const entry of SOURCE_LIVE) {
    for (const key of entry.keys) {
      if (normalized.includes(key) || key.includes(normalized)) {
        if (entry.ytId) return { ytId: entry.ytId, label: entry.label, liveUrl: null }
        if (entry.liveUrl) return { ytId: null, label: entry.label, liveUrl: entry.liveUrl }
      }
    }
  }
  return null
}

export default function NewsPanel({ news, loading, error, selectedNews, onSelectNews, onClose, pinScreenPosition }) {
  const [panelAnchor, setPanelAnchor] = useState({ x: PANEL_LEFT + PANEL_WIDTH, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 })
  const display = selectedNews || (news && news[0]) || null
  const live = useMemo(() => (display ? getLiveForSource(display.source) : null), [display?.source])
  const liveId = live?.ytId ?? null
  const liveUrlOnly = live?.liveUrl ?? null
  const liveLabel = live?.label ?? display?.source ?? null

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    const onResize = () => setPanelAnchor({ x: PANEL_LEFT + PANEL_WIDTH, y: window.innerHeight / 2 })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const hasPin = pinScreenPosition && typeof pinScreenPosition.x === 'number' && typeof pinScreenPosition.y === 'number'

  return (
    <>
      {/* Connector line: from panel to pin on globe */}
      {hasPin && display && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 90,
          }}
        >
          <defs>
            <linearGradient id="news-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,176,0,0.9)" />
              <stop offset="100%" stopColor="rgba(255,176,0,0.2)" />
            </linearGradient>
          </defs>
          <line
            x1={pinScreenPosition.x}
            y1={pinScreenPosition.y}
            x2={panelAnchor.x}
            y2={panelAnchor.y}
            stroke="url(#news-line-grad)"
            strokeWidth={1.5}
            strokeDasharray="4 6"
          />
        </svg>
      )}

      <div
        style={{
          position: 'fixed',
          left: 228,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 320,
          maxHeight: '70vh',
          zIndex: 95,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'all',
        }}
      >
        <div
          className="panel"
          style={{
            border: '1px solid rgba(255,176,0,0.5)',
            boxShadow: '0 0 30px rgba(255,176,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="panel-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              borderBottom: '1px solid rgba(255,176,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="blink-fast" style={{ color: '#cc0000', fontSize: 10 }}>●</span>
              <span style={{ color: '#ffb000', fontSize: 9, letterSpacing: '0.15em' }}>LIVE BROADCAST</span>
              <span style={{ color: 'rgba(255,176,0,0.5)', fontSize: 8 }}>Real feed · Click headline → location</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,176,0,0.7)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>

          {/* Live broadcast — from the same outlet as the selected story */}
          <div
            style={{
              padding: 8,
              borderBottom: '1px solid rgba(255,176,0,0.2)',
              background: 'rgba(0,8,0,0.6)',
            }}
          >
            <div style={{ fontSize: '7px', color: '#cc0000', letterSpacing: '0.12em', marginBottom: 6 }}>
              ── {liveLabel ? `LIVE: ${liveLabel}` : 'LIVE FEED'} ──
            </div>
            {liveId ? (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  title={`Live: ${liveLabel || 'news'}`}
                  src={`https://www.youtube.com/embed/${liveId}?autoplay=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: '1px solid rgba(255,176,0,0.3)',
                  }}
                />
              </div>
            ) : liveUrlOnly ? (
              <div style={{ padding: 16, textAlign: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,176,0,0.3)' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>No embed — watch on their site</div>
                <a
                  href={liveUrlOnly}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 10, color: '#ffb000', letterSpacing: '0.08em' }}
                >
                  WATCH LIVE → {liveLabel}
                </a>
              </div>
            ) : display ? (
              <div style={{ padding: 16, textAlign: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,176,0,0.3)', fontSize: 9, color: 'rgba(255,176,0,0.8)' }}>
                No live feed for <strong>{display.source}</strong>. Open article below for story.
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 9, color: 'rgba(255,176,0,0.6)' }}>
                Select a headline — live feed will show that outlet’s broadcast.
              </div>
            )}
          </div>

          {/* Selected story summary — compact */}
          {display && (
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid rgba(255,176,0,0.2)',
                background: 'rgba(0,8,0,0.4)',
              }}
            >
              <div style={{ fontSize: '7px', color: 'rgba(255,176,0,0.6)', letterSpacing: '0.08em', marginBottom: 4 }}>
                HEADLINE · {display.country && `${display.country.toUpperCase()} · `}{display.source}
              </div>
              <div style={{ color: '#ffb000', fontSize: 10, lineHeight: 1.35, marginBottom: 4 }}>
                {display.title}
              </div>
              {display.url && (
                <a
                  href={display.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 8, color: 'rgba(255,176,0,0.8)', letterSpacing: '0.06em' }}
                >
                  OPEN SOURCE →
                </a>
              )}
            </div>
          )}

          {/* List of feeds — click to select and show line to pin */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {error && (
              <div style={{ padding: '10px 12px', margin: '0 10px 8px', background: 'rgba(255,45,0,0.1)', border: '1px solid rgba(255,45,0,0.4)', fontSize: 9, color: '#ff6b6b' }}>
                {error}
              </div>
            )}
            {loading && !error && (
              <div style={{ padding: '8px 12px', fontSize: 8, color: 'rgba(255,176,0,0.5)' }}>Loading headlines…</div>
            )}
            <div style={{ padding: '4px 10px', fontSize: '8px', color: 'rgba(255,176,0,0.4)', letterSpacing: '0.1em' }}>
              ── HEADLINES (click to link to globe location) ──
            </div>
            {(news || []).map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectNews(item)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  background: selectedNews?.id === item.id ? 'rgba(255,176,0,0.12)' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${selectedNews?.id === item.id ? '#ffb000' : 'transparent'}`,
                  color: selectedNews?.id === item.id ? 'var(--c-amber)' : 'rgba(255,255,255,0.85)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  cursor: 'pointer',
                  lineHeight: 1.35,
                }}
              >
                <span style={{ color: 'rgba(255,176,0,0.6)', fontSize: 7, letterSpacing: '0.08em' }}>
                  {item.country || item.source}
                </span>
                <div style={{ marginTop: 2 }}>{(item.title || '').slice(0, 70)}{(item.title || '').length > 70 ? '…' : ''}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
