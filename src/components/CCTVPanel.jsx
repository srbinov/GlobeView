import { useState, useEffect, useCallback } from 'react'

export default function CCTVPanel({ camera, onClose }) {
  const [ts,       setTs]       = useState(Date.now())
  const [imgError, setImgError] = useState(false)
  const [frameNum, setFrameNum] = useState(0)

  // Refresh every 2 seconds so the feed feels live (most DOT cams update every 30–60s)
  useEffect(() => {
    if (!camera) return
    setTs(Date.now())
    setImgError(false)
    setFrameNum(0)

    const id = setInterval(() => {
      setTs(Date.now())
      setImgError(false)
      setFrameNum((n) => n + 1)
    }, 2000)
    return () => clearInterval(id)
  }, [camera?.id])

  const handleKey = useCallback(e => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!camera) return null

  // Cache-bust every refresh so we always get the latest frame from the server
  const imgSrc = `${camera.imageUrl}?t=${ts}`

  return (
    // Full-screen backdrop — click outside to close
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, pointerEvents: 'all',
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* Panel — stop click-through */}
      <div
        onClick={e => e.stopPropagation()}
        className="panel"
        style={{
          padding: 0,
          border: '1px solid rgba(255,45,45,0.6)',
          boxShadow: '0 0 60px rgba(255,45,45,0.2), 0 0 120px rgba(0,0,0,0.9)',
          width: 'min(94vw, 1200px)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="panel-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span className="blink-fast" style={{ color: '#ff2d2d', fontSize: 10 }}>●</span>
            <span style={{ color: '#ff2d2d', fontSize: 9, letterSpacing: '0.15em' }}>
              LIVE CCTV · {camera.city.toUpperCase()}, {camera.country.toUpperCase()}
            </span>
            <span style={{ color: 'rgba(255,45,45,0.35)', fontSize: 8, letterSpacing: '0.08em' }}>
              FRAME #{String(frameNum).padStart(4, '0')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,45,45,0.6)', fontSize: 14,
              fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}
          >
            [ESC ×]
          </button>
        </div>

        {/* ── Camera name ────────────────────────────────────── */}
        <div style={{ padding: '7px 14px 5px', borderBottom: '1px solid rgba(255,45,45,0.15)', flexShrink: 0 }}>
          <div style={{ fontSize: 15, color: 'var(--c-green)', letterSpacing: '0.04em', lineHeight: 1.3 }}>
            {camera.name}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,45,45,0.45)', letterSpacing: '0.1em', marginTop: 3, display: 'flex', gap: 14 }}>
            <span>{camera.lat?.toFixed(5)}°  {camera.lon?.toFixed(5)}°</span>
            <span style={{ color: 'rgba(255,45,45,0.3)' }}>{camera.id}</span>
          </div>
        </div>

        {/* ── Live image ─────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#030303',
            overflow: 'hidden',
            minHeight: '55vh',
          }}
        >
          {!imgError ? (
            <img
              key={ts}
              src={imgSrc}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              alt={camera.name}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, color: 'rgba(255,45,45,0.35)',
            }}>
              <div style={{ fontSize: 48, opacity: 0.2, lineHeight: 1 }}>◈</div>
              <div style={{ fontSize: 13, letterSpacing: '0.12em' }}>FEED UNAVAILABLE</div>
              <div style={{ fontSize: 8, opacity: 0.6, letterSpacing: '0.08em' }}>
                AUTO-RETRY IN {5 - (Math.floor((Date.now() - ts) / 1000) % 5)}s
              </div>
            </div>
          )}

          {/* CRT scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 3px)',
          }} />

          {/* ◉ REC badge */}
          <div
            className="blink-fast"
            style={{
              position: 'absolute', top: 12, left: 14,
              fontSize: 9, color: '#ff2d2d', letterSpacing: '0.14em',
              background: 'rgba(0,0,0,0.75)', padding: '3px 8px',
              border: '1px solid rgba(255,45,45,0.4)',
            }}
          >
            ● REC
          </div>

          {/* Timestamp overlay */}
          <div style={{
            position: 'absolute', bottom: 12, right: 14,
            fontSize: 9, color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.72)', padding: '3px 8px',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {new Date(ts).toISOString().replace('T', '  ').slice(0, 22)} UTC
          </div>

          {/* Refresh indicator bottom-left */}
          <div style={{
            position: 'absolute', bottom: 12, left: 14,
            fontSize: 8, color: 'rgba(255,45,45,0.5)',
            background: 'rgba(0,0,0,0.72)', padding: '3px 8px',
            letterSpacing: '0.08em',
          }}>
            ↻ LIVE · 2s REFRESH
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{
          padding: '6px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 7, letterSpacing: '0.09em', color: 'rgba(255,45,45,0.4)',
          flexShrink: 0, gap: 12,
        }}>
          <span>
            {camera.country === 'UK'     ? 'TfL JamCam · Transport for London' :
             camera.country === 'US'     ? (camera.city === 'Washington' ? 'WSDOT · Washington State DOT' : 'NYC DOT · Traffic Management Center') :
             camera.country === 'Canada' ? 'Ontario 511 · Highway Safety Cameras' :
             camera.country === 'AU' ? 'OpenTrafficCamMap · Australia' :
             'PUBLIC CCTV FEED'}
          </span>
          <a
            href={camera.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,45,45,0.45)', textDecoration: 'none', letterSpacing: '0.1em' }}
          >
            ↗ RAW FEED
          </a>
        </div>
      </div>
    </div>
  )
}
