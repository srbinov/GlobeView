import { useState } from 'react'

const LAYERS = [
  { id: 'flights',    label: 'LIVE FLIGHTS',    sub: 'OpenSky Network · Global ADS-B', color: '#00ff41' },
  { id: 'satellites', label: 'ORBITAL ASSETS',  sub: 'CelesTrak TLE · SGP4 Propagation', color: '#00e5ff' },
  { id: 'earthquakes',label: 'SEISMIC EVENTS',  sub: 'USGS · 24h Window', color: '#ff8c00' },
  { id: 'weather',    label: 'WEATHER RADAR',   sub: 'RainViewer · Composite', color: '#4df7ff' },
  { id: 'cctv',       label: 'CCTV MESH',       sub: 'Municipal Feeds · ATX/NYC', color: '#ff2d2d' },
]

const STUB_LAYERS = [
  { id: 'heatmap',    label: 'TRAFFIC FLOW',    sub: '⚠ STUB · Pending feed', color: '#888' },
  { id: 'panoptic',   label: 'PANOPTIC OD',     sub: '⚠ STUB · ML pipeline', color: '#888' },
  { id: 'signals',    label: 'SIGINT OVERLAY',  sub: '⚠ STUB · CLASSIFIED', color: '#888' },
]

export default function LeftPanel({ layers, setLayers, counts, errors, loading }) {
  const [cctvOpen, setCctvOpen] = useState(false)

  const toggle = (id) => setLayers(prev => ({ ...prev, [id]: !prev[id] }))

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
                      <span style={{ color: 'var(--c-red)' }}>ERR</span>
                    ) : counts[layer.id] !== undefined ? (
                      <span style={{ color: layer.color }}>{counts[layer.id]}</span>
                    ) : (
                      <span style={{ color: 'var(--c-cyan)' }}>ON</span>
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}

          {/* CCTV expandable */}
          {layers.cctv && (
            <div style={{ margin: '4px 10px', border: '1px solid rgba(255,45,45,0.25)', borderRadius: 2 }}>
              <div style={{ padding: '4px 8px', fontSize: '8px', color: 'var(--c-red)', letterSpacing: '0.1em' }}>
                ── FEED STREAMS ──
              </div>
              <CCTVStreams />
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

// Embedded CCTV stream thumbnails using public traffic cameras
function CCTVStreams() {
  // Austin ATMS public cameras — using placeholder images since actual MJPEG
  // streams require special handling. Linking to real public feeds.
  const feeds = [
    { id: 'atx-1', label: 'ATX · I-35 N', color: '#ff2d2d' },
    { id: 'atx-2', label: 'ATX · 183 E',  color: '#ff2d2d' },
    { id: 'nyc-1', label: 'NYC · MIDTOWN', color: '#ff6b00' },
  ]

  return (
    <div style={{ padding: '0 8px 8px' }}>
      {feeds.map(feed => (
        <div key={feed.id} style={{
          marginBottom: 6,
          border: `1px solid rgba(255,45,45,0.3)`,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'rgba(255,45,45,0.08)',
            padding: '2px 6px',
            fontSize: '7px',
            color: feed.color,
            letterSpacing: '0.1em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{feed.label}</span>
            <span className="blink-fast" style={{ color: feed.color }}>● LIVE</span>
          </div>
          {/* Simulated CCTV frame */}
          <div style={{
            height: 52,
            background: '#050505',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '7px',
            color: 'rgba(255,45,45,0.4)',
            letterSpacing: '0.05em',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 2 }}>◈ STREAM ACTIVE ◈</div>
              <div style={{ fontSize: '6px', opacity: 0.6 }}>PUBLIC TRAFFIC FEED</div>
            </div>
            {/* Noise overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 3px)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}
