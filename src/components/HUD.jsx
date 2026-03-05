import { useState, useEffect } from 'react'

function fmt2(n) { return String(n).padStart(2, '0') }
function fmtCoord(val, pos, neg) {
  const d = Math.abs(val).toFixed(4)
  return `${d}° ${val >= 0 ? pos : neg}`
}

export default function HUD({ hudMode, viewMode, flights }) {
  const [time, setTime] = useState(new Date())
  const [coords, setCoords] = useState({ lat: 37.7749, lon: -122.4194, alt: 512000 })
  const [rec, setRec] = useState(true)
  const [frameCount, setFrameCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date())
      setFrameCount(f => f + 1)
      // Slowly drift coords to simulate camera movement
      setCoords(c => ({
        lat: c.lat + (Math.random() - 0.5) * 0.001,
        lon: c.lon + (Math.random() - 0.5) * 0.001,
        alt: c.alt + (Math.random() - 0.5) * 100,
      }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  if (hudMode === 'off') return null

  const zulu = `${fmt2(time.getUTCHours())}${fmt2(time.getUTCMinutes())}${fmt2(time.getUTCSeconds())}Z`
  const date = `${time.getUTCDate().toString().padStart(2,'0')}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][time.getUTCMonth()]}${time.getUTCFullYear()}`

  const gsd = (coords.alt / 1000000 * 0.3).toFixed(2)

  return (
    <>
      {/* ── Top-left: Classification + system info */}
      <div style={{
        position: 'fixed', top: 12, left: 12,
        pointerEvents: 'none', zIndex: 200,
      }}>
        <div className="classification-banner" style={{ fontSize: '10px', marginBottom: 4 }}>
          ▶ TOP SECRET // SI-TK // NOFORN ◀
        </div>
        <div style={{ fontSize: '8px', color: 'var(--c-amber)', letterSpacing: '0.12em' }}>
          WORLDVIEW-III · SENSOR PLATFORM Δ
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.6)', letterSpacing: '0.08em', marginTop: 2 }}>
          TASKING: GLOBAL / PERSISTENT ISR
        </div>
      </div>

      {/* ── Top-right: REC + timestamp */}
      <div style={{
        position: 'fixed', top: 12, right: 12,
        pointerEvents: 'none', zIndex: 200,
        textAlign: 'right',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
          <span className="blink" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--c-red)',
            boxShadow: '0 0 6px var(--c-red)',
            display: 'inline-block',
          }} />
          <span style={{ color: 'var(--c-red)', fontSize: '10px', letterSpacing: '0.15em' }}>REC</span>
        </div>
        <div className="hud-value" style={{ fontSize: '14px' }}>{zulu}</div>
        <div className="hud-label">{date}</div>
      </div>

      {/* ── Bottom-left: Coordinates + telemetry */}
      <div style={{
        position: 'fixed', bottom: 48, left: 12,
        pointerEvents: 'none', zIndex: 200,
      }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['LAT', fmtCoord(coords.lat, 'N', 'S')],
              ['LON', fmtCoord(coords.lon, 'E', 'W')],
              ['ALT', `${Math.abs(coords.alt).toFixed(0)} m`],
              ['GSD', `${gsd} m/px`],
            ].map(([label, val]) => (
              <tr key={label}>
                <td className="hud-label" style={{ paddingRight: 12 }}>{label}</td>
                <td className="hud-value">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom-right: Layer counters */}
      {hudMode === 'tactical' && (
        <div style={{
          position: 'fixed', bottom: 48, right: 12,
          pointerEvents: 'none', zIndex: 200,
          textAlign: 'right',
        }}>
          <div>
            <span className="hud-label">TRACKS &nbsp;</span>
            <span className="hud-value">{flights.length}</span>
          </div>
        </div>
      )}

      {/* ── Center crosshair */}
      {hudMode === 'tactical' && (
        <div style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 200,
          color: 'rgba(0,255,65,0.3)',
          fontSize: '24px',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {/* SVG crosshair */}
          <svg width="40" height="40" style={{ display: 'block' }}>
            <line x1="20" y1="0"  x2="20" y2="14" stroke="rgba(0,255,65,0.5)" strokeWidth="1" />
            <line x1="20" y1="26" x2="20" y2="40" stroke="rgba(0,255,65,0.5)" strokeWidth="1" />
            <line x1="0"  y1="20" x2="14" y2="20" stroke="rgba(0,255,65,0.5)" strokeWidth="1" />
            <line x1="26" y1="20" x2="40" y2="20" stroke="rgba(0,255,65,0.5)" strokeWidth="1" />
            <circle cx="20" cy="20" r="4" fill="none" stroke="rgba(0,255,65,0.4)" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* ── View mode badge */}
      <div style={{
        position: 'fixed', top: 12,
        left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 200,
      }}>
        <div style={{
          background: 'rgba(0,20,0,0.8)',
          border: '1px solid rgba(0,255,65,0.3)',
          padding: '2px 14px',
          fontSize: '9px', letterSpacing: '0.2em',
          color: 'var(--c-cyan)',
          textTransform: 'uppercase',
        }}>
          {viewMode.toUpperCase()} MODE
        </div>
      </div>

      {/* ── Frame counter */}
      <div style={{
        position: 'fixed', bottom: 48,
        left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 200,
        fontSize: '8px', letterSpacing: '0.1em',
        color: 'rgba(0,255,65,0.35)',
      }}>
        FRM:{String(frameCount).padStart(6, '0')} · STREAM:ACTIVE
      </div>
    </>
  )
}
