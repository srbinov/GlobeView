import { useState, useEffect } from 'react'

const CITIES = [
  { name: 'Austin',        lat: 30.2672,  lon: -97.7431,  alt: 2.2 },
  { name: 'San Francisco', lat: 37.7749,  lon: -122.4194, alt: 2.0 },
  { name: 'New York',      lat: 40.7128,  lon: -74.0060,  alt: 2.0 },
  { name: 'Tokyo',         lat: 35.6762,  lon: 139.6503,  alt: 2.0 },
  { name: 'London',        lat: 51.5074,  lon: -0.1278,   alt: 2.0 },
  { name: 'Paris',         lat: 48.8566,  lon: 2.3522,    alt: 2.0 },
  { name: 'Dubai',         lat: 25.2048,  lon: 55.2708,   alt: 2.0 },
  { name: 'DC',            lat: 38.9072,  lon: -77.0369,  alt: 2.2 },
]

function pad(n) { return String(n).padStart(2, '0') }

function UtcClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span>
      {pad(t.getUTCHours())}:{pad(t.getUTCMinutes())}:{pad(t.getUTCSeconds())} Z
    </span>
  )
}

export default function BottomBar({ globeRef, alerts = [] }) {
  const [active, setActive] = useState(null)

  const flyTo = (city) => {
    setActive(city.name)
    globeRef.current?.flyTo(city.lat, city.lon, city.alt)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 38,
      zIndex: 100,
      pointerEvents: 'all',
    }}>
      <div className="panel" style={{
        height: '100%',
        borderTop: '1px solid var(--c-border)',
        borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: 4,
      }}>
        {/* Section label */}
        <div style={{
          fontSize: '8px', letterSpacing: '0.12em',
          color: 'var(--c-amber)',
          marginRight: 6, flexShrink: 0,
          borderRight: '1px solid var(--c-border)',
          paddingRight: 10,
          whiteSpace: 'nowrap',
        }}>
          ◈ FAST SLEW
        </div>

        {/* City quick-jump buttons */}
        {CITIES.map(city => (
          <button
            key={city.name}
            className={`city-btn ${active === city.name ? 'active' : ''}`}
            onClick={() => flyTo(city)}
          >
            {city.name.toUpperCase()}
          </button>
        ))}

        {/* Globe reset */}
        <button
          className="city-btn"
          style={{
            marginLeft: 6,
            borderColor: 'rgba(0,229,255,0.3)',
            color: 'var(--c-cyan)',
          }}
          onClick={() => {
            setActive(null)
            globeRef.current?.flyTo(20, 0, 2.5)
          }}
        >
          GLOBAL
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Latest alert */}
        {alerts.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderLeft: '1px solid var(--c-border)',
            paddingLeft: 10,
            maxWidth: 280,
            overflow: 'hidden',
          }}>
            <span className="blink" style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--c-red)',
              flexShrink: 0,
              display: 'inline-block',
            }} />
            <span style={{
              fontSize: '8px', color: 'var(--c-amber)',
              letterSpacing: '0.07em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {alerts[alerts.length - 1]?.message}
            </span>
          </div>
        )}

        {/* UTC clock */}
        <div style={{
          borderLeft: '1px solid var(--c-border)',
          paddingLeft: 10,
          fontSize: '9px', letterSpacing: '0.1em',
          color: 'rgba(0,255,65,0.6)',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <UtcClock />
        </div>
      </div>
    </div>
  )
}
