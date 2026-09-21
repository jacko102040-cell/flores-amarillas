import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/** A luminous photosphere, filament corona and sunbeams in one two-triangle draw.
 * Screen-space placement keeps the sun in its corner during camera parallax.
 * No image textures, bloom pass, shadow maps or additional animation timer. */
export default function SunModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])
  const uniforms = useMemo(() => ({
    uReveal: { value: 0 },
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uTravel: { value: 0 },
    uMotion: { value: 1 },
    uRayStrength: { value: config.sun.rayStrength ?? 0.8 },
    uRayLength: { value: config.sun.rayLength ?? 1.65 },
    uBeamStrength: { value: config.sun.beamStrength ?? 0.5 },
    uFlareStrength: { value: config.sun.flareStrength ?? 0.35 },
    uCore: { value: new THREE.Color(config.ui.colors.sunCore) },
    uEdge: { value: new THREE.Color(config.ui.colors.sunEdge) },
    uHalo: { value: new THREE.Color(config.ui.colors.sunHalo) },
  }), [config.ui.colors.sunCore, config.ui.colors.sunEdge, config.ui.colors.sunHalo,
    config.sun.rayStrength, config.sun.rayLength, config.sun.beamStrength, config.sun.flareStrength])

  useEffect(() => {
    elapsed.current = 0
    uniforms.uReveal.value = 0
    uniforms.uTime.value = 0
    uniforms.uPulse.value = 0
    uniforms.uTravel.value = 0
    if (mesh.current) mesh.current.visible = false
    if (light.current) light.current.intensity = 0
  }, [active, cycle, uniforms])

  useFrame(({ camera, size }, delta) => {
    // Keep real-time rhythm even on phones rendering below 20 fps.
    if (active) elapsed.current += Math.min(delta, 0.25)
    const progress = active ? (reducedMotion ? 1 : smooth(elapsed.current / config.animation.bloomDuration)) : 0
    uniforms.uReveal.value = progress
    uniforms.uTime.value = reducedMotion ? 0 : elapsed.current
    // One slow swell every few seconds, with a smaller second crest.
    // Only emitted light breathes: the solar disc never inflates or flashes.
    const beat = elapsed.current / (config.sun.pulsePeriod ?? 4.2)
    const phase = beat * Math.PI * 2
    const pulse = reducedMotion ? 0 : (config.sun.pulseStrength ?? 0.85) * (
      Math.pow(0.5 + 0.5 * Math.sin(phase - Math.PI / 2), 2) * 0.8
      + Math.pow(0.5 + 0.5 * Math.sin(phase * 2 - 0.7), 4) * 0.2)
    uniforms.uPulse.value = pulse * progress
    uniforms.uTravel.value = reducedMotion ? 0 : beat % 1
    uniforms.uMotion.value = reducedMotion ? 0 : 1
    light.current.intensity = config.sun.lightIntensity * progress * (1 + pulse * 0.18)
    mesh.current.visible = progress > 0
    if (!active) return

    const mobile = size.width < 1000
    const pixels = mobile ? config.sun.mobileSize : config.sun.desktopSize
    const [right, top] = mobile ? config.sun.mobileInset : config.sun.desktopInset
    const distance = 12
    const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const unitsPerPixel = worldHeight / size.height
    // The sun is deliberately cropped by the upper/right edges, like sunlight
    // entering a photograph. A slight rise accompanies the flower opening.
    const rise = reducedMotion ? 0 : (1 - progress) * pixels * 0.045
    position.set((size.width / 2 - right) * unitsPerPixel,
      (size.height / 2 - top - rise) * unitsPerPixel, -distance)
    position.applyMatrix4(camera.matrixWorld)
    mesh.current.position.copy(position)
    mesh.current.quaternion.copy(camera.quaternion)
    mesh.current.scale.setScalar(pixels * unitsPerPixel * (0.72 + 0.28 * progress))
  })

  return <>
    <directionalLight ref={light} position={config.sun.lightPosition} intensity={0} color={config.ui.colors.sunHalo} />
    <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial transparent depthWrite={false} toneMapped={false} uniforms={uniforms}
        vertexShader={`
          varying vec2 vSunUv;
          void main() {
            vSunUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vSunUv;
          uniform float uReveal;
          uniform float uTime;
          uniform float uPulse;
          uniform float uTravel;
          uniform float uMotion;
          uniform float uRayStrength;
          uniform float uRayLength;
          uniform float uBeamStrength;
          uniform float uFlareStrength;
          uniform vec3 uCore;
          uniform vec3 uEdge;
          uniform vec3 uHalo;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float solarNoise(vec2 p) {
            vec2 cell = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
              mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x), f.y);
          }
          void main() {
            // Twice the old canvas extent; the photosphere keeps its size while
            // the rays can reach farther into the garden. Still just two triangles.
            vec2 p = (vSunUv * 2.0 - 1.0) * 2.0;
            float radius = length(p);
            if (radius > 1.95) discard;
            float angle = atan(p.y, p.x);
            vec2 direction = p / max(radius, 0.001);
            float drift = uTime * 0.035;
            // A gently turbulent limb, incandescent centre and molten gold edge.
            float turbulence = solarNoise(direction * 18.0 + drift);
            float limb = 0.297 + (turbulence - 0.5) * 0.006;
            float disc = 1.0 - smoothstep(limb - 0.009, limb + 0.010, radius);
            float mu = sqrt(max(0.0, 1.0 - pow(radius / 0.30, 2.0)));
            float granules = solarNoise(p * 145.0) * 0.65 + solarNoise(p * 310.0) * 0.35;
            vec3 discColor = mix(uEdge, uCore, 0.18 + 0.82 * pow(mu, 0.38));
            discColor *= 0.965 + granules * 0.035;

            // Atmospheric glare fills the spaces between irregular sunbeams.
            float haze = 0.86 + 0.14 * solarNoise(p * 5.0 + vec2(2.4 + drift, 1.7));
            float haloRadius = radius / (1.0 + uPulse * 0.70);
            float scattering = (exp(-haloRadius * haloRadius * 3.2) * 0.26
              + exp(-haloRadius * haloRadius * 15.0) * 0.42) * haze;
            float aureole = exp(-abs(radius - 0.30) * 22.0) * 0.17;
            float halo = (scattering + aureole) * (0.75 + uPulse * 1.35)
              * (1.0 - smoothstep(0.80, 1.20 + uPulse * 0.55, radius));
            // A broad, soft wave visibly travels away from the solar limb.
            float waveRadius = 0.32 + uTravel * 1.15;
            float wave = exp(-pow((radius - waveRadius) / 0.18, 2.0))
              * pow(sin(uTravel * 3.14159265), 2.0) * 0.24 * uMotion;
            halo += wave;
            // Integer angular frequencies keep the atan seam continuous.
            // Broad beams and fine filaments vary in length without a spinning icon.
            float sway = sin(uTime * 0.80) * 0.10;
            float rayAngle = angle + sway + sin(uTime * 1.15 + angle * 3.0) * 0.035;
            float flutter = sin(uTime * 0.90 + angle * 3.0) * 0.50;
            float broad = pow(0.5 + 0.5 * sin(rayAngle * 13.0 + sin(angle * 5.0) * 1.3 + flutter), 7.0);
            float fine = pow(0.5 + 0.5 * sin((angle - sway * 0.65) * 37.0 + sin(angle * 9.0) * 1.8 + flutter), 18.0);
            float reach = min(1.88, uRayLength * (0.66 + 0.25 * solarNoise(direction * 4.0)) * (0.85 + uPulse * 0.70));
            float envelope = exp(-max(radius - 0.30, 0.0) * 1.9)
              * (1.0 - smoothstep(reach * 0.65, reach, radius));
            float breath = (0.70 + 0.30 * sin(uTime * 1.65 - radius * 8.0 + angle * 3.0)) * (0.75 + uPulse * 2.0);
            float beams = (broad * 0.76 + fine * 0.30) * envelope * breath;
            float filaments = pow(0.5 + 0.5 * sin(angle * 71.0 + turbulence * 5.0), 3.0);
            float corona = exp(-max(radius - limb, 0.0) * (16.0 - filaments * 8.0) / (1.0 + uPulse * 0.6))
              * (0.27 + filaments * 0.30) * (1.0 + uPulse);
            // Three broad shafts gather toward the flowers. Angular lobes soften
            // with distance like light caught in a fine atmospheric mist.
            vec2 shaftDirection = vec2(cos(angle + sway * 0.75), sin(angle + sway * 0.75));
            float shaftA = pow(max(dot(shaftDirection, normalize(vec2(-0.78, -0.63))), 0.0), 110.0);
            float shaftB = pow(max(dot(shaftDirection, normalize(vec2(-0.43, -0.90))), 0.0), 180.0);
            float shaftC = pow(max(dot(shaftDirection, normalize(vec2(-0.96, -0.28))), 0.0), 220.0);
            float shafts = (shaftA + shaftB * 0.65 + shaftC * 0.40)
              * exp(-radius * 0.85) * (1.0 - smoothstep(1.20, 1.90, radius))
              * uBeamStrength * (1.0 + uPulse * 0.8);
            // A small optical glint makes the luminous rim catch the eye.
            vec2 glintPosition = p - vec2(-0.205, -0.205);
            float glint = exp(-dot(glintPosition, glintPosition) * 850.0);
            // A soft optical streak through the rim glint, not a flashing star.
            vec2 streak = vec2(dot(glintPosition, vec2(0.92, 0.39)),
              dot(glintPosition, vec2(-0.39, 0.92)));
            float streakLight = exp(-abs(streak.x) * 7.0 - abs(streak.y) * 145.0) * 0.5;
            // Restrained lens ghosts on the sun-to-garden axis add depth.
            vec2 opticalAxis = normalize(vec2(-0.70, -0.71));
            float ghostRadius = length(p - opticalAxis * 0.92);
            float ghost = exp(-pow((ghostRadius - 0.072) / 0.012, 2.0)) * 0.11
              + exp(-pow(ghostRadius / 0.070, 2.0)) * 0.07;
            float ghostTwo = length(p - opticalAxis * 1.38);
            ghost += exp(-pow(ghostTwo / 0.12, 2.0)) * 0.10;
            ghost *= uFlareStrength;
            float raysReveal = smoothstep(0.18, 0.95, uReveal);
            // One broad swell during opening; no repeated flashes. At reveal=1
            // this is zero, including when reduced motion skips the transition.
            float openingGlow = pow(sin(uReveal * 3.14159265), 2.0) * 0.16;
            float outside = clamp(halo + ((beams + corona) * uRayStrength + shafts
              + streakLight + ghost + openingGlow * exp(-radius * 1.8)) * raysReveal, 0.0, 0.98);
            vec3 rayColor = mix(uEdge, uHalo, clamp(shafts + ghost, 0.0, 1.0));
            rayColor = mix(rayColor, uCore, clamp(halo + corona + glint + streakLight, 0.0, 1.0));
            vec3 color = mix(rayColor, discColor, disc);
            color = mix(color, uCore, glint * 0.8);
            float alpha = (disc + outside * (1.0 - disc)) * uReveal
              * (1.0 - smoothstep(1.85, 1.95, radius));
            gl_FragColor = vec4(color, alpha);
            #include <colorspace_fragment>
          }
        `} />
    </mesh>
  </>
}
