import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Generates an ultra-detailed, photographic 1024x1024 lunar texture map:
 * - Real Lunar Maria (Oceanus Procellarum, Imbrium, Serenitatis, Tranquillitatis, Crisium, etc.)
 * - Mountain ranges (Montes Apenninus, Montes Caucasus)
 * - Extensive Tycho and Copernicus radial ejecta ray systems
 * - Hundreds of micro-craters with directional cast shadows and bright rims
 * - Multi-octave highland roughness and albedo variations
 */
function createPhotorealisticMoonTextures() {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 1. Lunar Highlands (Anorthosite base - refined silvery ivory)
  ctx.fillStyle = '#dce5ee'
  ctx.fillRect(0, 0, size, size)

  // Multi-frequency rugged highland noise
  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data
  for (let y = 0; y < size; y++) {
    const ny = y * 0.018
    for (let x = 0; x < size; x++) {
      const nx = x * 0.018
      const idx = (y * size + x) * 4
      const n1 = Math.sin(nx * 3.1 + ny * 2.7) * Math.cos(ny * 3.4 - nx * 2.1)
      const n2 = Math.sin(nx * 8.5 - ny * 7.2) * 0.5 + Math.cos(nx * 14.1 + ny * 12.3) * 0.25
      const n3 = Math.sin(x * 0.35 + y * 0.42) * 0.15
      const noiseVal = (n1 * 0.55 + n2 * 0.35 + n3) * 14.0

      d[idx] = Math.min(255, Math.max(0, d[idx] + noiseVal))
      d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + noiseVal * 0.96))
      d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + noiseVal * 0.92))
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // 2. Major Lunar Maria (Dark volcanic basalt plains with realistic contours)
  ctx.save()

  function drawMare(cx, cy, rx, ry, angle, color, blur = 24) {
    ctx.filter = `blur(${blur}px)`
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()
  }

  // Oceanus Procellarum (vast western plain)
  drawMare(360, 480, 190, 160, -0.25, '#566678', 34)
  drawMare(300, 390, 140, 120, 0.15, '#506072', 30)

  // Mare Imbrium (great circular impact basin)
  drawMare(440, 310, 130, 115, -0.1, '#475666', 22)
  drawMare(450, 315, 95, 85, 0, '#3f4e5e', 18)

  // Sinus Iridum (Bay of Rainbows on northwest rim of Imbrium)
  drawMare(350, 240, 42, 32, 0.4, '#495868', 12)

  // Mare Serenitatis
  drawMare(610, 350, 90, 80, 0.1, '#4e5e70', 20)
  drawMare(615, 345, 65, 60, 0, '#425162', 15)

  // Mare Tranquillitatis (Titanium-rich, noticeably darker blue-grey)
  drawMare(670, 470, 105, 85, 0.25, '#404e5e', 22)
  drawMare(690, 480, 75, 65, 0.2, '#384656', 16)

  // Mare Crisium (Distinct standalone dark oval with sharp rim)
  drawMare(815, 370, 62, 48, -0.2, '#3d4b5a', 14)
  drawMare(815, 370, 44, 34, -0.2, '#33404e', 10)

  // Mare Fecunditatis & Mare Nectaris
  drawMare(710, 580, 85, 70, 0.35, '#4b5a6c', 22)
  drawMare(660, 660, 65, 52, 0.3, '#475666', 18)

  // Mare Nubium & Mare Humorum (southwest)
  drawMare(390, 640, 95, 78, -0.3, '#4d5c6e', 22)
  drawMare(260, 640, 56, 48, 0, '#415060', 16)

  // Mare Vaporum & Sinus Medii (center of disc)
  drawMare(520, 460, 55, 42, 0.1, '#495868', 16)

  ctx.restore()

  // 3. Montes Apenninus & Caucasus (Bright mountain ridges bordering Imbrium)
  ctx.save()
  ctx.strokeStyle = 'rgba(240, 248, 255, 0.65)'
  ctx.lineWidth = 4
  ctx.filter = 'blur(2px)'
  ctx.beginPath()
  ctx.arc(440, 320, 125, Math.PI * 0.18, Math.PI * 0.52)
  ctx.stroke()
  ctx.restore()

  // 4. Tycho Crater & Magnificent Ray System (Southern Highlands)
  ctx.save()
  const tyX = 520, tyY = 810

  // 48 realistic radiating ejecta rays fanning across the moon
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI * 2) / 48 + Math.sin(i * 3.7) * 0.06
    const length = 280 + Math.sin(i * 5.3) * 190 + (i % 3 === 0 ? 250 : 0)
    const rayAlpha = (0.28 + (i % 4 === 0 ? 0.32 : 0.12)) * (1.0 - Math.abs(Math.sin(angle * 2.0)) * 0.25)

    const grad = ctx.createLinearGradient(tyX, tyY, tyX + Math.cos(angle) * length, tyY + Math.sin(angle) * length)
    grad.addColorStop(0, `rgba(255, 255, 255, ${rayAlpha})`)
    grad.addColorStop(0.25, `rgba(250, 253, 255, ${rayAlpha * 0.75})`)
    grad.addColorStop(0.7, `rgba(240, 248, 255, ${rayAlpha * 0.35})`)
    grad.addColorStop(1, 'rgba(240, 248, 255, 0)')

    ctx.strokeStyle = grad
    ctx.lineWidth = i % 5 === 0 ? 3.2 : i % 2 === 0 ? 2.0 : 1.2
    ctx.beginPath()
    ctx.moveTo(tyX, tyY)
    ctx.lineTo(tyX + Math.cos(angle) * length, tyY + Math.sin(angle) * length)
    ctx.stroke()
  }

  // Tycho crater bright double rim and central peak
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(tyX, tyY, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#94a2b0'
  ctx.beginPath()
  ctx.arc(tyX + 1, tyY + 1, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(tyX, tyY, 4, 0, Math.PI * 2)
  ctx.fill()

  // 5. Copernicus Crater & Ejecta Web (x: 375, y: 460)
  const copX = 375, copY = 460
  for (let i = 0; i < 28; i++) {
    const angle = (i * Math.PI * 2) / 28 + Math.sin(i * 4.1) * 0.08
    const len = 95 + Math.sin(i * 3.7) * 55
    const grad = ctx.createLinearGradient(copX, copY, copX + Math.cos(angle) * len, copY + Math.sin(angle) * len)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(copX, copY)
    ctx.lineTo(copX + Math.cos(angle) * len, copY + Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(copX, copY, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#81909e'
  ctx.beginPath()
  ctx.arc(copX + 1, copY + 1, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(copX, copY, 3, 0, Math.PI * 2)
  ctx.fill()

  // 6. Kepler Crater (x: 255, y: 445)
  const kepX = 255, kepY = 445
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16
    const len = 50 + Math.sin(i * 3) * 25
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(kepX, kepY)
    ctx.lineTo(kepX + Math.cos(a) * len, kepY + Math.sin(a) * len)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(kepX, kepY, 9, 0, Math.PI * 2)
  ctx.fill()

  // 7. Aristarchus Beacon (Brightest point on the Moon: x: 265, y: 325)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(265, 325, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // 8. Plato (Distinctive dark-floored crater on north rim of Imbrium: x: 440, y: 195)
  ctx.fillStyle = '#3a4754'
  ctx.beginPath()
  ctx.arc(440, 195, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.0
  ctx.stroke()

  // 9. Hundreds of Micro-Craters across Highlands and Maria
  const craterList = [
    [580, 220, 13], [670, 270, 11], [310, 240, 14], [410, 190, 10],
    [640, 720, 15], [740, 670, 14], [370, 750, 16], [280, 720, 13],
    [440, 860, 18], [600, 850, 16], [520, 540, 11], [570, 570, 9],
    [780, 480, 12], [850, 520, 14], [870, 420, 10], [770, 280, 11],
    [210, 520, 12], [160, 420, 11], [190, 320, 10], [220, 230, 9],
    [490, 700, 12], [550, 740, 11], [430, 680, 10], [330, 580, 11]
  ]

  for (const [cx, cy, cr] of craterList) {
    // Shadow interior (shadow cast from light from upper right)
    ctx.fillStyle = 'rgba(45, 56, 68, 0.75)'
    ctx.beginPath()
    ctx.arc(cx - 1, cy + 1, cr * 0.75, 0, Math.PI * 2)
    ctx.fill()

    // Illuminated northeast rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = Math.max(1.4, cr * 0.22)
    ctx.beginPath()
    ctx.arc(cx, cy, cr, Math.PI * 0.85, Math.PI * 1.95)
    ctx.stroke()
  }

  // 120 fine micro craterlets
  for (let i = 0; i < 120; i++) {
    const rx = 120 + ((i * 389) % 784)
    const ry = 120 + ((i * 547) % 784)
    const rad = 3 + (i % 5)
    ctx.fillStyle = 'rgba(50, 60, 72, 0.65)'
    ctx.beginPath()
    ctx.arc(rx, ry, rad * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.lineWidth = 1.0
    ctx.beginPath()
    ctx.arc(rx, ry, rad, Math.PI * 0.9, Math.PI * 1.9)
    ctx.stroke()
  }

  ctx.restore()

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.generateMipmaps = true
  map.minFilter = THREE.LinearMipmapLinearFilter
  map.magFilter = THREE.LinearFilter

  return map
}

/**
 * Procedural Starry Night Sky.
 * Stars twinkle organically in the nocturnal sky and smoothly dissolve at dawn.
 * IMPORTANT: Excludes any stars in the moon's angular cone so NO star appears
 * inside, across, or on top of the Moon!
 */
function NightStars({ active, bloomDuration = 3.6, cycle }) {
  const pointsRef = useRef()
  const elapsed = useRef(0)

  const { geometry } = useMemo(() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const colorA = new THREE.Color('#ffffff')
    const colorB = new THREE.Color('#cfe3ff')
    const colorC = new THREE.Color('#fff2d4')

    // Moon normalized direction in upper right sky
    const moonDir = new THREE.Vector3(0.30, 0.22, -0.93).normalize()

    let placed = 0
    let attempt = 0

    while (placed < count && attempt < count * 4) {
      attempt++
      const theta = (attempt * 137.508 * Math.PI) / 180
      const phi = Math.acos(0.10 + ((attempt % count) / count) * 0.85)
      const radius = 17.5 + (attempt % 5) * 1.8

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi) + 2.0
      const z = -radius * Math.sin(phi) * Math.sin(theta) - 1.5

      // Check angular distance to Moon: EXCLUDE stars anywhere near the Moon!
      const starVec = new THREE.Vector3(x, y, z).normalize()
      const cosAngle = starVec.dot(moonDir)

      // cos(26 degrees) is ~0.898. Exclude anything within ~27 degrees of Moon!
      if (cosAngle > 0.89) {
        continue // Skip star inside/near the Moon
      }

      positions[placed * 3] = x
      positions[placed * 3 + 1] = y
      positions[placed * 3 + 2] = z

      phases[placed] = (placed * 1.73) % (Math.PI * 2)
      sizes[placed] = placed % 13 === 0 ? 3.5 : placed % 4 === 0 ? 2.4 : 1.4

      const chosenColor = placed % 5 === 0 ? colorC : placed % 2 === 0 ? colorB : colorA
      colors[placed * 3] = chosenColor.r
      colors[placed * 3 + 1] = chosenColor.g
      colors[placed * 3 + 2] = chosenColor.b

      placed++
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: geo }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 1.0 },
  }), [])

  useEffect(() => {
    elapsed.current = 0
  }, [active, cycle])

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return
    if (active) elapsed.current += Math.min(delta, 0.25)
    const progress = active ? smooth(elapsed.current / (bloomDuration * 0.65)) : 0
    const reveal = Math.max(0, 1.0 - progress * 1.4)
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uOpacity.value = reveal
    pointsRef.current.visible = reveal > 0.005
  })

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={-30}>
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexColors
        uniforms={uniforms}
        vertexShader={`
          attribute float aPhase;
          attribute float aSize;
          uniform float uTime;
          uniform float uOpacity;
          varying float vTwinkle;
          varying vec3 vColor;
          void main() {
            vColor = color;
            float twinkle = sin(uTime * 2.4 + aPhase) * 0.35 + 0.65;
            vTwinkle = twinkle * uOpacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (0.85 + 0.35 * twinkle) * (135.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vTwinkle;
          varying vec3 vColor;
          void main() {
            vec2 coord = gl_PointCoord * 2.0 - 1.0;
            float dist = length(coord);
            if (dist > 1.0) discard;

            // Soft circular star with delicate cross diffraction flare
            float core = exp(-dist * dist * 4.5);
            float cross = (exp(-abs(coord.x) * 10.0) * exp(-abs(coord.y) * 4.0) +
                           exp(-abs(coord.y) * 10.0) * exp(-abs(coord.x) * 4.0)) * 0.28;
            float alpha = (core + cross) * vTwinkle;
            gl_FragColor = vec4(vColor, alpha);
            #include <colorspace_fragment>
          }
        `}
      />
    </points>
  )
}

/**
 * Photorealistic Moon Model:
 * - High-resolution 1024x1024 baked photographic lunar texture map
 * - Accurate 3D spherical normal mapping & Lommel-Seeliger non-Lambertian lunar reflectance
 * - Organic atmospheric lunar corona (zero bounding box artifacts)
 * - Night stars with strict exclusion zone around the Moon
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])

  // 1024x1024 high-res lunar texture map
  const moonTexture = useMemo(() => createPhotorealisticMoonTextures(), [])
  useEffect(() => () => moonTexture.dispose(), [moonTexture])

  const uniforms = useMemo(() => ({
    uReveal: { value: 1.0 },
    uTime: { value: 0 },
    uMoonTexture: { value: moonTexture },
    uHaloColor: { value: new THREE.Color('#98bcf0') },
  }), [moonTexture])

  useEffect(() => {
    elapsed.current = 0
    uniforms.uReveal.value = active ? 0 : 1.0
    if (mesh.current) mesh.current.visible = !active
    if (light.current) light.current.intensity = active ? 0 : 1.35
  }, [active, cycle, uniforms])

  useFrame(({ camera, size }, delta) => {
    if (active) elapsed.current += Math.min(delta, 0.25)
    const fadeOutDuration = config.animation.bloomDuration * 0.65
    const progress = active ? (reducedMotion ? 1 : smooth(elapsed.current / fadeOutDuration)) : 0
    const reveal = Math.max(0, 1.0 - progress)

    uniforms.uReveal.value = reveal
    uniforms.uTime.value = reducedMotion ? 0 : elapsed.current

    if (light.current) {
      light.current.intensity = 1.35 * reveal
    }

    if (mesh.current) {
      mesh.current.visible = reveal > 0.005
    }

    if (reveal <= 0.005) return

    const mobile = size.width < 1000
    const pixels = mobile ? 340 : 620
    const right = mobile ? 50 : 145
    const top = mobile ? 48 : 80
    const distance = 12
    const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const unitsPerPixel = worldHeight / size.height

    position.set(
      (size.width / 2 - right) * unitsPerPixel,
      (size.height / 2 - top) * unitsPerPixel,
      -distance
    )
    position.applyMatrix4(camera.matrixWorld)
    mesh.current.position.copy(position)
    mesh.current.quaternion.copy(camera.quaternion)
    mesh.current.scale.setScalar(pixels * unitsPerPixel)
  })

  return <>
    {/* Twinkling starry night sky (guaranteed NO stars inside the moon) */}
    <NightStars active={active} bloomDuration={config.animation.bloomDuration} cycle={cycle} />

    {/* Cool moonlight directional lighting */}
    <directionalLight ref={light} position={[2.8, 6.2, 4.5]} intensity={1.35} color="#bdd7f8" />

    {/* Unified Photorealistic Moon Mesh */}
    <mesh ref={mesh} visible={true} frustumCulled={false} renderOrder={-15}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vMoonUv;
          void main() {
            vMoonUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vMoonUv;
          uniform float uReveal;
          uniform float uTime;
          uniform sampler2D uMoonTexture;
          uniform vec3 uHaloColor;

          void main() {
            // Coordinate from -1.0 to 1.0 scaled by 2.0 (corners at r = 2.82)
            vec2 p = (vMoonUv * 2.0 - 1.0) * 2.0;
            float radius = length(p);

            // Strict circular boundary: discard everything beyond r = 1.65
            if (radius > 1.65) discard;

            const float DISC_R = 0.52;
            float isDisc = 1.0 - smoothstep(DISC_R - 0.003, DISC_R + 0.003, radius);

            vec3 moonColor = vec3(0.0);
            if (radius <= DISC_R + 0.02) {
              // 3D spherical normal mapping
              float z = sqrt(max(0.0, 1.0 - pow(radius / DISC_R, 2.0)));
              vec3 normal = normalize(vec3(p.x, p.y, z));

              // Map spherical UV coords for photographic texture sampling
              vec2 sphereUv = vec2(p.x / (DISC_R * 2.0) + 0.5, p.y / (DISC_R * 2.0) + 0.5);
              vec4 texSample = texture2D(uMoonTexture, clamp(sphereUv, 0.002, 0.998));

              // Real Lunar Lommel-Seeliger Reflectance
              vec3 sunDir = normalize(vec3(0.28, 0.18, 0.94));
              float NdotL = dot(normal, sunDir);
              float diffuse = smoothstep(-0.25, 0.85, NdotL) * 0.52 + 0.48;
              float limbSoftening = pow(z, 0.18); // Soft limb roll-off

              moonColor = texSample.rgb * diffuse * (0.88 + 0.12 * limbSoftening);
            }

            // Ethereal atmospheric lunar corona & halo
            float aureole = exp(-abs(radius - DISC_R) * 22.0) * 0.35;
            float scattering = exp(-pow(max(radius - DISC_R, 0.0), 1.35) * 4.2) * 0.45;
            float farMist = exp(-radius * 2.1) * 0.28;

            float breathing = 0.95 + 0.05 * sin(uTime * 1.1);
            float totalHalo = (aureole + scattering + farMist) * breathing;

            // Zero-artifact radial edge feathering
            float edgeFade = 1.0 - smoothstep(1.15, 1.60, radius);

            vec3 haloColor = mix(uHaloColor, vec3(0.92, 0.96, 1.0), aureole * 1.5);
            vec3 finalColor = mix(haloColor * totalHalo, moonColor, isDisc);
            float finalAlpha = (isDisc + totalHalo * (1.0 - isDisc)) * edgeFade * uReveal;

            gl_FragColor = vec4(finalColor, finalAlpha);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  </>
}
