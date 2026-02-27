import { useFlightEnrichment } from '../hooks/useFlightEnrichment'

// Airline ICAO prefix → name (covers ~80% of commercial traffic)
const AIRLINE_NAMES = {
  AAL:'American Airlines', UAL:'United Airlines', DAL:'Delta Air Lines',
  SWA:'Southwest Airlines', ASA:'Alaska Airlines', JBU:'JetBlue Airways',
  NKS:'Spirit Airlines', FFT:'Frontier Airlines', SKW:'SkyWest Airlines',
  BAW:'British Airways', EZY:'easyJet', RYR:'Ryanair', WZZ:'Wizz Air',
  DLH:'Lufthansa', EWG:'Eurowings', CFG:'Condor', BER:'Air Berlin',
  AFR:'Air France', TVF:'Transavia France', HOP:'HOP!',
  KLM:'KLM', TRA:'Transavia', EJU:'easyJet Europe',
  IBE:'Iberia', VLG:'Vueling', ANE:'Air Nostrum',
  SAS:'Scandinavian Airlines', NAX:'Norwegian', BCS:'European Air Charter',
  THY:'Turkish Airlines', PGT:'Pegasus', AHY:'Azerbaijan Airlines',
  UAE:'Emirates', ETD:'Etihad Airways', QTR:'Qatar Airways',
  SVA:'Saudia', GFA:'Gulf Air', OMA:'Oman Air',
  ANA:'All Nippon Airways', JAL:'Japan Airlines', JJP:'Jetstar Japan',
  CPA:'Cathay Pacific', HDA:'Dragonair', CES:'China Eastern',
  CCA:'Air China', CSN:'China Southern', CHH:'Hainan Airlines',
  SIA:'Singapore Airlines', SQC:'Singapore Airlines Cargo',
  MAS:'Malaysia Airlines', AXM:'AirAsia', MXD:'Malindo Air',
  THA:'Thai Airways', AIQ:'Air Asia X', NOK:'Nok Air',
  GIA:'Garuda Indonesia', LNI:'Lion Air', CTV:'Citilink',
  KAL:'Korean Air', AAR:'Asiana Airlines', JNA:'Jin Air',
  QFA:'Qantas', JST:'Jetstar', TGW:'Tigerair Australia',
  ACA:'Air Canada', WJA:'WestJet', TSC:'Air Transat',
  VOI:'Volaris', AMX:'Aeromexico', VIV:'VivaAerobus',
  AZU:'Azul', GLO:'GOL', LAN:'LATAM',
  AFL:'Aeroflot', SDM:'Rossiya', SBI:'S7 Airlines',
  AZA:'ITA Airways', BPA:'Blue Panorama', CFE:'BA CityFlyer',
  FIN:'Finnair', LOT:'LOT Polish', CSA:'Czech Airlines',
  AUA:'Austrian', BEL:'Brussels Airlines', TAP:'TAP Portugal',
  ICE:'Icelandair', EIN:'Aer Lingus', VIR:'Virgin Atlantic',
  ETH:'Ethiopian Airlines', KQA:'Kenya Airways', RAM:'Royal Air Maroc',
}

// Typical passenger capacity by ICAO type code
const PAX = {
  B735:130, B736:132, B737:149, B738:162, B739:178,
  B744:416, B748:467, B752:200, B753:243, B762:216, B763:261, B764:261,
  B772:314, B773:368, B77W:396, B788:242, B789:296, B78X:330,
  A318:107, A319:124, A320:150, A321:185,
  A332:253, A333:277, A342:266, A343:295, A345:313, A346:359,
  A359:280, A35K:369, A388:555,
  E170:70,  E175:80,  E190:100, E195:120,
  CRJ2:50,  CRJ7:70,  CRJ9:90,  AT72:70,  AT76:78,  DH8D:78,
  MD11:293, MD82:155, MD83:155, DC10:250, B712:106, B722:130,
  C172:4,   C208:14,  PC12:9,   BE20:9,
}

function getAirline(callsign = '') {
  return AIRLINE_NAMES[(callsign.trim().slice(0, 3).toUpperCase())] || null
}

function Row({ label, value, accent }) {
  if (value == null || value === '') return null
  return (
    <tr>
      <td style={{ paddingBottom: 5, paddingRight: 14, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,255,65,0.4)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
      <td style={{ paddingBottom: 5, fontSize: 11, color: accent ? 'var(--c-amber)' : 'var(--c-green)', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>{value}</td>
    </tr>
  )
}

function AirportBox({ label, ap }) {
  return (
    <div style={{ flex: 1, padding: '7px 10px', background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.18)', borderRadius: 2, minWidth: 0 }}>
      <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
      {ap ? (
        <>
          <div style={{ fontSize: 18, color: 'var(--c-amber)', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
            {ap.icao_code || ap.iata_code || '???'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--c-green)', marginTop: 3, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {(ap.name || '').slice(0, 26)}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(0,255,65,0.4)', marginTop: 1 }}>
            {ap.country_iso_name || ap.country || ''}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'rgba(0,255,65,0.25)', marginTop: 2 }}>N/A</div>
      )}
    </div>
  )
}

export default function FlightCard({ flight, onClose, onFollow, isFollowing }) {
  const { enriched, loading } = useFlightEnrichment(flight)
  if (!flight) return null

  const airline  = enriched?.operator || getAirline(flight.callsign)
  const typeCode = enriched?.type?.toUpperCase() || null
  const pax      = typeCode ? (PAX[typeCode] ?? null) : null
  const vertIcon = flight.vertRate > 1 ? '▲' : flight.vertRate < -1 ? '▼' : '▶'
  const vertColor = flight.vertRate > 1 ? '#00ffe5' : flight.vertRate < -1 ? '#ff8c00' : 'var(--c-green)'

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: 500, pointerEvents: 'all', width: 330,
    }}>
      <div className="panel" style={{ padding: 0, border: '1px solid rgba(0,255,65,0.5)', boxShadow: '0 0 30px rgba(0,255,65,0.12)' }}>

        {/* Header */}
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--c-amber)', fontSize: 9, letterSpacing: '0.15em' }}>✈ FLIGHT TRACK</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-green-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>[×]</button>
        </div>

        <div style={{ padding: '12px 14px' }}>

          {/* Callsign + Follow */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 28, letterSpacing: '0.08em', color: 'var(--c-green)', textShadow: '0 0 14px rgba(0,255,65,0.4)', lineHeight: 1 }}>
                {flight.callsign || flight.id.toUpperCase()}
              </div>
              {airline && (
                <div style={{ fontSize: 9, color: 'var(--c-amber)', letterSpacing: '0.1em', marginTop: 3 }}>
                  {airline}
                </div>
              )}
            </div>
            <button onClick={onFollow} style={{
              background: isFollowing ? 'rgba(255,176,0,0.12)' : 'rgba(0,255,65,0.07)',
              border: `1px solid ${isFollowing ? 'var(--c-amber)' : 'rgba(0,255,65,0.3)'}`,
              color: isFollowing ? 'var(--c-amber)' : 'var(--c-green)',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
              padding: '5px 10px', cursor: 'pointer', marginTop: 4,
            }}>
              {isFollowing ? '◉ TRACKING' : '◎ FOLLOW'}
            </button>
          </div>

          {/* Aircraft type */}
          <div style={{ marginBottom: 10, padding: '7px 10px', background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.12)', borderRadius: 2, minHeight: 38 }}>
            {loading ? (
              <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.35)', letterSpacing: '0.1em' }}>QUERYING DATABASE…</div>
            ) : enriched?.model ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', marginBottom: 2 }}>AIRCRAFT</div>
                  <div style={{ fontSize: 12, color: 'var(--c-cyan)' }}>
                    {[typeCode, enriched.model].filter(Boolean).join(' · ')}
                  </div>
                  {enriched.manufacturer && (
                    <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.5)', marginTop: 1 }}>{enriched.manufacturer}</div>
                  )}
                </div>
                {pax != null && (
                  <div style={{ textAlign: 'center', paddingLeft: 12, borderLeft: '1px solid rgba(0,255,65,0.15)' }}>
                    <div style={{ fontSize: 7, color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', marginBottom: 2 }}>MAX PAX</div>
                    <div style={{ fontSize: 22, color: 'var(--c-amber)', fontWeight: 700, lineHeight: 1 }}>{pax}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.3)', letterSpacing: '0.08em' }}>
                AIRCRAFT · {flight.id.toUpperCase()} · {flight.country || 'UNKNOWN REGISTRY'}
              </div>
            )}
          </div>

          {/* Route */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 10 }}>
            <AirportBox label="DEPARTURE" ap={enriched?.origin} />
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(0,255,65,0.3)', fontSize: 16, flexShrink: 0 }}>→</div>
            <AirportBox label="ARRIVAL"   ap={enriched?.destination} />
          </div>

          {/* Live telemetry */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="ALTITUDE"  value={`${flight.alt.toLocaleString()} m  ·  ${Math.round(flight.alt * 3.281).toLocaleString()} ft`} />
              <Row label="SPEED"     value={`${flight.speed} kts  ·  ${Math.round(flight.speed * 1.852)} km/h`} />
              <Row label="HEADING"   value={`${Math.round(flight.heading)}°`} />
              <Row label="VERT RATE" value={<span style={{ color: vertColor }}>{vertIcon} {Math.abs(flight.vertRate).toFixed(1)} m/s</span>} />
              <Row label="SQUAWK"    value={flight.squawk || null} />
              <Row label="POSITION"  value={`${flight.lat?.toFixed(4)}°  ${flight.lon?.toFixed(4)}°`} />
            </tbody>
          </table>

          {/* Status */}
          <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,255,65,0.5)', display: 'flex', justifyContent: 'space-between' }}>
            <span>ADS-B · {flight.country || '—'}</span>
            <span style={{ color: '#00ff41' }}>● LIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
