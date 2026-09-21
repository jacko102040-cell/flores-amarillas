import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import config from '../config.json'
import OverlayUI from './OverlayUI'
import GardenControls from './GardenControls'
import { useGiftAudio, useParallax } from './interaction'
import { fill } from './text'

const Scene3D = lazy(() => import('./Scene3D'))
class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export default function App() {
  const [stage, setStage] = useState('sealed')
  const [cycle, setCycle] = useState(0)
  const [sceneReady, setSceneReady] = useState(false)
  const reducedMotion = useReducedMotion()
  const { input, requestOrientation } = useParallax(!reducedMotion)
  const audio = useGiftAudio(config.audio)
  const entered = stage !== 'sealed'
  const startLock = useRef(false)
  const rotation = useRef({ yaw: 0, pitch: 0, dragging: false })
  const onReady = useCallback(() => setSceneReady(true), [])

  useEffect(() => {
    document.title = fill(config.ui.pageTitle, config.settings)
    document.documentElement.lang = config.settings.language
    document.querySelector('meta[name="description"]').content = config.ui.description
  }, [])
  useEffect(() => {
    if (stage !== 'blooming') return
    const lastBloomDelay = Math.max(0, ...[...config.garden.plants, ...(config.garden.companions ?? [])].map(plant => plant.delay))
    const timer = window.setTimeout(() => setStage('revealed'), reducedMotion ? 350 : (config.animation.bloomDuration + lastBloomDelay) * 1000 + 450)
    return () => window.clearTimeout(timer)
  }, [stage, cycle, reducedMotion])

  function start() {
    if (startLock.current) return
    startLock.current = true
    // Both calls run inside the click. Awaiting permission before play() would
    // lose the original user activation on iOS. HTMLMediaElement needs play(),
    // not a separate Web Audio AudioContext.
    audio.play()
    requestOrientation()
    setStage('blooming')
  }
  function replay() { setCycle(value => value + 1); setStage('blooming') }
  const cssVars = Object.fromEntries(Object.entries(config.ui.colors).map(([key, value]) => [`--${key}`, value]))
  const fallback = <div className="scene-fallback" role="status">{config.ui.webglFallback}</div>
  return (
    <main className={`gift ${entered ? 'is-open' : ''}`} style={cssVars}>
      <div className="spring-wash" aria-hidden="true" /><div className="grain" aria-hidden="true" />
      <div className="scene-shell" aria-hidden="true">
        <SceneBoundary fallback={fallback} onFailure={onReady}>
          <Suspense fallback={null}><Scene3D config={config} active={entered} cycle={cycle} input={input}
            rotation={rotation}
            reducedMotion={!!reducedMotion} onReady={onReady} onFailure={onReady} fallback={fallback} /></Suspense>
        </SceneBoundary>
      </div>
      <GardenControls rotation={rotation} config={config} active={entered && sceneReady} cycle={cycle} />
      <OverlayUI config={config} stage={stage} cycle={cycle} ready={sceneReady} reducedMotion={!!reducedMotion}
        onResetView={() => {
          rotation.current.yaw = Math.round(rotation.current.yaw / (Math.PI * 2)) * Math.PI * 2
          rotation.current.pitch = 0
        }}
        audio={audio} onStart={start} onReplay={replay} />
    </main>
  )
}
