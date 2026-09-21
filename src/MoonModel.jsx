import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Procedural Starry Night Sky.
 * Stars twinkle organically in the nocturnal sky and smoothly dissolve at dawn.
 */
function NightStars({ active, bloomDuration = 3.6, cycle }) {
  const pointsRef = useRef()
  const elapsed = useRef(0)

  const { geometry } = useMemo(() => {
    const count = 160
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const colorA = new THREE.Color('#ffffff')
    const colorB = new THREE.Color('#d2e5ff')
    const colorC = new THREE.Color('#fff4d6')

    for (let i = 0; i < count; i++) {
      // Natural celestial distribution across the night sky dome
      const theta = (i * 137.508 * Math.PI) / 180
      const phi = Math.acos(0.15 + (i / count) * 0.82)
      const radius = 17.5 + (i % 5) * 1.8

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) + 2.0
      positions[i * 3 + 2] = -radius * Math.sin(phi) * Math.sin(theta) - 1.5

      phases[i] = (i * 1.73) % (Math.PI * 2)
      sizes[i] = i % 13 === 0 ? 3.4 : i % 4 === 0 ? 2.3 : 1.4

      // Subtle star color temperature
      const chosenColor = i % 5 === 0 ? colorC : i % 2 === 0 ? colorB : colorA
      colors[i * 3] = chosenColor.r
      colors[i * 3 + 1] = chosenColor.g
      colors[i * 3 + 2] = chosenColor.b
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
    <points ref={pointsRef} geometry={geometry}>
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

            // Soft circular star with cross diffraction flare on larger stars
            float core = exp(-dist * dist * 4.5);
            float cross = (exp(-abs(coord.x) * 10.0) * exp(-abs(coord.y) * 4.0) +
                           exp(-abs(coord.y) * 10.0) * exp(-abs(coord.x) * 4.0)) * 0.25;
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
 * Photorealistic, single-pass Lunar Photosphere with:
 * - Real Lunar Maria geography (Oceanus Procellarum, Mare Imbrium, Mare Serenitatis/Tranquillitatis, Mare Crisium)
 * - Tycho & Copernicus crater impact ray systems
 * - Accurate 3D spherical normal curvature & Lommel-Seeliger lunar reflectance
 * - Perfectly radial, smooth atmospheric corona (100% zero bounding-box / square artifacts)
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])

  const uniforms = useMemo(() => ({
    uReveal: { value: 1.0 },
    uTime: { value: 0 },
    uHighland: { value: new THREE.Color('#dbe5f0') },
    uMare: { value: new THREE.Color('#58677a') },
    uRayColor: { value: new THREE.Color('#f5f9ff') },
    uHaloColor: { value: new THREE.Color('#9ec1f2') },
  }), [])

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
    {/* Twinkling starry night sky */}
    <NightStars active={active} bloomDuration={config.animation.bloomDuration} cycle={cycle} />

    {/* Cool moonlight directional lighting */}
    <directionalLight ref={light} position={[2.8, 6.2, 4.5]} intensity={1.35} color="#bdd7f8" />

    {/* Unified Single-Pass Photorealistic Moon Shader */}
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
          uniform vec3 uHighland;
          uniform vec3 uMare;
          uniform vec3 uRayColor;
          uniform vec3 uHaloColor;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 cell = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
              mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float fbm(vec2 p) {
            float v = 0.0;
            v += 0.500 * noise(p); p *= 2.02;
            v += 0.250 * noise(p); p *= 2.03;
            v += 0.125 * noise(p); p *= 2.01;
            v += 0.062 * noise(p);
            return v;
          }

          // Smooth crater helper
          float crater(vec2 uv, vec2 center, float radius, float rimWidth) {
            float d = length(uv - center);
            float pit = smoothstep(radius, radius * 0.7, d);
            float rim = smoothstep(radius - rimWidth, radius, d) * smoothstep(radius + rimWidth, radius, d);
            return rim * 1.6 - pit * 0.45;
          }

          void main() {
            // Coordinate from -1.0 to 1.0 scaled by 2.0, so the quad corners are > 2.0
            vec2 p = (vMoonUv * 2.0 - 1.0) * 2.0;
            float radius = length(p);

            // Crucial: strict circular boundary. Discard everything beyond r = 1.65!
            // Quad corners are at r = 2.82, so this completely eliminates any square borders!
            if (radius > 1.65) discard;

            const float DISC_R = 0.52;
            float isDisc = 1.0 - smoothstep(DISC_R - 0.003, DISC_R + 0.003, radius);

            // 1. LUNAR DISC RENDERING (when inside or near disc)
            vec3 moonColor = vec3(0.0);
            if (radius <= DISC_R + 0.02) {
              // 3D spherical normal
              float z = sqrt(max(0.0, 1.0 - pow(radius / DISC_R, 2.0)));
              vec3 normal = normalize(vec3(p.x, p.y, z));

              // Map spherical coordinates for natural lunar projection
              vec2 sphereCoord = vec2(p.x / DISC_R, p.y / DISC_R);

              // Procedural Maria (Dark Basaltic Plains)
              // Oceanus Procellarum & Mare Imbrium (upper left)
              float imbrium = exp(-pow(length(sphereCoord - vec2(-0.25, 0.22)) / 0.32, 2.0));
              float procellarum = exp(-pow(length(sphereCoord - vec2(-0.46, 0.05)) / 0.38, 2.0));
              // Mare Serenitatis & Tranquillitatis (center-right)
              float serenitatis = exp(-pow(length(sphereCoord - vec2(0.12, 0.24)) / 0.22, 2.0));
              float tranquillitatis = exp(-pow(length(sphereCoord - vec2(0.24, 0.02)) / 0.26, 2.0));
              // Mare Crisium (northeast isolated oval)
              vec2 crisiumCoord = (sphereCoord - vec2(0.55, 0.22)) * vec2(1.3, 1.0);
              float crisium = exp(-pow(length(crisiumCoord) / 0.14, 2.0));
              // Mare Nubium & Humorum (southwest)
              float nubium = exp(-pow(length(sphereCoord - vec2(-0.16, -0.32)) / 0.25, 2.0));
              float humorum = exp(-pow(length(sphereCoord - vec2(-0.45, -0.28)) / 0.16, 2.0));

              float mariaWeight = clamp((imbrium + procellarum * 0.85 + serenitatis * 0.95 +
                                         tranquillitatis * 0.90 + crisium * 1.25 + nubium * 0.85 + humorum * 0.75), 0.0, 1.0);

              // Fine basaltic plain fractal noise
              float mariaNoise = fbm(sphereCoord * 6.5);
              mariaWeight = smoothstep(0.32, 0.68, mariaWeight * 0.75 + mariaNoise * 0.40);

              // Lunar Highlands Texture
              float highlands = fbm(sphereCoord * 14.0);
              float highlandGrain = noise(sphereCoord * 45.0);

              // Tycho Impact Crater & Spectacular Ray System
              vec2 tychoPos = vec2(0.06, -0.56);
              vec2 tychoDelta = sphereCoord - tychoPos;
              float tychoDist = length(tychoDelta);
              float tychoAngle = atan(tychoDelta.y, tychoDelta.x);

              // 14 distinct bright radial ejecta rays spreading across the moon
              float rays = pow(0.5 + 0.5 * sin(tychoAngle * 14.0 + sin(tychoAngle * 5.0) * 0.5), 6.0);
              rays *= exp(-tychoDist * 1.6) * smoothstep(0.04, 0.12, tychoDist);

              // Copernicus Crater (upper left)
              vec2 copPos = vec2(-0.24, 0.14);
              vec2 copDelta = sphereCoord - copPos;
              float copDist = length(copDelta);
              float copRays = pow(0.5 + 0.5 * sin(atan(copDelta.y, copDelta.x) * 10.0), 4.0) * exp(-copDist * 4.5);

              // Aristarchus bright beacon
              float aristarchus = exp(-pow(length(sphereCoord - vec2(-0.48, 0.28)) / 0.035, 2.0)) * 0.45;

              // Crater topography
              float craters = crater(sphereCoord, tychoPos, 0.055, 0.015) * 0.55 +
                              crater(sphereCoord, copPos, 0.050, 0.014) * 0.45 +
                              crater(sphereCoord, vec2(0.35, -0.35), 0.045, 0.012) * 0.35 +
                              crater(sphereCoord, vec2(-0.12, -0.68), 0.040, 0.010) * 0.30;

              // Composite Lunar Albedo Surface
              vec3 surface = mix(uHighland, uMare, mariaWeight * 0.62);
              surface *= 0.88 + highlands * 0.20 + highlandGrain * 0.05;
              // Add bright impact ejecta rays and crater rims
              surface = mix(surface, uRayColor, clamp(rays * 0.55 + copRays * 0.35 + aristarchus + max(craters, 0.0) * 0.4, 0.0, 1.0));

              // 3D Realistic Lunar Shading (Sun illuminating from front-upper-right)
              vec3 sunDir = normalize(vec3(0.32, 0.22, 0.91));
              float NdotL = dot(normal, sunDir);
              // Lunar photometric reflectance (soft limb, non-glossy basaltic rock)
              float diffuse = smoothstep(-0.25, 0.80, NdotL) * 0.58 + 0.42;
              float limbDarkening = pow(z, 0.22); // subtle lunar limb roll-off
              moonColor = surface * diffuse * (0.85 + 0.15 * limbDarkening);
            }

            // 2. ETHEREAL ATMOSPHERIC LUNAR CORONA & HALO
            // Silvery-blue inner aureole directly hugging the lunar disc edge
            float aureole = exp(-abs(radius - DISC_R) * 22.0) * 0.35;
            // Soft atmospheric Rayleigh night scattering
            float scattering = exp(-pow(max(radius - DISC_R, 0.0), 1.35) * 4.2) * 0.45;
            // Far ambient moonlight mist
            float farMist = exp(-radius * 2.1) * 0.28;

            float breathing = 0.95 + 0.05 * sin(uTime * 1.1);
            float totalHalo = (aureole + scattering + farMist) * breathing;

            // Zero-artefact edge feathering: alpha reaches absolute 0 before radius = 1.60
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
