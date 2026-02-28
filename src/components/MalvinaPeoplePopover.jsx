import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MALVINA_PEOPLE } from '../data/malvinaResidence'

const MONO = "'JetBrains Mono','Courier New',monospace"
const CARD_W = 88
const CARD_H = 100
const OFFSET = 200  // longer lines — cards pop out more

// Base positions: 4 cards around the marker (house)
function getBasePositions(markerX, markerY) {
  return [
    { x: markerX - OFFSET - CARD_W / 2, y: markerY - OFFSET - CARD_H / 2 },
    { x: markerX + OFFSET - CARD_W / 2, y: markerY - OFFSET - CARD_H / 2 },
    { x: markerX - OFFSET - CARD_W / 2, y: markerY + OFFSET - CARD_H / 2 },
    { x: markerX + OFFSET - CARD_W / 2, y: markerY + OFFSET - CARD_H / 2 },
  ]
}

// Floating drift per card (different phase each) — keeps lines attached to cards
function getFloatOffset(t, i) {
  const speed = 0.6
  const radiusX = 14
  const radiusY = 10
  const phase = i * 1.3
  return {
    x: radiusX * Math.sin(t * speed + phase),
    y: radiusY * Math.cos(t * speed + phase * 0.7),
  }
}

export default function MalvinaPeoplePopover({ markerScreenPos, filterStyle, onClose }) {
  const people = MALVINA_PEOPLE
  const [t, setT] = useState(0)

  const mx = markerScreenPos?.x ?? 0
  const my = markerScreenPos?.y ?? 0
  const basePositions = useMemo(
    () => getBasePositions(mx, my),
    [mx, my]
  )

  // Animate float — update time so positions drift
  useEffect(() => {
    let rafId
    const start = performance.now()
    const tick = () => {
      setT((performance.now() - start) / 1000)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Current positions = base + float offset (lines and cards use these)
  const positions = basePositions.map((p, i) => {
    const d = getFloatOffset(t, i)
    return { x: p.x + d.x, y: p.y + d.y }
  })
  const lineEnds = positions.map((p) => ({ x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 }))

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10_000_000,
        background: 'rgba(0,0,0,0.4)',
        cursor: 'pointer',
      }}
    >
      {/* SVG: lines from house (marker) to each photo card */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {lineEnds.map((end, i) => (
          <line
            key={i}
            x1={mx}
            y1={my}
            x2={end.x}
            y2={end.y}
            stroke="rgba(0,255,65,0.6)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        ))}
      </svg>

      {/* House marker dot */}
      <div
        style={{
          position: 'fixed',
          left: mx - 8,
          top: my - 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'rgba(255,176,0,0.9)',
          border: '2px solid #00ff41',
          pointerEvents: 'none',
          boxShadow: '0 0 12px rgba(0,255,65,0.5)',
        }}
      />

      {/* Photo cards — click stops propagation so we don't close when clicking a card */}
      {people.map((person, i) => {
        const pos = positions[i]
        return (
          <div
            key={person.name}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: CARD_W,
              pointerEvents: 'all',
              cursor: 'default',
              background: 'rgba(0,12,0,0.94)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              padding: 6,
              fontFamily: MONO,
              boxShadow: '0 0 20px rgba(0,255,65,0.15)',
            }}
          >
            <div
              style={{
                width: CARD_W - 12,
                height: CARD_W - 12,
                marginBottom: 6,
                borderRadius: 4,
                overflow: 'hidden',
                filter: filterStyle || 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,20,0,0.8)',
                border: '1px solid rgba(0,255,65,0.2)',
              }}
            >
              {person.photo ? (
                <img
                  src={person.photo}
                  alt={person.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 36,
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 700,
                  }}
                >
                  ?
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#00ff41',
                textAlign: 'center',
                letterSpacing: '0.05em',
                lineHeight: 1.3,
              }}
            >
              {person.name}
            </div>
          </div>
        )
      })}

      {/* Hint */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          color: 'rgba(0,255,65,0.5)',
          letterSpacing: '0.12em',
          pointerEvents: 'none',
        }}
      >
        CLICK OUTSIDE TO CLOSE
      </div>
    </div>,
    document.body
  )
}
