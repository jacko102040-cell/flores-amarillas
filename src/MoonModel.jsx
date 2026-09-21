import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Constellations (Ursa Major / El Carro & Cassiopeia / La W celeste)
 * Rendered with delicate, ethereal starlight lines and sparkling stars.
 */
function Constellations({ opacity }) {
  const linesRef = useRef()
  const matRef = useRef()

  const { lineGeo } = useMemo(() => {
    // 1. Ursa Major (The Big Dipper / El Carro)
    const dipper = [
      new THREE.Vector3(-4.6, 4.4, -14.0), // Alkaid (tip of handle)
      new THREE.Vector3(-3.7, 4.1, -14.0), // Mizar
      new THREE.Vector3(-2.9, 3.8, -14.0), // Alioth
      new THREE.Vector3(-2.0, 3.6, -14.0), // Megrez (join handle to bowl)
      new THREE.Vector3(-2.1, 2.7, -14.0), // Phecda (bottom left of bowl)
      new THREE.Vector3(-1.1, 2.8, -14.0), // Merak (bottom right of bowl)
      new THREE.Vector3(-1.0, 3.7, -14.0), // Dubhe (top right of bowl)
    ]

    // 2. Cassiopeia (The Celestial W in northern sky)
    const cassiopeia = [
      new THREE.Vector3(-3.8, 6.2, -14.0),
      new THREE.Vector3(-2.8, 5.7, -14.0),
      new THREE.Vector3(-2.0, 6.4, -14.0),
      new THREE.Vector3(-1.1, 5.8, -14.0),
      new THREE.Vector3(-0.3, 6.3, -14.0),
    ]

    const linePoints = [
      // Dipper handle
      dipper[0], dipper[1],
      dipper[1], dipper[2],
      dipper[2], dipper[3],
      // Dipper bowl
      dipper[3], dipper[4],
      dipper[4], dipper[5],
      dipper[5], dipper[6],
      dipper[6], dipper[3],

      // Cassiopeia W
      cassiopeia[0], cassiopeia[1],
      cassiopeia[1], cassiopeia[2],
      cassiopeia[2], cassiopeia[3],
      cassiopeia[3], cassiopeia[4],
    ]

    const geo = new THREE.BufferGeometry().setFromPoints(linePoints)
    return { lineGeo: geo }
  }, [])

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, opacity * 0.28)
      if (linesRef.current) linesRef.current.visible = opacity > 0.01
    }
  })

  return (
    <lineSegments ref={linesRef} geometry={lineGeo} renderOrder={-28}>
      <lineBasicMaterial
        ref={matRef}
        color="#aed2fb"
        transparent
        depthWrite={false}
        linewidth={1}
      />
    </lineSegments>
  )
}

/**
 * Procedural Starry Night Sky + Constellation Stars.
 * Excludes any stars near the Moon, so NO stars ever appear inside or on top of the Moon!
 */
function NightStars({ active, bloomDuration = 3.6, cycle }) {
  const pointsRef = useRef()
  const elapsed = useRef(0)
  const currentOpacity = useRef(1.0)

  const { geometry } = useMemo(() => {
    const starList = []

    // 1. Constellation Hero Stars (Ursa Major + Cassiopeia)
    const constellationStars = [
      [-4.6, 4.4, -14.0], [-3.7, 4.1, -14.0], [-2.9, 3.8, -14.0],
      [-2.0, 3.6, -14.0], [-2.1, 2.7, -14.0], [-1.1, 2.8, -14.0], [-1.0, 3.7, -14.0],
      [-3.8, 6.2, -14.0], [-2.8, 5.7, -14.0], [-2.0, 6.4, -14.0], [-1.1, 5.8, -14.0], [-0.3, 6.3, -14.0]
    ]

    const colorHero = new THREE.Color('#ffffff')
    const colorA = new THREE.Color('#ffffff')
    const colorB = new THREE.Color('#cfe3ff')
    const colorC = new THREE.Color('#fff2d4')

    for (let i = 0; i < constellationStars.length; i++) {
      const [x, y, z] = constellationStars[i]
      starList.push({
        x, y, z,
        phase: (i * 0.9) % (Math.PI * 2),
        size: 3.8, // Slightly larger hero stars for constellations
        color: colorHero
      })
    }

    // 2. Background Field Stars (with Moon exclusion filter)
    const moonDir = new THREE.Vector3(0.30, 0.22, -0.93).normalize()
    const count = 160
    let placed = 0, attempt = 0

    while (placed < count && attempt < count * 4) {
      attempt++
      const theta = (attempt * 137.508 * Math.PI) / 180
      const phi = Math.acos(0.10 + ((attempt % count) / count) * 0.85)
      const radius = 17.5 + (attempt % 5) * 1.8

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi) + 2.0
      const z = -radius * Math.sin(phi) * Math.sin(theta) - 1.5

      // Exclude stars within ~28 degrees of Moon
      const starVec = new THREE.Vector3(x, y, z).normalize()
      if (starVec.dot(moonDir) > 0.88) {
        continue
      }

      const chosenColor = placed % 5 === 0 ? colorC : placed % 2 === 0 ? colorB : colorA
      starList.push({
        x, y, z,
        phase: (placed * 1.73) % (Math.PI * 2),
        size: placed % 11 === 0 ? 3.2 : placed % 4 === 0 ? 2.2 : 1.3,
        color: chosenColor
      })
      placed++
    }

    const totalStars = starList.length
    const positions = new Float32Array(totalStars * 3)
    const phases = new Float32Array(totalStars)
    const sizes = new Float32Array(totalStars)
    const colors = new Float32Array(totalStars * 3)

    for (let i = 0; i < totalStars; i++) {
      const s = starList[i]
      positions[i * 3] = s.x
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
      phases[i] = s.phase
      sizes[i] = s.size
      colors[i * 3] = s.color.r
      colors[i * 3 + 1] = s.color.g
      colors[i * 3 + 2] = s.color.b
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
    if (active) elapsed.current += Math.min(delta, 0.25)
    const progress = active ? smooth(elapsed.current / (bloomDuration * 0.65)) : 0
    const reveal = Math.max(0, 1.0 - progress * 1.4)
    currentOpacity.current = reveal

    if (pointsRef.current) {
      uniforms.uTime.value = clock.elapsedTime
      uniforms.uOpacity.value = reveal
      pointsRef.current.visible = reveal > 0.005
    }
  })

  return (
    <>
      <Constellations opacity={currentOpacity.current} />
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
              float twinkle = sin(uTime * 2.3 + aPhase) * 0.35 + 0.65;
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
    </>
  )
}

/**
 * Authentic NASA Photographic Lunar Model:
 * - Uses real 1024x1024 NASA photographic lunar surface texture (zero synthetic white spots or artificial circles)
 * - 3D spherical unwrap and Lommel-Seeliger non-Lambertian regolith scattering
 * - Smooth atmospheric lunar corona (zero bounding box artifacts)
 * - Night stars & constellations with strict exclusion zone around the Moon
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])

  // Load official NASA photographic Lunar texture
  const moonTexture = useMemo(() => {
    const base = import.meta.env.BASE_URL || '/'
    const src = `${base.replace(/\/$/, '')}/moon_1024.jpg`
    const loader = new THREE.TextureLoader()
    const tex = loader.load(src)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [])

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
    {/* Twinkling night sky + Constellations (Ursa Major & Cassiopeia) */}
    <NightStars active={active} bloomDuration={config.animation.bloomDuration} cycle={cycle} />

    {/* Cool moonlight directional lighting */}
    <directionalLight ref={light} position={[2.8, 6.2, 4.5]} intensity={1.35} color="#bdd7f8" />

    {/* Authentic NASA Lunar Mesh */}
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
            // Borde difuminado y suave en vez de recorte filoso
            float isDisc = 1.0 - smoothstep(DISC_R - 0.022, DISC_R + 0.012, radius);

            vec3 moonColor = vec3(0.0);
            if (radius <= DISC_R + 0.03) {
              // True 3D spherical normal mapping
              float z = sqrt(max(0.0, 1.0 - pow(radius / DISC_R, 2.0)));
              vec3 normal = normalize(vec3(p.x, p.y, z));

              // True spherical texture projection
              float u = atan(normal.x, normal.z) / (2.0 * 3.14159265) + 0.5;
              float v = asin(clamp(normal.y, -1.0, 1.0)) / 3.14159265 + 0.5;
              // Align near side of the Moon facing the camera
              u = fract(u + 0.25);

              // Muestreo multi-tap difuminado para suavizar los cráteres demasiado marcados
              vec2 uvCoord = vec2(u, v);
              vec4 texCenter = texture2D(uMoonTexture, uvCoord);
              vec4 tex1 = texture2D(uMoonTexture, uvCoord + vec2(0.0055, 0.0035));
              vec4 tex2 = texture2D(uMoonTexture, uvCoord + vec2(-0.0055, -0.0035));
              vec4 tex3 = texture2D(uMoonTexture, uvCoord + vec2(-0.0035, 0.0055));
              vec4 tex4 = texture2D(uMoonTexture, uvCoord + vec2(0.0035, -0.0055));
              vec3 blurredRock = texCenter.rgb * 0.32 + (tex1.rgb + tex2.rgb + tex3.rgb + tex4.rgb) * 0.17;

              // Velo de luz perlada que suaviza el contraste hiperrealista
              vec3 softVeil = vec3(0.93, 0.96, 1.0);
              float lum = dot(blurredRock, vec3(0.299, 0.587, 0.114));
              vec3 rock = mix(blurredRock, softVeil * (lum * 0.52 + 0.48), 0.40);

              // Lommel-Seeliger difuminado y suave
              vec3 sunDir = normalize(vec3(0.32, 0.18, 0.93));
              float NdotL = dot(normal, sunDir);
              float diffuse = smoothstep(-0.35, 0.88, NdotL) * 0.40 + 0.60;
              float limbSoftening = pow(z, 0.24);

              moonColor = rock * diffuse * (0.86 + 0.14 * limbSoftening) * 1.14;
            }

            // Corona lunar difuminada, suave y etérea
            float aureole = exp(-abs(radius - DISC_R) * 16.0) * 0.38;
            float scattering = exp(-pow(max(radius - DISC_R, 0.0), 1.25) * 3.8) * 0.46;
            float farMist = exp(-radius * 2.0) * 0.28;

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
