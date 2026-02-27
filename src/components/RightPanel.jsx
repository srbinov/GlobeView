const MODES = ['Normal', 'CRT', 'NVG', 'FLIR', 'Anime', 'Noir', 'Snow', 'AI']

function SliderRow({ label, value, onChange, unit = '%', min = 0, max = 100 }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 3,
        fontSize: '9px', letterSpacing: '0.1em',
      }}>
        <span style={{ color: 'var(--c-amber)' }}>{label}</span>
        <span style={{ color: 'var(--c-green)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
    </div>
  )
}

export default function RightPanel({
  viewMode, setViewMode,
  bloom, setBloom,
  sharpen, setSharpen,
  hudMode, setHudMode,
  panoptic, setPanoptic,
  panopticDensity, setPanopticDensity,
  pixelation, setPixelation,
  distortion, setDistortion,
  instability, setInstability,
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 210,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'all',
    }}>
      <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="panel-header">
          <div style={{ color: 'var(--c-amber)', marginBottom: 2 }}>◈ VISUAL CONTROLS</div>
          <div style={{ color: 'rgba(0,255,65,0.5)', fontSize: '8px' }}>POST-PROCESS PIPELINE</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>

          {/* ── Bloom / Sharpen */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>
              ── SENSOR PARAMS ──
            </div>
            <SliderRow label="BLOOM" value={bloom} onChange={setBloom} />
            <SliderRow label="SHARPEN" value={sharpen} onChange={setSharpen} />
          </div>

          {/* ── HUD mode */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>
              ── HUD OVERLAY ──
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['tactical', 'minimal', 'off'].map(m => (
                <button
                  key={m}
                  className={`mode-btn ${hudMode === m ? 'active' : ''}`}
                  style={{ flex: 1, fontSize: '8px' }}
                  onClick={() => setHudMode(m)}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── PANOPTIC toggle */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>
              ── PANOPTIC ──
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.08em' }}>OBJECT DETECTION</span>
              <button
                onClick={() => setPanoptic(p => !p)}
                style={{
                  width: 36, height: 18,
                  background: panoptic ? 'rgba(0,255,65,0.2)' : 'rgba(0,0,0,0.5)',
                  border: `1px solid ${panoptic ? 'var(--c-green)' : 'rgba(0,255,65,0.25)'}`,
                  borderRadius: 9,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 2, left: panoptic ? 18 : 2,
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: panoptic ? 'var(--c-green)' : 'rgba(0,255,65,0.3)',
                  boxShadow: panoptic ? '0 0 6px var(--c-green)' : 'none',
                  transition: 'left 0.2s, background 0.2s',
                }} />
              </button>
            </div>
            {panoptic && (
              <div style={{ opacity: 0.7, animation: 'fadeIn 0.3s ease' }}>
                <SliderRow label="DENSITY" value={panopticDensity} onChange={setPanopticDensity} />
                <div style={{ fontSize: '7px', color: 'var(--c-amber)', opacity: 0.6, marginTop: -4 }}>
                  ⚠ STUB — ML pipeline not connected
                </div>
              </div>
            )}
          </div>

          {/* ── Signal degradation */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>
              ── SIGNAL DEGRADATION ──
            </div>
            <SliderRow label="PIXELATION" value={pixelation} onChange={setPixelation} />
            <SliderRow label="DISTORTION" value={distortion} onChange={setDistortion} />
            <SliderRow label="INSTABILITY" value={instability} onChange={setInstability} />
          </div>

          {/* ── View mode switcher */}
          <div>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>
              ── VIEW MODE ──
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {MODES.map(m => (
                <button
                  key={m}
                  className={`mode-btn ${viewMode === m.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setViewMode(m.toLowerCase())}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: system status */}
        <div style={{
          borderTop: '1px solid var(--c-border)',
          padding: '6px 12px',
          fontSize: '7px',
          color: 'rgba(0,255,65,0.4)',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span>GPU</span>
            <span style={{ color: 'var(--c-green)' }}>ONLINE</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span>RENDER</span>
            <span style={{ color: 'var(--c-green)' }}>WebGL 2.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>MODE</span>
            <span style={{ color: 'var(--c-amber)', textTransform: 'uppercase' }}>{viewMode}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
