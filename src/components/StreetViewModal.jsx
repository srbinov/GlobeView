/**
 * StreetViewModal — real 360° Street View (drag to look around, move via links).
 *
 * When VITE_GOOGLE_MAPS_API_KEY is set: uses Maps JavaScript API StreetViewPanorama
 * for full 3D look-around. Otherwise falls back to Google Maps embed iframe.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MalvinaPeoplePopover from './MalvinaPeoplePopover'
import { MALVINA_RESIDENCE } from '../data/malvinaResidence'

const MONO = "'JetBrains Mono','Courier New',monospace"
const API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY
const MALVINA_NEAR_DEG = 0.0015  // ~150 m — show people button when Street View is this close

function isNearMalvina(lat, lng) {
  const dlat = lat - MALVINA_RESIDENCE.lat
  const dlng = lng - MALVINA_RESIDENCE.lng
  return Math.sqrt(dlat * dlat + dlng * dlng) <= MALVINA_NEAR_DEG
}

function loadGoogleMapsScript(key) {
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve()
  if (window.__gmLoad) return window.__gmLoad
  const p = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`
    script.async = true
    script.defer = true
    script.onload = () => (window.google?.maps ? resolve() : reject(new Error('Google Maps failed to load')))
    script.onerror = () => reject(new Error('Script load failed'))
    document.head.appendChild(script)
  })
  window.__gmLoad = p
  return p
}

export default function StreetViewModal({ lat, lng, onClose, filterStyle }) {
  const containerRef = useRef(null)
  const panoramaRef = useRef(null)
  const [status, setStatus] = useState(API_KEY ? 'loading' : 'iframe')
  const [error, setError] = useState(null)
  const [showPeoplePopup, setShowPeoplePopup] = useState(false)
  const atMalvina = isNearMalvina(lat, lng)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Init real Street View panorama when we have an API key
  useEffect(() => {
    if (!API_KEY || !containerRef.current) return

    let cancelled = false
    setError(null)
    setStatus('loading')

    loadGoogleMapsScript(API_KEY)
      .then(() => {
        if (cancelled || !containerRef.current) return
        const google = window.google
        if (!google?.maps?.StreetViewPanorama) {
          setError('Street View not available')
          setStatus('error')
          return
        }
        const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
          position: { lat, lng },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: false,
          linksControl: true,
          panControl: true,
          enableCloseButton: false,
          showRoadLabels: true,
        })
        panoramaRef.current = panorama
        setStatus('ok')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load Street View')
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
      if (panoramaRef.current) {
        panoramaRef.current = null
      }
    }
  }, [lat, lng])

  // ── Update panorama position when lat/lng change
  useEffect(() => {
    if (status !== 'ok' || !panoramaRef.current || !window.google?.maps) return
    panoramaRef.current.setPosition({ lat, lng })
  }, [lat, lng, status])

  // ── Iframe fallback URL (when no API key or as fallback)
  const iframeSrc = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}&z=17&output=embed`

  const useIframe = status === 'iframe'

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9_999_999,
        background: '#060d06',
        fontFamily: MONO,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.92), transparent)',
          padding: '12px 18px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontSize: 8, color: '#ffb000', letterSpacing: '0.2em', marginBottom: 4 }}>
            ◈ STREET VIEW · 360° PANORAMA
          </div>
          <div style={{ fontSize: 11, color: '#00ff41' }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(0,255,65,0.5)', marginTop: 4, letterSpacing: '0.07em' }}>
            DRAG TO LOOK AROUND · CLICK BLUE LINKS TO MOVE · ESC EXIT
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            pointerEvents: 'all',
            background: 'rgba(0,8,0,0.9)',
            border: '1px solid rgba(0,255,65,0.45)',
            color: '#00ff41',
            fontFamily: MONO,
            fontSize: 10,
            padding: '6px 14px',
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          ✕ EXIT STREET VIEW
        </button>
      </div>

      {/* Loading overlay (API mode) */}
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: 'rgba(6,13,6,0.88)',
            zIndex: 5,
          }}
        >
          <div
            className="spin"
            style={{
              width: 36,
              height: 36,
              border: '2px solid rgba(0,255,65,0.25)',
              borderTop: '2px solid #00ff41',
              borderRadius: '50%',
            }}
          />
          <div style={{ fontSize: 10, color: 'rgba(0,255,65,0.7)', letterSpacing: '0.2em' }}>
            LOADING 360° STREET VIEW...
          </div>
        </div>
      )}

      {/* Error: no panorama or API failed — offer iframe or key hint */}
      {status === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            zIndex: 5,
            background: 'rgba(6,13,6,0.95)',
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(255,176,0,0.9)', letterSpacing: '0.1em', textAlign: 'center' }}>
            {error || 'No Street View here'}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.5)', maxWidth: 320, textAlign: 'center' }}>
            Add VITE_GOOGLE_MAPS_API_KEY to .env and enable Maps JavaScript API for full 360° view.
          </div>
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=streetview&basemap=satellite&center=${lat},${lng}&zoom=17`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00ff41',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '8px 16px',
              border: '1px solid rgba(0,255,65,0.5)',
              background: 'rgba(0,20,0,0.9)',
              textDecoration: 'none',
            }}
          >
            ↗ OPEN IN GOOGLE MAPS
          </a>
        </div>
      )}

      {/* Panorama container (API) — full size so user can drag to look around */}
      {!useIframe && (
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Iframe fallback when no API key or forced fallback */}
      {useIframe && (
        <iframe
          src={iframeSrc}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: 1,
          }}
          allow="fullscreen"
          title="Street View"
        />
      )}

      {/* 👥 Residents button — only when Street View is at/near 3519 Malvina Ct */}
      {atMalvina && status !== 'loading' && (
        <button
          type="button"
          onClick={() => setShowPeoplePopup(true)}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 15,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(0,12,0,0.95)',
            border: '2px solid rgba(0,255,65,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 0 14px rgba(0,255,65,0.35)',
          }}
          title="Residents at this address"
        >
          👥
        </button>
      )}

      {/* People overlay — same as on satellite map; "house" is center of screen (you're standing there) */}
      {showPeoplePopup && (
        <MalvinaPeoplePopover
          markerScreenPos={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          filterStyle={filterStyle}
          onClose={() => setShowPeoplePopup(false)}
        />
      )}
    </div>,
    document.body
  )
}
