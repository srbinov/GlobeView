import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import LeftPanel    from './components/LeftPanel'
import RightPanel   from './components/RightPanel'
import HUD          from './components/HUD'
import BottomBar    from './components/BottomBar'
import FlightCard   from './components/FlightCard'
import CCTVPanel    from './components/CCTVPanel'
import CameraList   from './components/CameraList'
import { useFlights }     from './hooks/useFlights'
import { useSatellites }  from './hooks/useSatellites'
import { useEarthquakes } from './hooks/useEarthquakes'
import { useWeather }     from './hooks/useWeather'
import { useCCTV }        from './hooks/useCCTV'

// Lazy-load the heavy globe component
const Globe = lazy(() => import('./components/Globe'))

export default function App() {
  // ── Layer toggles
  const [layers, setLayers] = useState({
    flights:     false,
    satellites:  true,
    earthquakes: false,
    weather:     false,
    cctv:        false,
  })

  // ── Visual controls
  const [viewMode,         setViewMode]         = useState('normal')
  const [bloom,            setBloom]            = useState(30)
  const [sharpen,          setSharpen]          = useState(20)
  const [hudMode,          setHudMode]          = useState('tactical')
  const [panoptic,         setPanoptic]         = useState(false)
  const [panopticDensity,  setPanopticDensity]  = useState(50)
  const [pixelation,       setPixelation]       = useState(0)
  const [distortion,       setDistortion]       = useState(0)
  const [instability,      setInstability]      = useState(0)

  // ── Live data hooks
  const { flights,   loading: lFlights,  error: eFlights,  count: cFlights }  = useFlights(layers.flights)
  const { positions: sats, loading: lSats, error: eSats, count: cSats }       = useSatellites(layers.satellites)
  const { quakes,    loading: lQuakes,   error: eQuakes,   count: cQuakes }    = useEarthquakes(layers.earthquakes)
  const { tileUrl,   loading: lWeather,  error: eWeather }                     = useWeather(layers.weather)
  const { cameras,   loading: lCCTV,    error: eCCTV,     count: cCCTV }      = useCCTV(layers.cctv)

  // ── UI state
  const [selectedFlight,  setSelectedFlight]  = useState(null)
  const [followFlightId,  setFollowFlightId]  = useState(null)
  const [selectedCamera,  setSelectedCamera]  = useState(null)
  const [cameraListOpen,  setCameraListOpen]  = useState(false)
  const [alerts,          setAlerts]          = useState([])
  const globeRef = useRef()

  // ── Apply body mode class
  useEffect(() => {
    const body = document.body
    Array.from(body.classList)
      .filter(c => c.startsWith('mode-'))
      .forEach(c => body.classList.remove(c))
    body.classList.add(`mode-${viewMode}`)
  }, [viewMode])

  // ── CRT scanlines always on, extra effects in CRT mode
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.classList.add('scanlines')
    if (viewMode === 'crt') {
      root.classList.add('crt-vignette', 'crt-flicker')
    } else {
      root.classList.remove('crt-vignette', 'crt-flicker')
    }
  }, [viewMode])

  // ── Instability class
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.classList.remove('instability-1', 'instability-2', 'instability-3')
    if (instability > 65)      root.classList.add('instability-3')
    else if (instability > 30) root.classList.add('instability-2')
    else if (instability > 5)  root.classList.add('instability-1')
  }, [instability])

  // ── Auto-generate alerts from live data
  useEffect(() => {
    const next = []
    quakes.filter(q => q.mag >= 4).slice(0, 3).forEach(q =>
      next.push({ id: q.id, type: 'seismic', message: `SEISMIC M${q.mag?.toFixed(1)} · ${(q.place || '').slice(0, 40)}`, ts: q.time })
    )
    if (flights.length > 0)
      next.push({ id: 'fl-' + Date.now(), type: 'info', message: `${flights.length} ADS-B TRACKS · GLOBAL COVERAGE`, ts: Date.now() })
    if (next.length) setAlerts(next)
  }, [quakes.length, flights.length])

  const counts    = { flights: cFlights, satellites: cSats, earthquakes: cQuakes, cctv: cCCTV }
  const loadingMap = { flights: lFlights, satellites: lSats, earthquakes: lQuakes, weather: lWeather, cctv: lCCTV }
  const errorsMap  = { flights: eFlights, satellites: eSats, earthquakes: eQuakes, weather: eWeather, cctv: eCCTV }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ── Full-screen globe */}
      <Suspense fallback={<GlobeLoader />}>
        <Globe
          ref={globeRef}
          layers={layers}
          flights={flights}
          satellites={sats}
          quakes={quakes}
          cameras={cameras}
          viewMode={viewMode}
          bloom={bloom}
          sharpen={sharpen}
          followFlightId={followFlightId}
          onFlightClick={f => { setSelectedFlight(f); setFollowFlightId(f.id) }}
          onQuakeClick={q => setAlerts(prev => [
            ...prev.slice(-9),
            { id: q.id, type: 'seismic', message: `SEISMIC M${q.mag?.toFixed(1)} · ${(q.place||'').slice(0,40)}`, ts: Date.now() }
          ])}
          onCameraClick={c => setSelectedCamera(c)}
        />
      </Suspense>

      {/* ── Panels */}
      <LeftPanel
        layers={layers}
        setLayers={setLayers}
        counts={counts}
        errors={errorsMap}
        loading={loadingMap}
        onBrowseCamera={() => setCameraListOpen(o => !o)}
        cameraListOpen={cameraListOpen}
      />

      {/* ── Camera browser panel */}
      {layers.cctv && cameraListOpen && (
        <CameraList
          cameras={cameras}
          loading={lCCTV}
          onSelect={c => { setSelectedCamera(c); setCameraListOpen(false) }}
          onClose={() => setCameraListOpen(false)}
        />
      )}

      <RightPanel
        viewMode={viewMode}            setViewMode={setViewMode}
        bloom={bloom}                  setBloom={setBloom}
        sharpen={sharpen}              setSharpen={setSharpen}
        hudMode={hudMode}              setHudMode={setHudMode}
        panoptic={panoptic}            setPanoptic={setPanoptic}
        panopticDensity={panopticDensity} setPanopticDensity={setPanopticDensity}
        pixelation={pixelation}        setPixelation={setPixelation}
        distortion={distortion}        setDistortion={setDistortion}
        instability={instability}      setInstability={setInstability}
      />

      {/* ── HUD overlays */}
      <HUD
        hudMode={hudMode}
        viewMode={viewMode}
        flights={flights}
        quakes={quakes}
        satellites={sats}
      />

      {/* ── Bottom navigation bar */}
      <BottomBar globeRef={globeRef} alerts={alerts} />

      {/* ── CCTV feed panel */}
      {selectedCamera && (
        <CCTVPanel
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}

      {/* ── Flight detail card */}
      {selectedFlight && (
        <FlightCard
          flight={selectedFlight}
          onClose={() => {
            setSelectedFlight(null)
            setFollowFlightId(null)
            globeRef.current?.flyTo(20, 10, 2.5)
          }}
          onFollow={() => setFollowFlightId(id => id === selectedFlight.id ? null : selectedFlight.id)}
          isFollowing={followFlightId === selectedFlight.id}
        />
      )}

      {/* ── Alert feed (bottom-right corner) */}
      {alerts.length > 0 && hudMode === 'tactical' && (
        <AlertFeed alerts={alerts} />
      )}

      {/* ── PANOPTIC stub overlay */}
      {panoptic && <PanopticOverlay density={panopticDensity} />}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────

function GlobeLoader() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-bg)', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '2px solid rgba(0,255,65,0.3)',
        borderTop: '2px solid var(--c-green)',
        borderRadius: '50%',
      }} className="spin" />
      <div style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--c-green)' }}>
        WORLDVIEW INITIALIZING
      </div>
      <div style={{ fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(0,255,65,0.4)' }}>
        LOADING ORBITAL ASSETS...
      </div>
    </div>
  )
}

function AlertFeed({ alerts }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 46, right: 220,
      width: 270,
      zIndex: 150,
      pointerEvents: 'none',
    }}>
      {alerts.slice(-5).reverse().map((alert, i) => (
        <div
          key={alert.id || i}
          className={`alert-item ${alert.type === 'seismic' ? 'critical' : 'info'}`}
          style={{
            background: 'rgba(0,8,0,0.88)',
            padding: '5px 8px',
            marginBottom: 3,
            fontSize: '8px',
            letterSpacing: '0.07em',
            opacity: 1 - i * 0.18,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div style={{
            color: alert.type === 'seismic' ? 'var(--c-red)' : 'var(--c-amber)',
            marginBottom: 2, fontSize: '7px', letterSpacing: '0.12em',
          }}>
            ▶ {alert.type?.toUpperCase()} ALERT
          </div>
          <div style={{ color: 'var(--c-green)' }}>{alert.message}</div>
        </div>
      ))}
    </div>
  )
}

function PanopticOverlay({ density }) {
  // Stub: render fake bounding boxes
  const count = Math.max(1, Math.floor(density / 10))
  const labels = ['VEH', 'BLDG', 'VESSEL', 'AIRCRAFT', 'INFRA', 'CROWD', 'CONVOY']
  const boxes = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 15 + ((i * 137) % 70),
    y: 15 + ((i * 97)  % 65),
    w: 4  + ((i * 41)  % 8),
    h: 3  + ((i * 53)  % 6),
    label: labels[i % labels.length],
    conf: 75 + ((i * 17) % 24),
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 190 }}>
      {boxes.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: `${b.x}%`, top: `${b.y}%`,
          width: `${b.w}%`, height: `${b.h}%`,
          border: '1px solid rgba(0,229,255,0.65)',
          boxShadow: '0 0 6px rgba(0,229,255,0.25)',
        }}>
          <div style={{
            position: 'absolute', top: -13, left: 0,
            fontSize: '7px', color: 'var(--c-cyan)',
            letterSpacing: '0.07em',
            background: 'rgba(0,0,0,0.75)',
            padding: '0 4px', whiteSpace: 'nowrap',
          }}>
            {b.label} {b.conf}%
          </div>
        </div>
      ))}
      <div style={{
        position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)',
        fontSize: '8px', color: 'rgba(0,229,255,0.6)',
        letterSpacing: '0.15em', background: 'rgba(0,0,0,0.7)',
        padding: '3px 12px', border: '1px solid rgba(0,229,255,0.3)',
      }}>
        PANOPTIC OD · {count} DETECTIONS · ⚠ STUB
      </div>
    </div>
  )
}
