import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t) }

/**
 * Luminous MoonModel that shines in the nocturnal sky on the initial screen.
 * Transitions smoothly away when the user begins the spring bloom.
 */
export default function MoonModel({ config, active, cycle, reducedMotion }) {
  const mesh = useRef(), light = useRef(), elapsed = useRef(0)
  const position = useMemo(() => new THREE.Vector3(), [])
  
  const uniforms = useMemo(() => ({
    uReveal: { value: 1.0 },
    uTime: { value: 0 },
    uCore: { value: new THREE.Color('#f6f9fe') },
    uEdge: { value: new THREE.Color('#94a9c4') },
    uHalo: { value: new THREE.Color('#b0c8ea') },
  }), [])

  useEffect(() => {
    elapsed.current = 0
    uniforms.uReveal.value = active ? 0 : 1.0
    if (mesh.current) mesh.current.visible = !active
    if (light.current) light.current.intensity = active ? 0 : 1.25
  }, [active, cycle, uniforms])

  useFrame(({ camera, size }, delta) => {
    if (active) elapsed.current += Math.min(delta, 0.25)
    // When inactive (night), reveal = 1.0; when active (dawn arrives), fades to 0
    const fadeOutDuration = config.animation.bloomDuration * 0.65
    const progress = active ? (reducedMotion ? 1 : smooth(elapsed.current / fadeOutDuration)) : 0
    const reveal = 1.0 - progress

    uniforms.uReveal.value = reveal
    uniforms.uTime.value = reducedMotion ? 0 : elapsed.current
    if (light.current) {
      light.current.intensity = 1.25 * reveal
    }

    if (mesh.current) {
      mesh.current.visible = reveal > 0.01
    }

    if (reveal <= 0.01) return

    const mobile = size.width < 1000
    const pixels = mobile ? 280 : 540
    // Position in upper-right sky with serene placement
    const right = mobile ? 45 : 140
    const top = mobile ? 42 : 75
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
    {/* Soft cool moonlight illuminating the dormant night garden */}
    <directionalLight ref={light} position={[2.5, 6, 4.5]} intensity={1.25} color="#bdd6f8" />
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
          uniform vec3 uCore;
          uniform vec3 uEdge;
          uniform vec3 uHalo;

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
            return v;
          }

          void main() {
            vec2 p = (vMoonUv * 2.0 - 1.0) * 1.7;
            float radius = length(p);
            if (radius > 1.6) discard;

            // Moon disc edge
            float disc = 1.0 - smoothstep(0.488, 0.502, radius);

            // 3D spherical normal
            float z = sqrt(max(0.0, 1.0 - pow(radius / 0.50, 2.0)));
            vec3 normal = normalize(vec3(p.x, p.y, z));

            // Lunar craters & dark maria plains
            vec2 moonCoord = p * 4.2;
            float craters = fbm(moonCoord);
            float maria = smoothstep(0.38, 0.68, fbm(moonCoord * 0.75 + vec2(1.4, 0.9)));
            float craterRims = pow(noise(moonCoord * 3.2), 3.0) * 0.32;

            // Moon highland vs maria color
            vec3 highland = uCore;
            vec3 mareColor = uEdge;
            vec3 surfaceColor = mix(highland, mareColor, maria * 0.42);
            surfaceColor += craterRims * 0.14;
            surfaceColor *= 0.90 + 0.15 * craters;

            // Soft lunar illumination
            float sunDir = dot(normal, normalize(vec3(0.28, 0.22, 0.93)));
            float moonShading = smoothstep(-0.20, 0.60, sunDir) * 0.55 + 0.45;
            vec3 shadedMoon = surfaceColor * moonShading;

            // Ethereal lunar halo and gentle breathing corona
            float halo = exp(-pow(radius - 0.50, 2.0) * 14.0) * 0.42;
            float outerGlow = exp(-radius * 2.5) * 0.32;
            float breathing = 0.92 + 0.08 * sin(uTime * 1.3);
            float totalGlow = (halo + outerGlow) * breathing;

            vec3 finalColor = mix(uHalo * totalGlow * 1.35, shadedMoon, disc);
            float alpha = (disc + totalGlow * (1.0 - disc)) * uReveal * (1.0 - smoothstep(1.45, 1.6, radius));

            gl_FragColor = vec4(finalColor, alpha);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  </>
}
