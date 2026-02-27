import { useCallback, useEffect, useState } from 'react'

const PANEL_LEFT = 228
const PANEL_WIDTH = 320

export default function NewsPanel({ news, loading, error, selectedNews, onSelectNews, onClose, pinScreenPosition }) {
  const [panelAnchor, setPanelAnchor] = useState({ x: PANEL_LEFT + PANEL_WIDTH, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 })

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

  const display = selectedNews || (news && news[0]) || null
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
              <span className="blink-fast" style={{ color: '#ffb000', fontSize: 10 }}>●</span>
              <span style={{ color: '#ffb000', fontSize: 9, letterSpacing: '0.15em' }}>NEWS FEEDS</span>
              <span style={{ color: 'rgba(255,176,0,0.5)', fontSize: 8 }}>GNews API</span>
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

          {/* Broadcast / video-style frame for selected story */}
          {display && (
            <div
              style={{
                padding: 10,
                borderBottom: '1px solid rgba(255,176,0,0.2)',
                background: 'rgba(0,8,0,0.6)',
              }}
            >
              <div style={{ fontSize: '7px', color: 'rgba(255,176,0,0.6)', letterSpacing: '0.12em', marginBottom: 6 }}>
                ── LIVE FEED ── {display.country && `· ${display.country.toUpperCase()}`}
              </div>
              <div
                style={{
                  minHeight: 72,
                  border: '1px solid rgba(255,176,0,0.35)',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ color: '#ffb000', fontSize: 11, lineHeight: 1.4, marginBottom: 6 }}>
                  {display.title}
                </div>
                {display.description && (
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, lineHeight: 1.4 }}>
                    {display.description.slice(0, 140)}{display.description.length > 140 ? '…' : ''}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 8, color: 'rgba(255,176,0,0.5)' }}>
                  {display.source} · {display.publishedAt ? new Date(display.publishedAt).toLocaleString() : ''}
                </div>
                {display.url && (
                  <a
                    href={display.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      marginTop: 6,
                      fontSize: 8,
                      color: '#ffb000',
                      letterSpacing: '0.06em',
                    }}
                  >
                    OPEN SOURCE →
                  </a>
                )}
              </div>
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
              ── ALL FEEDS (click to link to location) ──
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
