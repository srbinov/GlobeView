import { useMemo } from 'react'
import { useFlightEnrichment } from '../hooks/useFlightEnrichment'
import { getAirlineInfo }      from '../data/airlineColors'
import Aircraft3DViewer        from './Aircraft3DViewer'
import FlightPathGlobe         from './FlightPathGlobe'

// Great-circle distance (km)
function haversine(lat1, lon1, lat2, lon2) {
  const R  = 6371, d2r = Math.PI / 180
  const dLat = (lat2 - lat1) * d2r
  const dLon = (lon2 - lon1) * d2r
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLon/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function headingToCardinal(h) {
  return ['N','NE','E','SE','S','SW','W','NW','N'][Math.round(((h||0) % 360) / 45)]
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Chip({ label, color = 'rgba(0,255,65,0.5)' }) {
  return (
    <span style={{
      fontSize: 7, letterSpacing: '0.1em', padding: '2px 7px',
      border: `1px solid ${color}`, color,
      background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function TRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <tr>
      <td style={{ paddingBottom: 6, paddingRight: 14, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,255,65,0.4)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        {label}
      </td>
      <td style={{ paddingBottom: 6, fontSize: 11, color: 'var(--c-green)', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
        {value}
      </td>
    </tr>
  )
}

function AirportBox({ label, ap, loading }) {
  return (
    <div style={{ flex: 1, padding: '7px 10px', background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.15)', minWidth: 0 }}>
      <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.35)', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
      {loading ? (
        <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.25)', letterSpacing: '0.08em' }}>QUERYING…</div>
      ) : ap ? (
        <>
          <div style={{ fontSize: 22, color: 'var(--c-amber)', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
            {ap.iata_code || ap.icao_code || '???'}
          </div>
          <div style={{ fontSize: 8, color: 'var(--c-green)', marginTop: 3, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {(ap.name || '').slice(0, 24)}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.35)', marginTop: 1 }}>
            {ap.country_iso_name || ''}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 10, color: 'rgba(0,255,65,0.2)', marginTop: 2 }}>N/A</div>
      )}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function FlightDetailPanel({ flight, onClose, onFollow, isFollowing }) {
  const { enriched, loading } = useFlightEnrichment(flight)
  if (!flight) return null

  const airlineInfo = getAirlineInfo(flight.callsign)
  const airlineName = enriched?.operator || airlineInfo?.name || null
  const typeCode    = enriched?.type?.toUpperCase() || null
  const vertIcon    = flight.vertRate > 1 ? '▲' : flight.vertRate < -1 ? '▼' : '▶'
  const vertColor   = flight.vertRate > 1 ? '#00ffe5' : flight.vertRate < -1 ? '#ff8c00' : 'var(--c-green)'

  // Route progress: support latitude_deg/lat/latitude and longitude_deg/lon/longitude (adsbdb + OurAirports)
  const routeProgress = useMemo(() => {
    const orig = enriched?.origin
    const dest = enriched?.destination
    const oLat = orig?.latitude_deg ?? orig?.lat ?? orig?.latitude ?? null
    const oLon = orig?.longitude_deg ?? orig?.lon ?? orig?.longitude ?? null
    const dLat = dest?.latitude_deg ?? dest?.lat ?? dest?.latitude ?? null
    const dLon = dest?.longitude_deg ?? dest?.lon ?? dest?.longitude ?? null
    if (!oLat || !dLat || !flight.lat) return null
    const total = Math.round(haversine(oLat, oLon, dLat, dLon))
    const flown = Math.round(haversine(oLat, oLon, flight.lat, flight.lon))
    const pct   = Math.min(100, Math.max(0, Math.round(flown / total * 100)))
    return { total, flown, remain: Math.max(0, total - flown), pct }
  }, [enriched?.origin, enriched?.destination, flight.lat, flight.lon])

  return (
    <div style={{
      position:  'fixed',
      top:       0,
      right:     210,   // sits left of the RightPanel (210px)
      bottom:    0,
      width:     380,
      zIndex:    300,
      overflowY: 'auto',
      overflowX: 'hidden',
      pointerEvents: 'all',
    }}>
      <div className="panel" style={{
        minHeight:      '100%',
        padding:        0,
        border:         '1px solid rgba(0,255,65,0.4)',
        borderRight:    'none',
        boxShadow:      '-10px 0 50px rgba(0,0,0,0.85)',
        display:        'flex',
        flexDirection:  'column',
      }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--c-amber)', fontSize: 9, letterSpacing: '0.15em' }}>✈ FLIGHT INTELLIGENCE</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onFollow} style={{
              background: isFollowing ? 'rgba(255,176,0,0.15)' : 'rgba(0,255,65,0.07)',
              border: `1px solid ${isFollowing ? 'var(--c-amber)' : 'rgba(0,255,65,0.3)'}`,
              color: isFollowing ? 'var(--c-amber)' : 'var(--c-green)',
              fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em',
              padding: '3px 8px', cursor: 'pointer',
            }}>
              {isFollowing ? '◉ TRACKING' : '◎ FOLLOW'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-green-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>[×]</button>
          </div>
        </div>

        {/* ── Callsign + chips ────────────────────────────── */}
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <div style={{ fontSize: 32, letterSpacing: '0.08em', color: 'var(--c-green)', textShadow: '0 0 18px rgba(0,255,65,0.45)', lineHeight: 1 }}>
            {flight.callsign || flight.id.toUpperCase()}
          </div>
          {airlineName && (
            <div style={{ fontSize: 10, color: 'var(--c-amber)', letterSpacing: '0.08em', marginTop: 4 }}>
              {airlineName}
            </div>
          )}
          <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
            <Chip label={`ICAO · ${flight.id.toUpperCase()}`} color="#00e5ff" />
            {typeCode    && <Chip label={typeCode}            color="var(--c-green)" />}
            {flight.country && <Chip label={flight.country}  color="rgba(0,255,65,0.45)" />}
            {enriched?.manufacturer && <Chip label={enriched.manufacturer} color="rgba(0,229,255,0.5)" />}
          </div>
        </div>

        {/* ── 3D Aircraft Viewer ──────────────────────────── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--c-border)', background: '#000a00' }}>
          <Aircraft3DViewer flight={flight} width={380} height={270} />
          <div style={{ padding: '4px 12px 5px', fontSize: 7, color: 'rgba(0,255,65,0.3)', letterSpacing: '0.07em', display: 'flex', justifyContent: 'space-between' }}>
            <span>DRAG · ORBIT · SCROLL TO ZOOM</span>
            {enriched?.model
              ? <span style={{ color: 'var(--c-cyan)' }}>{enriched.model}</span>
              : <span>AUTO-ROTATES WHEN IDLE</span>
            }
          </div>
        </div>

        {/* ── Flight path mini-globe ──────────────────────── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ padding: '4px 12px 4px', fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em' }}>
            ── FLIGHT PATH ──
          </div>
          <FlightPathGlobe
            flight={flight}
            origin={enriched?.origin}
            destination={enriched?.destination}
            width={380}
            height={200}
          />
        </div>

        {/* ── Route ───────────────────────────────────────── */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>── ROUTE ──</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <AirportBox label="ORIGIN"      ap={enriched?.origin}      loading={loading} />
            <div style={{ color: 'rgba(0,255,65,0.35)', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 18 }}>✈</div>
            </div>
            <AirportBox label="DESTINATION" ap={enriched?.destination} loading={loading} />
          </div>

          {routeProgress ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '0.06em', marginBottom: 5 }}>
                <span style={{ color: 'rgba(0,255,65,0.4)' }}>ROUTE PROGRESS</span>
                <span style={{ color: 'var(--c-amber)', fontFamily: 'var(--font-mono)' }}>{routeProgress.pct}%</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 5, background: 'rgba(0,255,65,0.1)', borderRadius: 1, overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${routeProgress.pct}%`,
                  background: 'linear-gradient(90deg, rgba(0,255,65,0.3), #00ff41)',
                  boxShadow: '0 0 8px rgba(0,255,65,0.6)',
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.05em' }}>
                <span>{routeProgress.flown.toLocaleString()} km flown</span>
                <span style={{ color: 'rgba(0,255,65,0.25)' }}>{routeProgress.total.toLocaleString()} km total</span>
                <span>{routeProgress.remain.toLocaleString()} km left</span>
              </div>
            </>
          ) : !loading && (!enriched?.origin || !enriched?.destination) && (
            <div style={{ fontSize: 8, color: 'rgba(0,255,65,0.25)', letterSpacing: '0.08em' }}>
              ROUTE DATA UNAVAILABLE
            </div>
          )}
        </div>

        {/* ── Live Telemetry ──────────────────────────────── */}
        <div style={{ padding: '10px 14px', flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>── LIVE TELEMETRY ──</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <TRow label="ALTITUDE"  value={`${flight.alt.toLocaleString()} m  ·  ${Math.round(flight.alt * 3.281).toLocaleString()} ft`} />
              <TRow label="SPEED"     value={`${flight.speed} kts  ·  ${Math.round(flight.speed * 1.852)} km/h`} />
              <TRow label="HEADING"   value={`${Math.round(flight.heading)}°  ${headingToCardinal(flight.heading)}`} />
              <TRow label="VERT RATE" value={
                <span style={{ color: vertColor }}>
                  {vertIcon} {Math.abs(flight.vertRate).toFixed(1)} m/s
                </span>
              } />
              <TRow label="SQUAWK"    value={flight.squawk} />
              <TRow label="POSITION"  value={`${flight.lat?.toFixed(4)}°  ${flight.lon?.toFixed(4)}°`} />
            </tbody>
          </table>

          <div style={{ marginTop: 10, padding: '4px 8px', background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.12)', fontSize: 7, letterSpacing: '0.09em', color: 'rgba(0,255,65,0.4)', display: 'flex', justifyContent: 'space-between' }}>
            <span>ADS-B · OPENSKY NETWORK · {flight.country || '—'}</span>
            <span className="blink-fast" style={{ color: '#00ff41' }}>● LIVE</span>
          </div>
        </div>

      </div>
    </div>
  )
}
