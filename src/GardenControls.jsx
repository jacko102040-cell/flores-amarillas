import { useEffect, useRef } from 'react'

/** A dedicated hit area leaves scrolling and the dedication independent.
 * Pointer capture keeps a drag alive when a finger crosses its boundary. */
export default function GardenControls({ rotation, config, active, cycle }) {
  const drag = useRef(null), surface = useRef(null)
  useEffect(() => {
    rotation.current.yaw = Math.round(rotation.current.yaw / (Math.PI * 2)) * Math.PI * 2
    rotation.current.pitch = 0; rotation.current.dragging = false
    if (drag.current && surface.current?.hasPointerCapture(drag.current.id)) surface.current.releasePointerCapture(drag.current.id)
    drag.current = null
  }, [cycle, active, rotation])
  function end(event) {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null; rotation.current.dragging = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  if (!active) return null
  return <div ref={surface} className="garden-controls" role="group" tabIndex={0}
    aria-label={config.ui.rotateLabel} aria-describedby="garden-gesture-hint"
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || drag.current) return
      const bounds = event.currentTarget.getBoundingClientRect()
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height }
      rotation.current.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }}
    onPointerMove={event => {
      const previous = drag.current
      if (!previous || previous.id !== event.pointerId) return
      rotation.current.yaw += (event.clientX - previous.x) / previous.width * Math.PI * 2 * config.interaction.dragSensitivity
      rotation.current.pitch = Math.max(-config.interaction.maxTilt, Math.min(config.interaction.maxTilt,
        rotation.current.pitch + (event.clientY - previous.y) / previous.height * 0.65))
      previous.x = event.clientX; previous.y = event.clientY
    }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onBlur={() => { drag.current = null; rotation.current.dragging = false }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') {
        rotation.current.yaw = Math.round(rotation.current.yaw / (Math.PI * 2)) * Math.PI * 2
        rotation.current.pitch = 0
      }
      if (event.key === 'ArrowLeft') rotation.current.yaw -= 0.18
      if (event.key === 'ArrowRight') rotation.current.yaw += 0.18
      if (event.key === 'ArrowUp') rotation.current.pitch = Math.max(-config.interaction.maxTilt, rotation.current.pitch - 0.06)
      if (event.key === 'ArrowDown') rotation.current.pitch = Math.min(config.interaction.maxTilt, rotation.current.pitch + 0.06)
    }}>
    <span id="garden-gesture-hint" className="garden-gesture-hint">{config.ui.rotateHint}</span>
  </div>
}
