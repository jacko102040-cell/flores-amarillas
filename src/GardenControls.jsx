import { useEffect, useRef } from 'react'

/** A dedicated hit area leaves scrolling and the dedication independent.
 * Pointer capture keeps a drag alive when a finger crosses its boundary.
 * Supports multi-touch pinch-to-zoom and mouse wheel zoom. */
export default function GardenControls({ rotation, config, active, cycle, exploreMode }) {
  const activePointers = useRef(new Map())
  const initialPinchDist = useRef(null)
  const initialZoom = useRef(1)
  const surface = useRef(null)

  useEffect(() => {
    rotation.current.yaw = Math.round(rotation.current.yaw / (Math.PI * 2)) * Math.PI * 2
    rotation.current.pitch = 0
    rotation.current.zoom = 1
    rotation.current.dragging = false
    activePointers.current.clear()
    initialPinchDist.current = null
  }, [cycle, active, rotation])

  function getPinchDistance() {
    const points = Array.from(activePointers.current.values())
    if (points.length < 2) return null
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  function handlePointerDown(event) {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (surface.current) surface.current.setPointerCapture(event.pointerId)
    rotation.current.dragging = true

    if (activePointers.current.size === 2) {
      initialPinchDist.current = getPinchDistance()
      initialZoom.current = rotation.current.zoom ?? 1
    }
  }

  function handlePointerMove(event) {
    if (!activePointers.current.has(event.pointerId)) return
    const prev = activePointers.current.get(event.pointerId)
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (activePointers.current.size === 2 && initialPinchDist.current) {
      const currentDist = getPinchDistance()
      if (currentDist && initialPinchDist.current > 0) {
        const scaleFactor = currentDist / initialPinchDist.current
        const newZoom = Math.max(0.55, Math.min(1.85, initialZoom.current * scaleFactor))
        rotation.current.zoom = newZoom
      }
    } else if (activePointers.current.size === 1) {
      const bounds = surface.current ? surface.current.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight }
      rotation.current.yaw += (event.clientX - prev.x) / bounds.width * Math.PI * 2 * config.interaction.dragSensitivity
      rotation.current.pitch = Math.max(-config.interaction.maxTilt, Math.min(config.interaction.maxTilt,
        rotation.current.pitch + (event.clientY - prev.y) / bounds.height * 0.65))
    }
  }

  function handlePointerUp(event) {
    activePointers.current.delete(event.pointerId)
    if (surface.current?.hasPointerCapture(event.pointerId)) {
      surface.current.releasePointerCapture(event.pointerId)
    }
    if (activePointers.current.size < 2) {
      initialPinchDist.current = null
    }
    if (activePointers.current.size === 0) {
      rotation.current.dragging = false
    }
  }

  function handleWheel(event) {
    event.preventDefault()
    const delta = event.deltaY * -0.0015
    const currentZoom = rotation.current.zoom ?? 1
    rotation.current.zoom = Math.max(0.55, Math.min(1.85, currentZoom + delta))
  }

  if (!active) return null
  return <div ref={surface} className={`garden-controls ${exploreMode ? 'explore-active' : ''}`} role="group" tabIndex={0}
    aria-label={config.ui.rotateLabel} aria-describedby="garden-gesture-hint"
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onPointerCancel={handlePointerUp}
    onLostPointerCapture={handlePointerUp}
    onWheel={handleWheel}
    onBlur={() => { activePointers.current.clear(); rotation.current.dragging = false }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '-'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') {
        rotation.current.yaw = Math.round(rotation.current.yaw / (Math.PI * 2)) * Math.PI * 2
        rotation.current.pitch = 0
        rotation.current.zoom = 1
      }
      if (event.key === 'ArrowLeft') rotation.current.yaw -= 0.18
      if (event.key === 'ArrowRight') rotation.current.yaw += 0.18
      if (event.key === 'ArrowUp') rotation.current.pitch = Math.max(-config.interaction.maxTilt, rotation.current.pitch - 0.06)
      if (event.key === 'ArrowDown') rotation.current.pitch = Math.min(config.interaction.maxTilt, rotation.current.pitch + 0.06)
      if (event.key === '+' || event.key === '=') rotation.current.zoom = Math.min(1.85, (rotation.current.zoom ?? 1) + 0.1)
      if (event.key === '-') rotation.current.zoom = Math.max(0.55, (rotation.current.zoom ?? 1) - 0.1)
    }} />
}
