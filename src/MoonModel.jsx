import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Procedurally generates high-resolution 512x512 lunar albedo and bump maps
 * with real lunar geography (Maria, Tycho/Copernicus crater ray systems, highlands).
 */
function createMoonTextures() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 1. Lunar Highlands base (pale silver-grey with subtle warmth)
  ctx.fillStyle = '#dbe4ed'
  ctx.fillRect(0, 0, size, size)

  // Subtle fractal noise for rugged highland terrain
  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n = (Math.sin(x * 0.12) * Math.cos(y * 0.14) + Math.sin(x * 0.31 + y * 0.27) * 0.5) * 12
      data[idx] = Math.min(255, Math.max(0, data[idx] + n))
      data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + n * 0.95))
      data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + n * 0.9))
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // 2. Major Lunar Maria (Dark volcanic basalt plains)
  ctx.save()
  ctx.filter = 'blur(16px)'
  ctx.fillStyle = '#67798c'

  // Oceanus Procellarum & Mare Imbrium
  ctx.beginPath()
  ctx.ellipse(190, 170, 95, 75, -0.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(225, 145, 55, 0, Math.PI * 2)
  ctx.fill()

  // Mare Serenitatis & Mare Tranquillitatis
  ctx.beginPath()
  ctx.arc(310, 175, 45, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(335, 235, 50, 40, 0.3, 0, Math.PI * 2)
  ctx.fill()

  // Mare Crisium (isolated distinctive dark oval)
  ctx.beginPath()
  ctx.ellipse(405, 185, 30, 24, -0.2, 0, Math.PI * 2)
  ctx.fill()

  // Mare Fecunditatis & Mare Nectaris
  ctx.beginPath()
  ctx.ellipse(350, 290, 42, 35, 0.4, 0, Math.PI * 2)
  ctx.fill()

  // Mare Nubium & Mare Humorum
  ctx.beginPath()
  ctx.ellipse(180, 310, 48, 38, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(130, 310, 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()

  // 3. Tycho Crater & Ray System (Southern hemisphere: x: 260, y: 395)
  ctx.save()
  const tychoX = 260, tychoY = 395

  // Radiating bright ejecta rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.lineWidth = 1.5
  for (let a = 0; a < Math.PI * 2; a += 0.22) {
    const len = 140 + Math.sin(a * 7) * 90
    ctx.beginPath()
    ctx.moveTo(tychoX, tychoY)
    ctx.lineTo(tychoX + Math.cos(a) * len, tychoY + Math.sin(a) * len)
    ctx.stroke()
  }

  // Tycho crater bright rim
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(tychoX, tychoY, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a99a8'
  ctx.beginPath()
  ctx.arc(tychoX, tychoY, 5, 0, Math.PI * 2)
  ctx.fill()

  // 4. Copernicus Crater (x: 195, y: 220)
  const copX = 195, copY = 220
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 1.2
  for (let a = 0; a < Math.PI * 2; a += 0.35) {
    const len = 70 + Math.sin(a * 5) * 40
    ctx.beginPath()
    ctx.moveTo(copX, copY)
    ctx.lineTo(copX + Math.cos(a) * len, copY + Math.sin(a) * len)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(copX, copY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7a8998'
  ctx.beginPath()
  ctx.arc(copX, copY, 4, 0, Math.PI * 2)
  ctx.fill()

  // 5. Kepler Crater (x: 135, y: 210)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(135, 210, 5, 0, Math.PI * 2)
  ctx.fill()

  // 6. Scattered medium and small craters
  const craters = [
    [290, 110, 7], [350, 140, 6], [160, 120, 8], [210, 95, 6],
    [320, 360, 8], [370, 330, 9], [190, 380, 8], [140, 360, 7],
    [220, 430, 9], [300, 425, 8], [260, 270, 6], [285, 285, 5]
  ]
  for (const [cx, cy, cr] of craters) {
    // Shadow side
    ctx.fillStyle = 'rgba(65, 78, 92, 0.65)'
    ctx.beginPath()
    ctx.arc(cx, cy, cr, 0, Math.PI * 2)
    ctx.fill()
    // Illuminated rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx - 1, cy - 1, cr, Math.PI * 0.7, Math.PI * 1.8)
    ctx.stroke()
  }

  ctx.restore()

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace

  // Bump map for surface relief
  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = size
  bumpCanvas.height = size
  const bCtx = bumpCanvas.getContext('2d')
  bCtx.fillStyle = '#808080'
  bCtx.fillRect(0, 0, size, size)
  bCtx.drawImage(canvas, 0, 0)
  const bumpMap = new THREE.CanvasTexture(bumpCanvas)

  return { map, bumpMap }
}

/**
 * Field of sparkling night stars that twinkle independently
 * and smoothly fade out as morning arrives.
 */
function NightStars({ active, bloomDuration = 3.6, cycle }) {
  const pointsRef = useRef()
  const elapsed = useRef(0)

  const { geometry, starCount } = useMemo(() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Celestial dome distribution in upper sky
      const theta = (i * 137.5 * Math.PI) / 180
      const phi = Math.acos(0.2 + (i / count) * 0.75) // upper sky bias
      const radius = 18 + (i % 7) * 1.5

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) + 2.5
      positions[i * 3 + 2] = -radius * Math.sin(phi) * Math.sin(theta) - 2

      phases[i] = (i * 1.618) % (Math.PI * 2)
      sizes[i] = (i % 11 === 0 ? 3.6 : i % 5 === 0 ? 2.6 : 1.6) // Prominent hero stars
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return { geometry: geo, starCount: count }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 1.0 },
    uColor: { value: new THREE.Color('#e2eeff') },
  }), [])

  useEffect(() => {
    elapsed.current = 0
  }, [active, cycle])

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return
    if (active) elapsed.current += Math.min(delta, 0.25)
    const progress = active ? smooth(elapsed.current / (bloomDuration * 0.70)) : 0
    const reveal = Math.max(0, 1.0 - progress * 1.5)
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uOpacity.value = reveal
    pointsRef.current.visible = reveal > 0.005
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          attribute float aPhase;
          attribute float aSize;
          uniform float uTime;
          uniform float uOpacity;
          varying float vTwinkle;
          void main() {
            float twinkle = sin(uTime * 2.2 + aPhase) * 0.38 + 0.62;
            vTwinkle = twinkle * uOpacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (0.8 + 0.4 * twinkle) * (140.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vTwinkle;
          void main() {
            vec2 coord = gl_PointCoord * 2.0 - 1.0;
            float dist = length(coord);
            if (dist > 1.0) discard;
            // Cross flare diffraction + circular star core
            float core = exp(-dist * dist * 4.0);
            float crossRays = exp(-abs(coord.x) * 9.0) * exp(-abs(coord.y) * 9.0) * 0.3;
            float alpha = (core + crossRays) * vTwinkle;
            gl_FragColor = vec4(uColor, alpha);
            #include <colorspace_fragment>
          }
        `}
      />
    </points>
  )
}

/**
 * Realistic 3D Moon model with procedural topography,
 * atmospheric halo, and accompanying starry night sky.
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const moonGroup = useRef()
  const moonSphere = useRef()
  const light = useRef()
  const elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])

  // Procedural Lunar maps (Albedo + Bump)
  const textures = useMemo(() => createMoonTextures(), [])
  useEffect(() => () => {
    textures.map.dispose()
    textures.bumpMap.dispose()
  }, [textures])

  const haloUniforms = useMemo(() => ({
    uReveal: { value: 1.0 },
    uTime: { value: 0 },
    uHaloColor: { value: new THREE.Color('#9fc2ec') },
  }), [])

  useEffect(() => {
    elapsed.current = 0
    haloUniforms.uReveal.value = active ? 0 : 1.0
    if (moonGroup.current) moonGroup.current.visible = !active
    if (light.current) light.current.intensity = active ? 0 : 1.3
  }, [active, cycle, haloUniforms])

  useFrame(({ camera, size }, delta) => {
    if (active) elapsed.current += Math.min(delta, 0.25)
    const fadeOutDuration = config.animation.bloomDuration * 0.70
    const progress = active ? (reducedMotion ? 1 : smooth(elapsed.current / fadeOutDuration)) : 0
    const reveal = Math.max(0, 1.0 - progress)

    haloUniforms.uReveal.value = reveal
    haloUniforms.uTime.value = reducedMotion ? 0 : elapsed.current

    if (light.current) {
      light.current.intensity = 1.35 * reveal
    }

    if (moonGroup.current) {
      moonGroup.current.visible = reveal > 0.01
    }

    if (moonSphere.current) {
      // Gentle celestial tilt and slow axial drift
      moonSphere.current.rotation.y = 0.15 + (reducedMotion ? 0 : elapsed.current * 0.015)
      moonSphere.current.rotation.x = -0.12
    }

    if (reveal <= 0.01) return

    const mobile = size.width < 1000
    const pixels = mobile ? 270 : 490
    const right = mobile ? 48 : 135
    const top = mobile ? 46 : 78
    const distance = 12
    const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const unitsPerPixel = worldHeight / size.height

    position.set(
      (size.width / 2 - right) * unitsPerPixel,
      (size.height / 2 - top) * unitsPerPixel,
      -distance
    )
    position.applyMatrix4(camera.matrixWorld)
    moonGroup.current.position.copy(position)
    moonGroup.current.quaternion.copy(camera.quaternion)
    moonGroup.current.scale.setScalar(pixels * unitsPerPixel * 0.5)
  })

  return <>
    {/* Twinkling starry night sky */}
    <NightStars active={active} bloomDuration={config.animation.bloomDuration} cycle={cycle} />

    {/* Cool moonlight directional light */}
    <directionalLight ref={light} position={[2.8, 6.5, 4.5]} intensity={1.35} color="#c0dafa" />

    {/* 3D Moon group */}
    <group ref={moonGroup} visible={true}>
      {/* High-definition 3D spherical Moon with topography */}
      <mesh ref={moonSphere} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial
          map={textures.map}
          bumpMap={textures.bumpMap}
          bumpScale={0.038}
          roughness={0.90}
          metalness={0.05}
          color="#f4f8fd"
          emissive="#243447"
          emissiveIntensity={0.28}
        />
      </mesh>

      {/* Atmospheric lunar halo / breathing celestial corona */}
      <mesh position={[0, 0, -0.1]} renderOrder={-12}>
        <planeGeometry args={[4.2, 4.2]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={haloUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform float uReveal;
            uniform float uTime;
            uniform vec3 uHaloColor;
            void main() {
              vec2 p = vUv * 2.0 - 1.0;
              float r = length(p);
              if (r > 1.95) discard;

              float innerGlow = exp(-pow(max(r - 0.48, 0.0), 1.8) * 8.0) * 0.55;
              float outerHaze = exp(-r * 2.3) * 0.38;
              float breathing = 0.94 + 0.06 * sin(uTime * 1.4);
              float totalHalo = (innerGlow + outerHaze) * breathing * uReveal;

              gl_FragColor = vec4(uHaloColor, totalHalo * (1.0 - smoothstep(1.7, 1.95, r)));
              #include <colorspace_fragment>
            }
          `}
        />
      </mesh>
    </group>
  </>
}
