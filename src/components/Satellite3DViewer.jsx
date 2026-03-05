/**
 * Satellite3DViewer — 3D model viewer for satellite detail panel.
 * Loads OBJ from public/models/Satellite_v1_L3... with space background.
 * Same orbit/drag pattern as Aircraft3DViewer.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const SATELLITE_OBJ_FOLDER = '/models/Satellite_v1_L3.123c24489c18-f4e2-42f2-abc7-9a6d4abbeae2'
const SATELLITE_MTL_FILE = '10477_Satellite_v1_L3.mtl'
const SATELLITE_OBJ_FILE = '10477_Satellite_v1_L3.obj'

function applyOrbit(camera, { theta, phi, radius }) {
  camera.position.set(
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta)
  )
  camera.lookAt(0, 0, 0)
}

function normalizeSatelliteModel(model) {
  const box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const scale = 2.2 / maxDim
  model.scale.setScalar(scale)
  model.rotation.x = 0
  model.rotation.y = 0
  model.rotation.z = 0
  model.userData.baseRotation = { x: 0, y: 0, z: 0 }
  return model
}

async function loadSatelliteObj(objFolder, mtlFile, objFile) {
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
    return normalizeSatelliteModel(model)
  } catch (err) {
    console.warn('[Satellite3DViewer] loadObj:', err?.message || err)
    return null
  }
}

// Simple starfield background (small points in the scene)
function addStarfield(scene, count = 180) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    pos[i] = (Math.random() - 0.5) * 40
    pos[i + 1] = (Math.random() - 0.5) * 40
    pos[i + 2] = (Math.random() - 0.5) * 40
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.computeBoundingSphere()
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  })
  const stars = new THREE.Points(geo, mat)
  scene.add(stars)
}

export default function Satellite3DViewer({ satellite, width = 380, height = 270 }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const orbitRef = useRef({ theta: 0.55, phi: 0.28, radius: 5.0 })
  const autoRotRef = useRef(true)
  const idleTimerRef = useRef(null)
  const dragRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000510, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 100)

    // Space-style lights (cool, one main sun)
    scene.add(new THREE.AmbientLight(0x223344, 0.5))
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
    sun.position.set(4, 3, 5)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x4488aa, 0.4)
    fill.position.set(-3, 2, -2)
    scene.add(fill)

    addStarfield(scene)

    let rafId = null
    let mounted = true

    ;(async () => {
      const model = await loadSatelliteObj(SATELLITE_OBJ_FOLDER, SATELLITE_MTL_FILE, SATELLITE_OBJ_FILE)
      if (!mounted) return
      if (model) scene.add(model)
      sceneRef.current = { renderer, scene, camera, aircraft: model, animId: rafId }

      const tick = () => {
        rafId = requestAnimationFrame(tick)
        if (autoRotRef.current) orbitRef.current.theta += 0.005
        applyOrbit(camera, orbitRef.current)
        const ac = sceneRef.current?.aircraft
        if (ac) {
          const t = Date.now() / 1000
          ac.rotation.y = t * 0.15
        }
        renderer.render(scene, camera)
      }
      tick()
      setReady(true)
    })()

    return () => {
      mounted = false
      if (rafId) cancelAnimationFrame(rafId)
      clearTimeout(idleTimerRef.current)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [satellite?.id, width, height])

  const startDrag = (x, y) => {
    dragRef.current = true
    lastRef.current = { x, y }
    autoRotRef.current = false
    clearTimeout(idleTimerRef.current)
  }
  const moveDrag = (x, y) => {
    if (!dragRef.current) return
    const dx = (x - lastRef.current.x) * 0.010
    const dy = (y - lastRef.current.y) * 0.008
    orbitRef.current.theta -= dx
    orbitRef.current.phi = Math.max(-1.3, Math.min(1.3, orbitRef.current.phi - dy))
    lastRef.current = { x, y }
  }
  const endDrag = () => {
    dragRef.current = false
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => { autoRotRef.current = true }, 3000)
  }
  const onWheel = (e) => {
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
        background: '#000510',
      }}
      onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
      onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
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
            background: '#000510',
            color: 'rgba(0,229,255,0.5)',
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
