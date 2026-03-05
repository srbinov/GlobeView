/**
 * SatelliteDetailPanel — track a single satellite (like FlightDetailPanel).
 * Shows 3D satellite model (space background) + name, NORAD ID, position, altitude; Follow draws orbit path on globe.
 */
import Satellite3DViewer from './Satellite3DViewer'

export default function SatelliteDetailPanel({ satellite, onClose, onFollow, isFollowing }) {
  if (!satellite) return null

  const altKm = Math.round(satellite.altKm ?? 0)
  const altMi = (altKm * 0.621371).toFixed(1)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 360,
      maxWidth: '90vw',
      height: '100%',
      background: 'linear-gradient(135deg, rgba(0,12,20,0.97) 0%, rgba(0,8,0,0.98) 100%)',
      borderLeft: '1px solid rgba(0,229,255,0.35)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-mono)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(0,229,255,0.2)',
        background: 'rgba(0,20,30,0.6)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ color: 'var(--c-amber)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 4 }}>
              ◈ SATELLITE TRACK
            </div>
            <div style={{ color: 'var(--c-cyan)', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.3 }}>
              {satellite.name}
            </div>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{
                fontSize: 8, letterSpacing: '0.1em', padding: '2px 7px',
                border: '1px solid rgba(0,229,255,0.5)', color: 'var(--c-cyan)',
                background: 'rgba(0,0,0,0.4)',
              }}>
                NORAD {satellite.noradId || satellite.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(0,255,65,0.5)', fontSize: 12, fontFamily: 'var(--font-mono)',
            }}
          >
            [×]
          </button>
        </div>
      </div>

      {/* 3D satellite model (space background) — same pattern as Aircraft3DViewer */}
      <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
        <Satellite3DViewer satellite={satellite} width={328} height={220} />
      </div>

      {/* Telemetry */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ paddingBottom: 8, paddingRight: 12, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,229,255,0.5)', verticalAlign: 'top' }}>POSITION</td>
              <td style={{ paddingBottom: 8, fontSize: 11, color: 'var(--c-green)' }}>
                {satellite.lat?.toFixed(4)}° · {satellite.lon?.toFixed(4)}°
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: 8, paddingRight: 12, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,229,255,0.5)', verticalAlign: 'top' }}>ALTITUDE</td>
              <td style={{ paddingBottom: 8, fontSize: 11, color: 'var(--c-green)' }}>
                {altKm.toLocaleString()} km · {altMi} mi
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 7, color: 'rgba(0,229,255,0.35)', marginTop: 12, letterSpacing: '0.08em', lineHeight: 1.6 }}>
          CelesTrak TLE · SGP4 propagation · Real-time orbit
        </div>
      </div>

      {/* Follow / Track */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,229,255,0.2)',
        background: 'rgba(0,8,12,0.8)',
        flexShrink: 0,
      }}>
        <button
          onClick={onFollow}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            background: isFollowing ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.08)',
            border: `1px solid ${isFollowing ? 'var(--c-cyan)' : 'rgba(0,229,255,0.4)'}`,
            color: 'var(--c-cyan)',
            cursor: 'pointer',
          }}
        >
          {isFollowing ? '● TRACKING ORBIT' : '◈ TRACK ORBIT'}
        </button>
        <div style={{ fontSize: 7, color: 'rgba(0,229,255,0.4)', marginTop: 6, letterSpacing: '0.06em' }}>
          {isFollowing ? 'Orbit path shown on globe (90 min)' : 'Click to show orbit path on globe'}
        </div>
      </div>
    </div>
  )
}
