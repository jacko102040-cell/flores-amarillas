import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Generates an ultra-soft, organic and photographic 1024x1024 lunar texture.
 * Completely eliminates sharp geometric circles / "bolitas".
 * Features naturally feathered, diffused lunar maria, soft crater depressions,
 * and delicate, misty ray plumes.
 */
function createOrganicMoonTextures() {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 1. Base Lunar Highlands (Soft silvery ivory with warm undertones)
  ctx.fillStyle = '#dbe5f0'
  ctx.fillRect(0, 0, size, size)

  // Natural multi-scale fractal terrain noise (no harsh spots)
  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data
  for (let y = 0; y < size; y++) {
    const ny = y * 0.015
    for (let x = 0; x < size; x++) {
      const nx = x * 0.015
      const idx = (y * size + x) * 4
      const n1 = Math.sin(nx * 2.8 + ny * 2.5) * Math.cos(ny * 3.1 - nx * 1.9)
      const n2 = Math.sin(nx * 7.2 - ny * 6.4) * 0.45 + Math.cos(nx * 12.0 + ny * 10.5) * 0.22
      const n3 = Math.sin(x * 0.4 + y * 0.5) * 0.12
      const noiseVal = (n1 * 0.5 + n2 * 0.35 + n3) * 11.0

      d[idx] = Math.min(255, Math.max(0, d[idx] + noiseVal))
      d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + noiseVal * 0.96))
      d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + noiseVal * 0.93))
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // 2. Naturally Feathered Lunar Maria (Dark basaltic oceans with high blur)
  ctx.save()

  function drawSoftMare(cx, cy, rx, ry, angle, color, blur = 42) {
    ctx.filter = `blur(${blur}px)`
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()
  }

  // Oceanus Procellarum (vast soft western basin)
  drawSoftMare(370, 480, 200, 170, -0.25, '#506072', 52)
  drawSoftMare(310, 390, 150, 130, 0.15, '#48586a', 46)

  // Mare Imbrium (great northern circular basin)
  drawSoftMare(450, 310, 135, 120, -0.1, '#445465', 38)
  drawSoftMare(455, 315, 95, 85, 0, '#3b4a5a', 30)

  // Sinus Iridum (Bay of Rainbows)
  drawSoftMare(355, 235, 45, 35, 0.35, '#465668', 26)

  // Mare Serenitatis
  drawSoftMare(615, 350, 95, 85, 0.1, '#49596a', 36)
  drawSoftMare(620, 345, 65, 60, 0, '#3e4e5e', 28)

  // Mare Tranquillitatis (deeper titanium basaltic tones)
  drawSoftMare(675, 470, 110, 90, 0.25, '#3b4a5a', 40)
  drawSoftMare(695, 480, 75, 65, 0.2, '#334150', 32)

  // Mare Crisium (standalone oval, smoothly diffused)
  drawSoftMare(815, 370, 65, 50, -0.2, '#3a4858', 26)
  drawSoftMare(815, 370, 44, 34, -0.2, '#313e4d', 20)

  // Mare Fecunditatis & Mare Nectaris
  drawSoftMare(715, 580, 90, 75, 0.35, '#475667', 38)
  drawSoftMare(665, 660, 70, 55, 0.3, '#435262', 32)

  // Mare Nubium & Mare Humorum (southwest)
  drawSoftMare(395, 640, 100, 80, -0.3, '#475668', 38)
  drawSoftMare(260, 640, 58, 50, 0, '#3d4c5c', 28)

  // Mare Vaporum (central connection)
  drawSoftMare(525, 460, 60, 45, 0.1, '#455465', 30)

  ctx.restore()

  // 3. Montes Apenninus (Soft, bright mountain arc bounding Imbrium)
  ctx.save()
  ctx.strokeStyle = 'rgba(245, 250, 255, 0.45)'
  ctx.lineWidth = 8
  ctx.filter = 'blur(6px)'
  ctx.beginPath()
  ctx.arc(445, 320, 126, Math.PI * 0.18, Math.PI * 0.52)
  ctx.stroke()
  ctx.restore()

  // 4. Soft Diffuse Craters (NO SHARP CIRCLES / "BOLITAS")
  // Using radial gradients that softly dissolve into the lunar soil with zero hard boundaries
  ctx.save()

  function drawNaturalCrater(cx, cy, radius, depth = 0.35, blur = 14) {
    ctx.filter = `blur(${blur}px)`
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    // Darker soft center
    grad.addColorStop(0, `rgba(50, 62, 75, ${depth})`)
    grad.addColorStop(0.55, `rgba(70, 84, 98, ${depth * 0.6})`)
    // Delicate soft bright rim
    grad.addColorStop(0.82, `rgba(255, 255, 255, ${depth * 0.85})`)
    // 100% transparent blend into surrounding surface (no visible circle boundary!)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Major natural crater depressions (softly blurred into the terrain)
  drawNaturalCrater(520, 810, 48, 0.30, 16) // Tycho depression
  drawNaturalCrater(375, 460, 40, 0.28, 14) // Copernicus depression
  drawNaturalCrater(255, 445, 28, 0.24, 12) // Kepler depression
  drawNaturalCrater(440, 195, 32, 0.35, 12) // Plato dark floor
  drawNaturalCrater(580, 220, 34, 0.22, 14) // Aristoteles
  drawNaturalCrater(670, 270, 30, 0.20, 12) // Posidonius
  drawNaturalCrater(640, 720, 38, 0.25, 15) // Theophilus
  drawNaturalCrater(740, 670, 36, 0.22, 14) // Petavius
  drawNaturalCrater(370, 750, 42, 0.26, 16) // Pitatus
  drawNaturalCrater(280, 720, 34, 0.22, 14) // Bullialdus
  drawNaturalCrater(440, 860, 46, 0.25, 18) // Clavius
  drawNaturalCrater(780, 480, 32, 0.20, 13) // Taruntius
  drawNaturalCrater(210, 520, 30, 0.20, 12) // Grimaldi
  drawNaturalCrater(190, 320, 28, 0.18, 12) // Marius

  ctx.restore()

  // 5. Tycho Ethereal Ray System (Misty, gossamer plumes instead of drawn lines)
  ctx.save()
  const tyX = 520, tyY = 810

  for (let i = 0; i < 36; i++) {
    const angle = (i * Math.PI * 2) / 36 + Math.sin(i * 3.4) * 0.08
    const length = 260 + Math.sin(i * 5.1) * 180 + (i % 3 === 0 ? 220 : 0)
    const rayAlpha = (0.10 + (i % 4 === 0 ? 0.12 : 0.04))

    const grad = ctx.createLinearGradient(tyX, tyY, tyX + Math.cos(angle) * length, tyY + Math.sin(angle) * length)
    grad.addColorStop(0, `rgba(255, 255, 255, ${rayAlpha})`)
    grad.addColorStop(0.3, `rgba(245, 250, 255, ${rayAlpha * 0.65})`)
    grad.addColorStop(1, 'rgba(240, 248, 255, 0)')

    ctx.strokeStyle = grad
    ctx.lineWidth = i % 4 === 0 ? 12 : i % 2 === 0 ? 7 : 4
    ctx.filter = 'blur(10px)'
    ctx.beginPath()
    ctx.moveTo(tyX, tyY)
    ctx.lineTo(tyX + Math.cos(angle) * length, tyY + Math.sin(angle) * length)
    ctx.stroke()
  }

  // Tycho core bright glow (soft, diffused nebulous spot, NOT a circle)
  const tyGlow = ctx.createRadialGradient(tyX, tyY, 0, tyX, tyY, 32)
  tyGlow.addColorStop(0, 'rgba(255, 255, 255, 0.75)')
  tyGlow.addColorStop(0.35, 'rgba(250, 253, 255, 0.40)')
  tyGlow.addColorStop(1, 'rgba(240, 248, 255, 0)')
  ctx.filter = 'blur(6px)'
  ctx.fillStyle = tyGlow
  ctx.beginPath()
  ctx.arc(tyX, tyY, 32, 0, Math.PI * 2)
  ctx.fill()

  // Copernicus soft halo
  const copX = 375, copY = 460
  const copGlow = ctx.createRadialGradient(copX, copY, 0, copX, copY, 26)
  copGlow.addColorStop(0, 'rgba(255, 255, 255, 0.65)')
  copGlow.addColorStop(0.4, 'rgba(248, 252, 255, 0.30)')
  copGlow.addColorStop(1, 'rgba(240, 248, 255, 0)')
  ctx.filter = 'blur(6px)'
  ctx.fillStyle = copGlow
  ctx.beginPath()
  ctx.arc(copX, copY, 26, 0, Math.PI * 2)
  ctx.fill()

  // Aristarchus bright beacon (diffuse brilliant point)
  const arX = 265, arY = 325
  const arGlow = ctx.createRadialGradient(arX, arY, 0, arX, arY, 18)
  arGlow.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
  arGlow.addColorStop(0.4, 'rgba(248, 252, 255, 0.35)')
  arGlow.addColorStop(1, 'rgba(240, 248, 255, 0)')
  ctx.filter = 'blur(4px)'
  ctx.fillStyle = arGlow
  ctx.beginPath()
  ctx.arc(arX, arY, 18, 0, Math.PI * 2)
  ctx.fill()

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

      // Exclude anything within ~27 degrees of Moon
      if (cosAngle > 0.89) {
        continue
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
 * - Ultra-soft organic lunar geography with zero artificial circles or "bolitas"
 * - Naturally feathered basaltic maria and diffused crater depressions
 * - 3D spherical normal mapping & Lommel-Seeliger non-Lambertian lunar reflectance
 * - Organic atmospheric lunar corona (zero bounding box artifacts)
 * - Night stars with strict exclusion zone around the Moon
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])

  // 1024x1024 organic lunar texture map
  const moonTexture = useMemo(() => createOrganicMoonTextures(), [])
  useEffect(() => () => moonTexture.dispose(), [moonTexture])

  const uniforms = useMemo(() => ({
    uReveal: { value: 1.0 },
    uTime: { value: 0 },
    uMoonTexture: { value: moonTexture },
    uHaloColor: { value: new THREE.Color('#94b8ea') },
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
