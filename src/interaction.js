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
    const base = import.meta.env.BASE_URL || '/'
    const filename = settings.filename ? settings.filename.replace(/^\/+/, '') : 'flores-amarillas.mp3'
    const audioSrc = `${base.replace(/\/$/, '')}/${filename}`
    
    console.log('🎵 Cargando audio:', audioSrc)
    const audio = new Audio(audioSrc)
    audio.preload = 'auto'
    audio.loop = true
    audio.volume = clamp(settings.volume ?? 0.30, 0, 1)
    ref.current = audio

    const playing = () => {
      console.log('🎵 Audio reproduciendo con éxito')
      setStatus('playing')
    }
    const paused = () => setStatus('paused')
    const failed = (e) => {
      console.warn('⚠️ Error al reproducir audio primario, intentando respaldo...', e)
      // Fallback to primavera.wav if flores-amarillas.mp3 has any loading issue
      if (!audio.src.includes('primavera.wav')) {
        const fallbackSrc = `${base.replace(/\/$/, '')}/primavera.wav`
        console.log('🎵 Intentando archivo alternativo:', fallbackSrc)
        audio.src = fallbackSrc
        audio.load()
      } else {
        setStatus('unavailable')
      }
    }

    audio.addEventListener('playing', playing)
    audio.addEventListener('pause', paused)
    audio.addEventListener('error', failed)
    
    const visibility = () => { if (document.hidden && !audio.paused) audio.pause() }
    document.addEventListener('visibilitychange', visibility)

    return () => {
      audio.removeEventListener('playing', playing)
      audio.removeEventListener('pause', paused)
      audio.removeEventListener('error', failed)
      document.removeEventListener('visibilitychange', visibility)
      audio.pause()
      ref.current = null
    }
  }, [settings.filename, settings.volume])

  const play = useCallback(() => {
    const audio = ref.current
    if (!audio) return
    console.log('🎵 Solicitando inicio de audio...')
    const promise = audio.play()
    if (promise !== undefined) {
      promise
        .then(() => {
          setStatus('playing')
        })
        .catch(error => {
          console.warn('⚠️ Reproducción automática bloqueada por el navegador:', error.name, error.message)
          if (error.name === 'NotAllowedError') {
            setStatus('blocked')
          } else {
            setStatus('unavailable')
          }
        })
    }
  }, [])

  const toggle = useCallback(() => {
    if (!ref.current) return
    if (ref.current.paused) {
      play()
    } else {
      ref.current.pause()
      setStatus('paused')
    }
  }, [play])

  return { status, play, toggle }
}
