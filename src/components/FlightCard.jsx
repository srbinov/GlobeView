export default function FlightCard({ flight, onClose }) {
  if (!flight) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 500,
      pointerEvents: 'all',
      minWidth: 240,
    }}>
      <div className="panel" style={{
        padding: 0,
        border: '1px solid rgba(0,255,65,0.5)',
        boxShadow: '0 0 20px rgba(0,255,65,0.2)',
      }}>
        {/* Header */}
        <div className="panel-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ color: 'var(--c-amber)' }}>◈ TRACK DETAIL</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-green-dim)', fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [×]
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{
            fontSize: '22px', letterSpacing: '0.1em',
            color: 'var(--c-green)', marginBottom: 10,
            textShadow: '0 0 10px rgba(0,255,65,0.5)',
          }}>
            {flight.callsign || flight.id}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {[
              ['ICAO24',   flight.id],
              ['COUNTRY',  flight.country || 'UNK'],
              ['LATITUDE', flight.lat?.toFixed(4) + '°'],
              ['LONGITUD', flight.lon?.toFixed(4) + '°'],
              ['ALTITUDE', flight.alt + ' m'],
              ['SPEED',    flight.speed + ' kts'],
              ['HEADING',  flight.heading?.toFixed(0) + '°'],
              ['VERT RATE',flight.vertRate?.toFixed(1) + ' m/s'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="hud-label" style={{ paddingBottom: 4, paddingRight: 16, whiteSpace: 'nowrap' }}>{k}</td>
                <td className="hud-value" style={{ paddingBottom: 4 }}>{v}</td>
              </tr>
            ))}
          </table>

          {/* Status */}
          <div style={{
            marginTop: 10,
            padding: '4px 8px',
            background: 'rgba(0,255,65,0.07)',
            border: '1px solid rgba(0,255,65,0.2)',
            fontSize: '8px', letterSpacing: '0.1em',
            color: 'rgba(0,255,65,0.6)',
          }}>
            STATUS: AIRBORNE · ADS-B TRACK ACTIVE
          </div>
        </div>
      </div>
    </div>
  )
}
