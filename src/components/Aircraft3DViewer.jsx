import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { getAirlineInfo } from '../data/airlineColors'

// Model paths: try GLB first, then OBJ+MTL (see public/models/README.md)
const DEFAULT_GLB_PATH = '/models/airliner.glb'
const OBJ_FOLDER = '/models/Airplane_v1_L1.123c4a6fedec-1680-4a36-a228-b0d440a4f280'
const OBJ_MTL_FILE = '11803_Airplane_v1_l1.mtl'
const OBJ_FILE = '11803_Airplane_v1_l1.obj'

// ── Realistic procedural airliner (B737/A320-style narrowbody) ─────────────────
// Fuselage along Z (nose = +Z), wings on X, Y = up. Proportions and sweep match real jets.
function buildAircraft(primary, secondary) {
  const g = new THREE.Group()

  const body   = new THREE.MeshPhongMaterial({ color: primary,   specular: 0x445544, shininess: 85 })
  const accent = new THREE.MeshPhongMaterial({ color: secondary, specular: 0x223322, shininess: 60 })
  const silver = new THREE.MeshPhongMaterial({ color: 0xaaaaaa,   specular: 0x666666, shininess: 140 })
  const white  = new THREE.MeshPhongMaterial({ color: 0xf5f5f5,   specular: 0x555555, shininess: 100 })
  const dark   = new THREE.MeshPhongMaterial({ color: 0x1a1a1a,   specular: 0x111111, shininess: 30 })

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    g.add(m)
    return m
  }

  // ── Fuselage: 3 segments (nose barrel, mid, tail taper) + ogive nose
  const rNose = 0.072
  const rMid  = 0.065
  const rTail = 0.048
  add(new THREE.CylinderGeometry(rNose, rMid, 1.0, 24), body, 0, 0, 0.85, Math.PI / 2, 0, 0)
  add(new THREE.CylinderGeometry(rMid, rMid, 1.4, 24), body, 0, 0, 0, Math.PI / 2, 0, 0)
  add(new THREE.CylinderGeometry(rMid, rTail, 1.2, 24), body, 0, 0, -1.0, Math.PI / 2, 0, 0)
  // Nose cone (smooth ogive-style cone)
  add(new THREE.ConeGeometry(rNose, 0.32, 24), white, 0, 0, 1.58, Math.PI / 2, 0, 0)
  // Tail cone (short taper)
  add(new THREE.ConeGeometry(rTail, 0.02, 24), body, 0, 0, -1.72, -Math.PI / 2, 0, 0)

  // Fuselage stripe (cheat line)
  add(new THREE.BoxGeometry(0.002, 0.058, 2.6), accent, rMid + 0.001, 0, -0.1, Math.PI / 2, 0, 0)

  // ── Main wings: swept, slight dihedral, with winglets
  const sweepRad = 0.22
  const wingSpan = 1.28
  const chord    = 0.38
  const wingGeo  = new THREE.BoxGeometry(wingSpan / 2, 0.022, chord)
  add(wingGeo, body,  wingSpan / 4, -0.012, 0.02, 0,  sweepRad, 0)
  add(wingGeo, body, -wingSpan / 4, -0.012, 0.02, 0, -sweepRad, 0)
  // Leading edge strip
  const leGeo = new THREE.BoxGeometry(wingSpan / 2 - 0.02, 0.024, 0.055)
  add(leGeo, accent,  wingSpan / 4, -0.012, 0.22, 0,  sweepRad, 0)
  add(leGeo, accent, -wingSpan / 4, -0.012, 0.22, 0, -sweepRad, 0)
  // Winglets (angled up and out)
  const wlGeo = new THREE.BoxGeometry(0.022, 0.18, 0.08)
  add(wlGeo, accent,  wingSpan / 2 + 0.02, 0.08, -0.06, 0.35,  sweepRad, 0)
  add(wlGeo, accent, -wingSpan / 2 - 0.02, 0.08, -0.06, 0.35, -sweepRad, 0)

  // ── Vertical stabilizer (fin + rudder area)
  const finGeo = new THREE.BoxGeometry(0.022, 0.48, 0.36)
  add(finGeo, body, 0, 0.28, -1.18, 0, -0.08, 0)
  add(new THREE.BoxGeometry(0.02, 0.15, 0.12), accent, 0, 0.52, -1.08, 0, -0.08, 0)

  // ── Horizontal stabilizers (tail plane, swept)
  const hSpan = 0.52
  const hStabGeo = new THREE.BoxGeometry(hSpan / 2, 0.018, 0.2)
  add(hStabGeo, body,  hSpan / 4, 0.02, -1.14, 0,  0.12, 0)
  add(hStabGeo, body, -hSpan / 4, 0.02, -1.14, 0, -0.12, 0)

  // ── Engine nacelles (underwing, cylindrical + intake lip)
  const engRad = 0.052
  const engLen = 0.42
  const engGeo = new THREE.CylinderGeometry(engRad, engRad * 0.92, engLen, 20)
  add(engGeo, silver,  wingSpan / 4 + 0.08, -0.11, 0.08, Math.PI / 2, 0, 0)
  add(engGeo, silver, -wingSpan / 4 - 0.08, -0.11, 0.08, Math.PI / 2, 0, 0)
  // Intake lip (front ring)
  const lipGeo = new THREE.TorusGeometry(engRad + 0.006, 0.012, 12, 24)
  add(lipGeo, white,  wingSpan / 4 + 0.08, -0.11, 0.28, Math.PI / 2, 0, 0)
  add(lipGeo, white, -wingSpan / 4 - 0.08, -0.11, 0.28, Math.PI / 2, 0, 0)
  // Fan (dark disk visible in intake)
  const fanGeo = new THREE.CylinderGeometry(engRad * 0.7, engRad * 0.7, 0.008, 24)
  add(fanGeo, dark,  wingSpan / 4 + 0.08, -0.11, 0.295, Math.PI / 2, 0, 0)
  add(fanGeo, dark, -wingSpan / 4 - 0.08, -0.11, 0.295, Math.PI / 2, 0, 0)

  // Slight nose-up attitude
  g.rotation.x = 0.04
  return g
}

// ── Camera orbit from spherical coords ────────────────────────────────────────
function applyOrbit(camera, { theta, phi, radius }) {
  camera.position.set(
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta)
  )
  camera.lookAt(0, 0, 0)
}

// Base orientation for loaded OBJ/GLB (nose was Y/up → lay down + flip to +Z). Use +90° X so it's right-side up.
const LOADED_MODEL_BASE_ROTATION = { x: Math.PI / 2 + 0.04, y: Math.PI, z: 0 }

// ── Normalize scale and orientation for any loaded model ────────────────────────
function normalizeModel(model) {
  const box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const scale = 2.2 / maxDim
  model.scale.setScalar(scale)
  model.rotation.x = LOADED_MODEL_BASE_ROTATION.x
  model.rotation.y = LOADED_MODEL_BASE_ROTATION.y
  model.rotation.z = LOADED_MODEL_BASE_ROTATION.z
  model.userData.baseRotation = LOADED_MODEL_BASE_ROTATION  // so tick re-applies it every frame
  return model
}

// ── Load GLB model; returns null on failure ────────────────────────────────────
async function loadGlbModel(path) {
  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await new Promise((resolve, reject) => {
      loader.load(path, resolve, undefined, reject)
    })
    const model = gltf.scene
    if (!model) return null
    return normalizeModel(model)
  } catch {
    return null
  }
}

// ── Load OBJ + MTL (folder with .obj, .mtl, and texture JPGs); returns null on failure ─
async function loadObjModel(objFolder, mtlFile, objFile) {
  try {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    const { MTLLoader } = await import('three/examples/jsm/loaders/MTLLoader.js')
    const path = objFolder.endsWith('/') ? objFolder : objFolder + '/'
    const materials = await new Promise((resolve, reject) => {
      new MTLLoader().setPath(path).load(mtlFile, resolve, undefined, reject)
    })
    materials.preload()
    const model = await new Promise((resolve, reject) => {
      new OBJLoader().setMaterials(materials).setPath(path).load(objFile, resolve, undefined, reject)
    })
    if (!model) return null
    return normalizeModel(model)
  } catch {
    return null
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Aircraft3DViewer({ flight, width = 380, height = 280 }) {
  const mountRef     = useRef(null)
  const sceneRef     = useRef(null)
  const orbitRef     = useRef({ theta: 0.55, phi: 0.28, radius: 5.0 })
  const autoRotRef   = useRef(true)
  const idleTimerRef = useRef(null)
  const dragRef      = useRef(false)
  const lastRef      = useRef({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)

  // Build or rebuild scene when airline changes
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const info      = getAirlineInfo(flight?.callsign || '')
    const primary   = new THREE.Color(info?.primary   || '#00aa33')
    const secondary = new THREE.Color(info?.secondary || '#006622')

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000a00, 1)
    el.appendChild(renderer.domElement)

    // Scene + Camera
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 100)

    // Lights
    scene.add(new THREE.AmbientLight(0x223322, 0.7))
    const sun = new THREE.DirectionalLight(0xfff8e8, 1.5)
    sun.position.set(3, 4, 3)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x112255, 0.55)
    fill.position.set(-3, 1, -1)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0x003311, 0.45)
    rim.position.set(0, -2, -4)
    scene.add(rim)

    // Subtle ground grid
    const grid = new THREE.GridHelper(8, 24, 0x002200, 0x001100)
    grid.position.y = -1.2
    scene.add(grid)

    const basePitchRef = { current: 0.04 }
    let aircraft = null
    let rafId = null
    let mounted = true

    const tryLoadModel = async () => {
      let model = await loadGlbModel(DEFAULT_GLB_PATH)
      if (!model) model = await loadObjModel(OBJ_FOLDER, OBJ_MTL_FILE, OBJ_FILE)
      return model
    }

    ;(async () => {
      const loaded = await tryLoadModel()
      if (!mounted) return
      aircraft = loaded || buildAircraft(primary, secondary)
      const pitch = 0.04 + (flight?.vertRate != null ? Math.max(-0.15, Math.min(0.15, flight.vertRate / 10 * 0.15)) : 0)
      basePitchRef.current = pitch
      if (aircraft.userData.baseRotation) {
        aircraft.rotation.x = aircraft.userData.baseRotation.x
        aircraft.rotation.y = aircraft.userData.baseRotation.y
        aircraft.rotation.z = aircraft.userData.baseRotation.z
      } else {
        aircraft.rotation.x = pitch
      }
      scene.add(aircraft)
      sceneRef.current = { renderer, scene, camera, aircraft, basePitchRef, animId: rafId }

      const tick = () => {
        rafId = requestAnimationFrame(tick)
        if (autoRotRef.current) orbitRef.current.theta += 0.006
        applyOrbit(camera, orbitRef.current)
        const ac = sceneRef.current?.aircraft
        if (ac) {
          const t = Date.now() / 1000
          const base = ac.userData.baseRotation
          const pitchWobble = Math.sin(t * 0.9) * 0.028
          const bankWobble = Math.sin(t * 0.6) * 0.022
          if (base) {
            ac.rotation.x = base.x + (basePitchRef.current - 0.04) + pitchWobble
            ac.rotation.y = base.y
            ac.rotation.z = base.z + bankWobble
          } else {
            ac.rotation.x = basePitchRef.current + pitchWobble
            ac.rotation.z = bankWobble
          }
        }
        renderer.render(scene, camera)
      }
      tick()
      el.appendChild(renderer.domElement)
      setReady(true)
    })()

    return () => {
      mounted = false
      if (rafId) cancelAnimationFrame(rafId)
      clearTimeout(idleTimerRef.current)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [flight?.callsign, width, height])  // rebuild on airline switch

  // Live pitch update (climb/descent) + store base pitch for in-flight motion
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref?.aircraft) return
    const pitch = 0.04 + (flight?.vertRate != null ? Math.max(-0.15, Math.min(0.15, flight.vertRate / 10 * 0.15)) : 0)
    ref.basePitchRef.current = pitch
  }, [flight?.vertRate])

  // ── Orbit interaction handlers ────────────────────────────────────────────
  const startDrag = (x, y) => {
    dragRef.current    = true
    lastRef.current    = { x, y }
    autoRotRef.current = false
    clearTimeout(idleTimerRef.current)
  }
  const moveDrag = (x, y) => {
    if (!dragRef.current) return
    const dx = (x - lastRef.current.x) * 0.010
    const dy = (y - lastRef.current.y) * 0.008
    orbitRef.current.theta -= dx
    orbitRef.current.phi    = Math.max(-1.3, Math.min(1.3, orbitRef.current.phi - dy))
    lastRef.current = { x, y }
  }
  const endDrag = () => {
    dragRef.current = false
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => { autoRotRef.current = true }, 3000)
  }
  const onWheel = e => {
    e.preventDefault()
    orbitRef.current.radius = Math.max(2.0, Math.min(10, orbitRef.current.radius + e.deltaY * 0.006))
  }

  return (
    <div
      ref={mountRef}
      style={{
        width,
        height,
        cursor: ready ? (dragRef.current ? 'grabbing' : 'grab') : 'wait',
        userSelect: 'none',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        background: '#000a00',
      }}
      onMouseDown={e => startDrag(e.clientX, e.clientY)}
      onMouseMove={e => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
      onTouchEnd={endDrag}
      onWheel={onWheel}
    >
      {!ready && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000a00',
            color: 'rgba(0,255,65,0.5)',
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          LOADING MODEL…
        </div>
      )}
    </div>
  )
}
