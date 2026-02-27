
import { useState } from 'react'

const LAYERS = [
  { id: 'flights',    label: 'LIVE FLIGHTS',    sub: 'OpenSky Network · Global ADS-B', color: '#00ff41' },
  { id: 'satellites', label: 'ORBITAL ASSETS',  sub: 'CelesTrak TLE · SGP4 Propagation', color: '#00e5ff' },
  { id: 'earthquakes',label: 'SEISMIC EVENTS',  sub: 'USGS · 24h Window', color: '#ff8c00' },
  { id: 'weather',    label: 'WEATHER RADAR',   sub: 'RainViewer · Composite', color: '#4df7ff' },
  { id: 'cctv',       label: 'CCTV MESH',       sub: 'Global · 10+ sources · Live feeds', color: '#ff2d2d' },
  { id: 'news',       label: 'NEWS',             sub: 'GNews API · Headlines by region', color: '#ffb000' },
]

const STUB_LAYERS = [
  { id: 'heatmap',    label: 'TRAFFIC FLOW',    sub: '⚠ STUB · Pending feed', color: '#888' },
  { id: 'panoptic',   label: 'PANOPTIC OD',     sub: '⚠ STUB · ML pipeline', color: '#888' },
  { id: 'signals',    label: 'SIGINT OVERLAY',  sub: '⚠ STUB · CLASSIFIED', color: '#888' },
]

export default function LeftPanel({ layers, setLayers, counts, errors, loading, onBrowseCamera, cameraListOpen, flights = [], onFlightLookup }) {
  const [flightQuery, setFlightQuery] = useState('')
  const [lookupError, setLookupError] = useState(null)
  const toggle = (id) => setLayers(prev => ({ ...prev, [id]: !prev[id] }))

  const runFlightLookup = () => {
    setLookupError(null)
    const q = (flightQuery || '').trim().toUpperCase()
    if (!q) return
    if (!flights.length) {
      setLookupError('Waiting for flights…')
      return
    }
    const match = flights.find(
      (f) =>
        (f.callsign && f.callsign.toUpperCase().includes(q)) ||
        (f.id && String(f.id).toUpperCase().includes(q))
    )
    if (match) {
      onFlightLookup?.(match)
      setFlightQuery('')
    } else {
      setLookupError(`No "${q}" in feed`)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      width: 220,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'all',
    }}>
      {/* Panel */}
      <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="panel-header" style={{ flexShrink: 0 }}>
          <div style={{ color: 'var(--c-amber)', marginBottom: 2 }}>◈ DATA LAYERS</div>
          <div style={{ color: 'rgba(0,255,65,0.5)', fontSize: '8px' }}>SELECT ACTIVE SENSORS</div>
        </div>

        {/* Layers */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>

          {/* Live layers */}
          <div style={{ padding: '4px 10px 2px', fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em' }}>
            ── LIVE FEEDS ──
          </div>
          {LAYERS.map(layer => (
            <div key={layer.id}>
              <button
                className={`toggle-btn ${layers[layer.id] ? 'active' : ''}`}
                onClick={() => toggle(layer.id)}
                style={{ padding: '6px 10px' }}
              >
                <span className="dot" style={{ background: layers[layer.id] ? layer.color : undefined, boxShadow: layers[layer.id] ? `0 0 6px ${layer.color}` : undefined }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: layers[layer.id] ? 'var(--c-green)' : undefined }}>
                    {layer.label}
                  </div>
                  <div style={{ fontSize: '7px', color: 'rgba(0,255,65,0.4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {layer.sub}
                  </div>
                </div>
                {layers[layer.id] && (
                  <div style={{ fontSize: '8px', letterSpacing: '0.05em', flexShrink: 0, textAlign: 'right' }}>
                    {loading[layer.id] ? (
                      <span style={{ color: 'var(--c-amber)' }}>INIT</span>
                    ) : errors[layer.id] ? (
                      <span style={{ color: 'var(--c-red)' }} title={errors[layer.id]}>ERR</span>
                    ) : counts[layer.id] !== undefined ? (
                      <span style={{ color: layer.color }}>{counts[layer.id]}</span>
                    ) : (
                      <span style={{ color: 'var(--c-cyan)' }}>ON</span>
                    )}
                  </div>
                )}
              </button>
              {/* Error detail — shown below the button row */}
              {layers[layer.id] && errors[layer.id] && (
                <div style={{ padding: '2px 10px 5px 28px', fontSize: 7, color: 'var(--c-red)', letterSpacing: '0.04em', opacity: 0.8, wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {String(errors[layer.id]).slice(0, 90)}
                </div>
              )}
              {/* Flight lookup — below Live Flights when that layer is on */}
              {layer.id === 'flights' && layers.flights && (
                <div style={{
                  margin: '6px 10px 10px', padding: '8px 10px',
                  border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2,
                  background: 'rgba(0,255,65,0.04)',
                }}>
                  <div style={{ fontSize: '7px', color: 'rgba(0,255,65,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>
                    ◈ FLIGHT LOOKUP
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Callsign or ICAO hex"
                      value={flightQuery}
                      onChange={(e) => { setFlightQuery(e.target.value); setLookupError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && runFlightLookup()}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '5px 8px',
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,255,65,0.3)',
                        color: 'var(--c-green)', letterSpacing: '0.06em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={runFlightLookup}
                      style={{
                        width: '100%', padding: '5px 0', fontFamily: 'var(--font-mono)', fontSize: 8,
                        background: 'rgba(0,255,65,0.12)', border: '1px solid rgba(0,255,65,0.4)',
                        color: 'var(--c-green)', cursor: 'pointer', letterSpacing: '0.1em',
                      }}
                    >
                      GO — PAN TO FLIGHT
                    </button>
                    {lookupError && (
                      <div style={{ fontSize: 7, color: 'var(--c-red)', letterSpacing: '0.04em' }}>
                        {lookupError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* CCTV info block */}
          {layers.cctv && (
            <div style={{ margin: '4px 10px', padding: '7px 8px', border: '1px solid rgba(255,45,45,0.25)', borderRadius: 2, fontSize: '8px', color: 'rgba(255,45,45,0.6)', letterSpacing: '0.08em', lineHeight: 1.7 }}>
              <div style={{ color: '#ff2d2d', letterSpacing: '0.1em', marginBottom: 4 }}>── LIVE FEEDS ──</div>
              <div><span style={{ color: '#ff2d2d' }}>●</span> UK · USA · Canada · Australia</div>
              <div><span style={{ color: '#ff8c00' }}>●</span> Washington · NYC · Ontario · TfL</div>
              <div><span style={{ color: '#ffd700' }}>●</span> OpenTrafficCamMap · Global</div>
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={onBrowseCamera}
                  style={{
                    width: '100%',
                    padding: '5px 0',
                    background: cameraListOpen ? 'rgba(255,45,45,0.2)' : 'rgba(255,45,45,0.07)',
                    border: `1px solid ${cameraListOpen ? '#ff2d2d' : 'rgba(255,45,45,0.3)'}`,
                    color: cameraListOpen ? '#ff2d2d' : 'rgba(255,45,45,0.7)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                  }}
                >
                  {cameraListOpen ? '◈ CLOSE BROWSER' : '◈ BROWSE CAMERAS'}
                </button>
              </div>
            </div>
          )}

          {/* Stub layers */}
          <div style={{ padding: '8px 10px 2px', fontSize: '8px', color: 'rgba(0,255,65,0.25)', letterSpacing: '0.12em' }}>
            ── ROADMAP ──
          </div>
          {STUB_LAYERS.map(layer => (
            <button
              key={layer.id}
              className="toggle-btn"
              style={{ opacity: 0.4, cursor: 'not-allowed' }}
              disabled
            >
              <span className="dot" style={{ background: '#333' }} />
              <div>
                <div style={{ fontSize: '10px' }}>{layer.label}</div>
                <div style={{ fontSize: '7px', color: 'rgba(0,255,65,0.3)', marginTop: 1 }}>{layer.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer stats */}
        <div style={{
          borderTop: '1px solid var(--c-border)',
          padding: '6px 10px',
          fontSize: '8px',
          color: 'rgba(0,255,65,0.45)',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          <div style={{ marginBottom: 3 }}>
            ACTIVE: {Object.values(layers).filter(Boolean).length}/{Object.keys(layers).length} LAYERS
          </div>
          <div style={{ color: 'rgba(0,255,65,0.3)' }}>
            NET: {Object.values(layers).some(Boolean) ? (
              <span style={{ color: 'var(--c-green)' }}>CONNECTED</span>
            ) : 'STANDBY'}
          </div>
        </div>
      </div>
    </div>
  )
}

