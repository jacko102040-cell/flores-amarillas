import { useCallback, useEffect, useRef, useState } from 'react'
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export function useParallax(enabled) {
  const input = useRef({ x: 0, y: 0 })
  const [orientationEnabled, setOrientationEnabled] = useState(false)
  const origin = useRef(null)
  useEffect(() => {
    if (!enabled) { input.current = { x: 0, y: 0 }; return }
    let lastPointerTime = -2000
    function pointer(event) {
      lastPointerTime = performance.now()
      input.current.x = clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1)
      input.current.y = clamp(-(event.clientY / window.innerHeight * 2 - 1), -1, 1)
    }
    function orientation(event) {
      if (event.beta == null || event.gamma == null || performance.now() - lastPointerTime < 1500) return
      if (!origin.current) origin.current = { beta: event.beta, gamma: event.gamma }
      const dx = clamp((event.gamma - origin.current.gamma) / 25, -1, 1)
      const dy = clamp((event.beta - origin.current.beta) / 25, -1, 1)
      const angle = (window.screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180
      input.current.x = dx * Math.cos(angle) + dy * Math.sin(angle)
      input.current.y = dx * Math.sin(angle) - dy * Math.cos(angle)
    }
    const reset = () => { origin.current = null; input.current = { x: 0, y: 0 } }
    window.addEventListener('pointermove', pointer, { passive: true })
    window.addEventListener('blur', reset)
    window.addEventListener('orientationchange', reset)
    if (orientationEnabled) window.addEventListener('deviceorientation', orientation, { passive: true })
    return () => {
      window.removeEventListener('pointermove', pointer)
      window.removeEventListener('blur', reset)
      window.removeEventListener('orientationchange', reset)
      window.removeEventListener('deviceorientation', orientation)
    }
  }, [enabled, orientationEnabled])
  const requestOrientation = useCallback(() => {
    if (!enabled || !window.isSecureContext) return
    const Orientation = window.DeviceOrientationEvent
    if (!Orientation) return
    if (typeof Orientation.requestPermission === 'function') {
      try { Orientation.requestPermission().then(result => setOrientationEnabled(result === 'granted')).catch(() => {}) }
      catch { /* Mouse and touch remain available. */ }
    } else setOrientationEnabled(true)
  }, [enabled])
  return { input, requestOrientation }
}

export function useGiftAudio(settings) {
  const ref = useRef(null)
  const [status, setStatus] = useState('paused')
  useEffect(() => {
    const audio = new Audio(`/${settings.filename.replace(/^\/+/, '')}`)
    audio.preload = 'auto'
    audio.loop = true
    audio.volume = clamp(settings.volume, 0, 1)
    ref.current = audio
    const playing = () => setStatus('playing')
    const paused = () => setStatus('paused')
    const failed = () => setStatus('unavailable')
    audio.addEventListener('playing', playing)
    audio.addEventListener('pause', paused)
    audio.addEventListener('error', failed)
    const visibility = () => { if (document.hidden) audio.pause() }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      audio.removeEventListener('playing', playing)
      audio.removeEventListener('pause', paused)
      audio.removeEventListener('error', failed)
      document.removeEventListener('visibilitychange', visibility)
      audio.pause(); audio.removeAttribute('src'); audio.load(); ref.current = null
    }
  }, [settings.filename, settings.volume])
  const play = useCallback(() => {
    const audio = ref.current
    if (!audio) return
    audio.play()?.catch(error => setStatus(error.name === 'NotAllowedError' ? 'blocked' : 'unavailable'))
  }, [])
  const toggle = useCallback(() => { if (ref.current?.paused) play(); else ref.current?.pause() }, [play])
  return { status, play, toggle }
}
