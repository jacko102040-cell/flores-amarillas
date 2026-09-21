import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import FlowerModel, { createSunflowerResources, FallenPetals } from './FlowerModel'
import SunModel from './SunModel'
import CompanionFlowers from './CompanionFlowers'

function GardenFloor({ colors, count }) {
  const grass = useRef()
  const geometry = useMemo(() => {
    const positions = [], indices = []
    for (let i = 0; i <= 5; i++) {
      const t = i / 5, width = 0.036 * (1 - t) + 0.001
      positions.push(-width + t * t * 0.12, t, t * t * 0.20, width + t * t * 0.12, t, t * t * 0.20)
      if (i < 5) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) }
    }
    const blade = new THREE.BufferGeometry()
    blade.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    blade.setIndex(indices)
    blade.computeVertexNormals()
    return blade
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Total grass count spanning central garden + extended infinite meadow
  const totalCount = Math.floor(count * 22) // ~5,280 on desktop, ~2,860 on mobile

  useLayoutEffect(() => {
    if (!grass.current) return
    const dummy = new THREE.Object3D(), shade = new THREE.Color()
    const dark = new THREE.Color(colors.leafDark), light = new THREE.Color(colors.leaf)
    
    const innerCount = Math.floor(totalCount * 0.35)
    const midCount = Math.floor(totalCount * 0.75)

    for (let i = 0; i < totalCount; i++) {
      let x = 0, z = 0
      
      if (i < innerCount) {
        // Inner dense central garden around sunflowers
        const theta = i * Math.PI * (3 - Math.sqrt(5))
        const rRatio = Math.sqrt((i + 0.5) / innerCount)
        x = Math.cos(theta) * rRatio * 3.65
        z = Math.sin(theta) * rRatio * 2.35 - 0.45
      } else if (i < midCount) {
        // Medium meadow coverage (radius 3.5 to 11.5)
        const idx = i - innerCount
        const countMid = midCount - innerCount
        const theta = idx * 2.3999632 // Golden angle
        const r = 3.5 + Math.pow((idx + 0.5) / countMid, 0.75) * 8.0
        x = Math.cos(theta) * r
        z = Math.sin(theta) * r * 0.8 - 0.45
      } else {
        // Extended infinite meadow field (radius 11.5 to 25.0)
        const idx = i - midCount
        const countFar = totalCount - midCount
        const theta = idx * 2.3999632
        const r = 11.5 + Math.pow((idx + 0.5) / countFar, 0.85) * 14.0
        x = Math.cos(theta) * r
        z = Math.sin(theta) * r * 0.85 - 0.45
      }
      
      // Calculate exact surface elevation (mound vs flat infinite plane)
      const dx = x / 3.85
      const dz = (z + 0.45) / 2.65
      const distSq = dx * dx + dz * dz
      let y = -0.135
      if (distSq < 1.0) {
        y = -0.11 + 0.13 * Math.sqrt(1.0 - distSq)
      }

      dummy.position.set(x, y, z)
      const rotY = (i * 1.7) % (Math.PI * 2)
      const rotZ = Math.sin(i * 2.1) * 0.25
      dummy.rotation.set(0, rotY, rotZ)
      
      // Scale variations based on zone
      const hScale = i < innerCount 
        ? 0.7 + (i % 3) * 0.2 
        : 0.8 + (i % 5) * 0.25
      const flexScale = 0.2 + (0.5 + Math.sin(i * 8.7) * 0.5) * 0.45
      dummy.scale.set(hScale, flexScale, 1)
      dummy.updateMatrix()
      grass.current.setMatrixAt(i, dummy.matrix)

      // Color variation between dark leaf green and vibrant light leaf green
      shade.copy(dark).lerp(light, 0.30 + (i % 9) / 11)
      grass.current.setColorAt(i, shade)
    }
    grass.current.instanceMatrix.needsUpdate = true
    grass.current.instanceColor.needsUpdate = true
  }, [totalCount, colors.leaf, colors.leafDark])

  return <>
    {/* Central organic mound */}
    <mesh position={[0, -0.11, -0.45]} scale={[3.85, 0.13, 2.65]} receiveShadow>
      <sphereGeometry args={[1, 48, 16]} />
      <meshStandardMaterial color={colors.ground} roughness={0.95} />
    </mesh>
    
    {/* Infinite Meadow Plane extending to the horizon */}
    <mesh position={[0, -0.135, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[150, 150]} />
      <meshStandardMaterial color={colors.ground} roughness={1} />
    </mesh>

    {/* Grass blades extending across the infinite base */}
    <instancedMesh ref={grass} args={[geometry, null, totalCount]} frustumCulled={false} receiveShadow>
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.9} />
    </instancedMesh>
  </>
}

function Garden({ config, active, cycle, input, reducedMotion, onReady, rotation }) {
  const { size, viewport, gl } = useThree()
  const mobile = size.width < 1000
  const desktopFit = Math.min(1, viewport.width / 9.72)
  const gardenScale = mobile ? Math.min(config.garden.mobileScale, viewport.width / 6.6) : config.garden.desktopScale * desktopFit
  const gardenPosition = mobile
    ? [config.garden.mobilePosition[0], config.garden.mobilePosition[1] + (config.garden.mobileScale - gardenScale) * 3.6, config.garden.mobilePosition[2]]
    : [config.garden.desktopPosition[0] * desktopFit, config.garden.desktopPosition[1], config.garden.desktopPosition[2]]
  const light = useRef()
  const turntable = useRef()
  const target = useMemo(() => new THREE.Vector3(), [])
  const resources = useMemo(() => createSunflowerResources(config.ui.colors), [config.ui.colors])
  useEffect(() => () => resources.dispose(), [resources])
  useEffect(() => { onReady() }, [onReady])
  useFrame(({ camera, clock }, delta) => {
    resources.wind.time.value = clock.elapsedTime
    resources.wind.strength.value = reducedMotion ? 0 : 1
    const damping = 1 - Math.exp(-3 * Math.min(delta, 0.05))
    const turning = rotation.current
    const turnDamping = reducedMotion ? 1 : 1 - Math.exp(-12 * Math.min(delta, 0.05))
    turntable.current.rotation.y = THREE.MathUtils.lerp(turntable.current.rotation.y, turning.yaw, turnDamping)
    turntable.current.rotation.x = THREE.MathUtils.lerp(turntable.current.rotation.x, turning.pitch, turnDamping)
    // Deep background stems swing toward the edge in profile. Make a small,
    // continuous framing correction, preserving the original frontal scale, plus zoom factor.
    const zoomFactor = turning.zoom ?? 1
    const baseScale = (1 - Math.abs(Math.sin(turntable.current.rotation.y)) * (mobile ? 0.15 : 0.06)) * zoomFactor
    turntable.current.scale.setScalar(baseScale)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, reducedMotion || turning.dragging ? 0 : input.current.x * 0.28, damping)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, reducedMotion || turning.dragging ? 0 : input.current.y * 0.20, damping)
    camera.lookAt(target)
    light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, active ? 3.0 : 2.2, damping)
  })
  useEffect(() => { gl.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2)) }, [gl, mobile])
  return <>
    <fog attach="fog" args={[active ? config.ui.colors.springMist : config.ui.colors.backgroundDark, 14, 34]} />
    {config.sun && <SunModel config={config} active={active} cycle={cycle} reducedMotion={reducedMotion} />}
    <ambientLight intensity={active ? 0.75 : 0.28} color={config.ui.colors.ambient} />
    <directionalLight
      ref={light}
      position={[-3.5, 5.5, 5]}
      intensity={2.9}
      color={config.ui.colors.sunlight}
      castShadow
      shadow-mapSize-width={mobile ? 1024 : 2048}
      shadow-mapSize-height={mobile ? 1024 : 2048}
      shadow-camera-near={0.5}
      shadow-camera-far={20}
      shadow-camera-left={-4.5}
      shadow-camera-right={4.5}
      shadow-camera-top={4.5}
      shadow-camera-bottom={-4.5}
      shadow-bias={-0.00008}
    />
    <pointLight position={[3, -1, 3]} intensity={active ? 7 : 3} color={config.ui.colors.glowYellow} />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.8} color={config.ui.colors.sunlight} scale={[6, 9, 1]} position={[-3, 4, 5]} target={[0, 0, 0]} />
      <Lightformer form="circle" intensity={1.5} color={config.ui.colors.ambient} scale={4} position={[4, 1, -2]} target={[0, 0, 0]} />
    </Environment>
    <group position={gardenPosition} scale={gardenScale}>
      <group ref={turntable} position={[0, 2, 0]}><group position={[0, -2, 0]}>
      <GardenFloor colors={config.ui.colors} count={mobile ? config.garden.mobileGrassCount : config.garden.grassCount} />
      <ContactShadows position={[0, -0.10, -0.2]} opacity={0.65} scale={6.5} blur={2.0} far={3.0} resolution={512} color="#1b2b10" />
      <FallenPetals resources={resources} />
      {config.garden.plants.map((plant, index) => <FlowerModel key={index} plant={plant} resources={resources}
        detail={plant.detail && (!mobile || index === config.garden.plants.length - 1)}
        colors={config.ui.colors} active={active} cycle={cycle} reducedMotion={reducedMotion} duration={config.animation.bloomDuration} />)}
      {config.garden.companions?.length > 0 && <CompanionFlowers config={config} resources={resources}
        active={active} cycle={cycle} reducedMotion={reducedMotion} mobile={mobile} />}
      </group></group>
    </group>
    {!reducedMotion && <Sparkles count={mobile ? 30 : 55} scale={[mobile ? 3 : 8, 5, 3]} size={mobile ? 1.8 : 2.2}
      speed={active ? 0.22 : 0.10} opacity={active ? 0.5 : 0.32} color={config.ui.colors.pollen} noise={0.3} />}
  </>
}

export default function Scene3D(props) {
  const [visible, setVisible] = useState(!document.hidden)
  const [lost, setLost] = useState(false)
  const cleanup = useRef(() => {})
  useEffect(() => {
    const change = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => { document.removeEventListener('visibilitychange', change); cleanup.current() }
  }, [])
  if (lost) return props.fallback
  return <Canvas shadows="soft" dpr={[1, 2]} camera={{ position: [0, 0, 8.8], fov: 40, near: 0.1, far: 35 }}
    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    frameloop={visible ? 'always' : 'never'} fallback={<Unavailable onFailure={props.onFailure}>{props.fallback}</Unavailable>}
    onCreated={({ gl }) => {
      gl.setClearColor(0, 0)
      const canvas = gl.domElement
      const lostContext = event => { event.preventDefault(); setLost(true); props.onFailure() }
      canvas.addEventListener('webglcontextlost', lostContext)
      cleanup.current = () => canvas.removeEventListener('webglcontextlost', lostContext)
    }}><Garden {...props} /></Canvas>
}

function Unavailable({ children, onFailure }) {
  useEffect(() => { onFailure() }, [onFailure])
  return children
}
