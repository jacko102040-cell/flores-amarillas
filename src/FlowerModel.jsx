import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const TAU = Math.PI * 2
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const clamp01 = value => Math.min(1, Math.max(0, value))
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t) }
const noise = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }
const RINGS = [
  { count: 34, length: 1, radius: 0.40, offset: 0, z: 0 },
  { count: 26, length: 0.84, radius: 0.38, offset: 0.47, z: 0.075 },
  { count: 12, length: 0.28, radius: 0.41, offset: 0.23, z: 0.105 },
]
const PETAL_COUNT = RINGS.reduce((sum, ring) => sum + ring.count, 0)

/** t = root → tip, s = left → right. Broad shoulders and a pointed tip,
 * shallow ribs, asymmetric edges and a recurved end form each ray floret.
 * Near flowers use 23×9 samples; background flowers share a 15×5 surface. */
export function createPetalGeometry(rows = 22, columns = 8) {
  const positions = [], colors = [], uvs = [], indices = []
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const width = 0.143 * Math.pow(Math.sin(Math.PI * t), 0.86) * (0.9 + 0.1 * t) + 0.002
    for (let column = 0; column <= columns; column++) {
      const s = column / columns * 2 - 1
      const edge = 1 + 0.035 * (Math.sin(t * 27 + s * 2) + 0.45 * Math.sin(t * 43 - s)) * Math.abs(s)
      const cup = 0.055 * s * s * Math.sin(Math.PI * t)
      const ribs = 0.007 * Math.cos(s * Math.PI * 4) * Math.sin(Math.PI * t)
      const curl = 0.19 * t * t - 0.34 * t ** 6
      const twist = 0.036 * s * t * t
      positions.push(s * width * edge + 0.038 * Math.sin(t * Math.PI), t * 1.10, cup + ribs + curl + twist)
      colors.push(1, 0.42 + 0.49 * Math.sqrt(t), 0.20 + 0.62 * t)
      uvs.push(column / columns, t)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  // A thin closed shell has a real edge when viewed sideways or from behind.
  // Keep its base fixed and taper the thickness at the tip.
  const frontCount = positions.length / 3, frontIndices = [...indices]
  for (let i = 0; i < frontCount; i++) {
    const t = uvs[i * 2 + 1]
    positions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2] - 0.007 * (0.4 + Math.sin(t * Math.PI)))
    colors.push(colors[i * 3] * 0.96, colors[i * 3 + 1] * 0.96, colors[i * 3 + 2] * 0.96)
    uvs.push(uvs[i * 2], t)
  }
  for (let i = 0; i < frontIndices.length; i += 3) indices.push(frontIndices[i] + frontCount, frontIndices[i + 2] + frontCount, frontIndices[i + 1] + frontCount)
  const stitch = (a, b) => indices.push(a, a + frontCount, b, b, a + frontCount, b + frontCount)
  for (let i = 0; i < rows; i++) { stitch(i * (columns + 1), (i + 1) * (columns + 1)); stitch((i + 1) * (columns + 1) + columns, i * (columns + 1) + columns) }
  for (let j = 0; j < columns; j++) { stitch(j + 1, j); stitch(rows * (columns + 1) + j, rows * (columns + 1) + j + 1) }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function leafPoint(t, s) {
  // Serrated, ovate leaves have their own surface, rather than scaled petals.
  const width = 0.36 * Math.pow(Math.sin(Math.PI * t), 0.72) * (1.15 - 0.45 * t)
  const teeth = 1 + 0.045 * Math.sin(t * Math.PI * 24) * Math.abs(s) ** 6
  const ridge = 0.012 * Math.exp(-s * s * 65) * Math.sin(Math.PI * t)
  return [s * width * teeth * (1 + 0.05 * s), t * 1.12,
    0.12 * Math.sin(Math.PI * t) - 0.075 * s * s * Math.sin(Math.PI * t)
      + 0.02 * Math.sin(t * 12) * s + ridge - 0.10 * t ** 4]
}

function createLeafGeometry() {
  const positions = [], colors = [], uvs = [], indices = []
  const rows = 24, columns = 8
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    for (let col = 0; col <= columns; col++) {
      const s = col / columns * 2 - 1
      positions.push(...leafPoint(t, s))
      uvs.push(col / columns, t)
      const tint = 0.76 + 0.24 * Math.sin(Math.PI * t) - 0.10 * Math.abs(s)
      colors.push(tint, tint, tint * 0.88)
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col, b = a + columns + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createVeins() {
  const vertices = []
  function segment(t0, s0, t1, s1) {
    const a = leafPoint(t0, s0), b = leafPoint(t1, s1)
    a[2] += 0.004; b[2] += 0.004
    vertices.push(...a, ...b)
  }
  for (let i = 0; i < 20; i++) segment(i / 20, 0, (i + 1) / 20, 0)
  for (let i = 1; i <= 7; i++) {
    const t = i * 0.105
    for (const side of [-1, 1]) for (let j = 0; j < 5; j++) {
      segment(t + j / 5 * 0.15, side * j / 5 * 0.92, t + (j + 1) / 5 * 0.15, side * (j + 1) / 5 * 0.92)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}

function createLeafTextures() {
  // Two shared 128² maps are generated locally: irregular pigmentation and
  // microscopic relief. Mipmaps keep veins stable at mobile viewing distances.
  const size = 128, pigment = new Uint8Array(size * size * 4), relief = new Uint8Array(size * size * 4)
  function field(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y)
    const fx = smooth(x - ix), fy = smooth(y - iy)
    const a = THREE.MathUtils.lerp(noise(ix + iy * 57), noise(ix + 1 + iy * 57), fx)
    const b = THREE.MathUtils.lerp(noise(ix + (iy + 1) * 57), noise(ix + 1 + (iy + 1) * 57), fx)
    return THREE.MathUtils.lerp(a, b, fy)
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), t = y / (size - 1), s = u * 2 - 1
    const grain = field(u * 43, t * 51), mottling = field(u * 6, t * 9)
    let vein = Math.exp(-s * s * 1900)
    for (let branch = 1; branch <= 7; branch++) {
      const distance = t - (branch * 0.105 + Math.abs(s) * 0.15)
      vein = Math.max(vein, Math.exp(-distance * distance * 26000) * (1 - Math.abs(s) * 0.65))
    }
    const tone = Math.min(1, 0.84 + mottling * 0.12 + grain * 0.025 + vein * 0.025)
    const height = 0.39 + grain * 0.14 + vein * 0.19 + mottling * 0.07
    const index = (y * size + x) * 4
    for (let channel = 0; channel < 3; channel++) {
      pigment[index + channel] = Math.round(tone * 255)
      relief[index + channel] = Math.round(height * 255)
    }
    pigment[index + 3] = 255; relief[index + 3] = 255
  }
  const map = new THREE.DataTexture(pigment, size, size, THREE.RGBAFormat)
  const bump = new THREE.DataTexture(relief, size, size, THREE.RGBAFormat)
  map.colorSpace = THREE.LinearSRGBColorSpace
  for (const texture of [map, bump]) {
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 2
    texture.needsUpdate = true
  }
  return { map, bump }
}

export function createWindMaterial(color, translucent = false) {
  const time = { value: 0 }, strength = { value: 1 }
  const material = new THREE.MeshStandardMaterial({ color, vertexColors: true, side: THREE.DoubleSide, roughness: 0.73 })
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = time; shader.uniforms.uWind = strength
    shader.vertexShader = `uniform float uTime;\nuniform float uWind;\nvarying vec2 vPetalUv;\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        float phaseN = uTime * 1.25 + position.y * 2.4;
        float dzdy = uWind * 0.023 * (2.0 * position.y * sin(phaseN) + position.y * position.y * 2.4 * cos(phaseN));
        objectNormal = normalize(vec3(objectNormal.x, objectNormal.y - dzdy * objectNormal.z, objectNormal.z));
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vPetalUv = uv;
        transformed.z += uWind * 0.023 * position.y * position.y * sin(uTime * 1.25 + position.y * 2.4);
      `)
    shader.fragmentShader = `varying vec2 vPetalUv;\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        // Fine longitudinal veins and subtle organic variation; no textures.
        float rib = pow(0.5 + 0.5 * cos(vPetalUv.x * 65.0 + sin(vPetalUv.y * 12.0)), 12.0);
        float grain = sin(vPetalUv.x * 177.0) * sin(vPetalUv.y * 281.0);
        diffuseColor.rgb *= 1.0 - 0.065 * rib * sin(vPetalUv.y * 3.14159) + 0.018 * grain;
      `)
    if (translucent) shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      // Approximate transmission from the existing light through a thin petal.
      #if NUM_DIR_LIGHTS > 0
        float transmitted = pow(max(dot(-normal, directionalLights[0].direction), 0.0), 2.0);
        outgoingLight += diffuseColor.rgb * directionalLights[0].color * transmitted
          * 0.045 * (0.25 + 0.75 * vPetalUv.y);
      #endif
      #include <opaque_fragment>
    `)
  }
  material.customProgramCacheKey = () => `veined-wind-transmission-${translucent}`
  return { material, time, strength }
}

/** Owned once by Garden: all flowers share geometry/material GPU resources. */
export function createSunflowerResources(colors) {
  const wind = createWindMaterial(colors.primaryYellow, true)
  const leafTextures = createLeafTextures()
  // Open five-lobed tubes suggest the hundreds of individual disc florets.
  const floret = new THREE.CylinderGeometry(0.72, 0.95, 1.2, 5, 1, true)
  floret.rotateX(Math.PI / 2)
  const resources = {
    petals: createPetalGeometry(), distantPetals: createPetalGeometry(14, 4),
    leaf: createLeafGeometry(), veins: createVeins(),
    seed: new THREE.IcosahedronGeometry(1, 0), disc: new THREE.SphereGeometry(1, 28, 16),
    floret,
    floretMaterial: new THREE.MeshStandardMaterial({ roughness: 0.91, side: THREE.DoubleSide }),
    receptacleMaterial: new THREE.MeshStandardMaterial({ color: colors.leafDark, roughness: 0.94,
      map: leafTextures.map, bumpMap: leafTextures.bump, bumpScale: 0.025 }),
    leafPigment: leafTextures.map, leafRelief: leafTextures.bump,
    leafMaterial: new THREE.MeshStandardMaterial({ color: colors.leaf, vertexColors: true, side: THREE.DoubleSide,
      map: leafTextures.map, bumpMap: leafTextures.bump, bumpScale: 0.016, roughness: 0.91 }),
    sepalMaterial: new THREE.MeshStandardMaterial({ color: colors.leafDark, side: THREE.DoubleSide, roughness: 0.86 }),
    veinMaterial: new THREE.LineBasicMaterial({ color: colors.leafVein, transparent: true, opacity: 0.17 }),
    seedMaterial: new THREE.MeshStandardMaterial({ roughness: 0.98 }),
    discMaterial: new THREE.MeshStandardMaterial({ color: colors.seedDark, roughness: 1 }),
    stemMaterial: new THREE.MeshStandardMaterial({ color: colors.leafDark, roughness: 0.8 }),
    wind,
  }
  resources.dispose = () => {
    for (const value of Object.values(resources)) if (value?.isBufferGeometry || value?.isMaterial || value?.isTexture) value.dispose()
    wind.material.dispose()
  }
  return resources
}

function FlowerHead({ colors, progress, resources, detail, phase, isBud = false }) {
  const petals = useRef(), seeds = useRef(), head = useRef(), sepals = useRef(), lastProgress = useRef(-1)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const zRotation = useMemo(() => new THREE.Quaternion(), [])
  const xRotation = useMemo(() => new THREE.Quaternion(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  const seedCount = isBud ? 120 : (detail ? 987 : 377)

  useLayoutEffect(() => {
    lastProgress.current = -1
    petals.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const dark = new THREE.Color(colors.seedDark), gold = new THREE.Color(colors.seedLight), tint = new THREE.Color()
    // Small per-petal pigment differences break the repeated radial pattern.
    for (let i = 0; i < PETAL_COUNT; i++) {
      tint.setRGB(1, 0.90 + noise(i * 3.4 + phase) * 0.10, 0.82 + noise(i * 6.1 + phase) * 0.18)
      petals.current.setColorAt(i, tint)
    }
    petals.current.instanceColor.needsUpdate = true
    // Vogel disc, now larger and denser. Florets are radially oriented, with a
    // dark heart and an amber rim; every instance sits above the curved disc.
    for (let i = 0; i < seedCount; i++) {
      const r = 0.445 * Math.sqrt((i + 0.5) / seedCount), angle = i * GOLDEN_ANGLE
      const dome = 0.17 * Math.sqrt(1 - (r / 0.47) ** 2)
      const centreDepression = 0.018 * Math.exp(-r * r / 0.008)
      dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0.178 + dome - centreDepression + (noise(i + phase) - 0.5) * 0.010)
      dummy.rotation.set((noise(i * 2.1) - 0.5) * 0.35, (noise(i * 3.7) - 0.5) * 0.35, angle + 0.45)
      const size = (detail ? 0.017 : 0.026) * (0.83 + noise(i + phase) * 0.3)
      dummy.scale.set(size * 0.88, size * 1.1, size * (1.3 + r * 0.65))
      dummy.updateMatrix(); seeds.current.setMatrixAt(i, dummy.matrix)
      const pollenRim = smooth((r / 0.445 - 0.70) / 0.30)
      tint.copy(dark).lerp(gold, pollenRim * 0.60 + noise(i * 3.4 + phase) * 0.20)
      seeds.current.setColorAt(i, tint)
    }
    seeds.current.instanceMatrix.needsUpdate = true
    seeds.current.instanceColor.needsUpdate = true
    // Green pointed involucral bracts behind the flower head (wrapping over if bud).
    const sepalCount = isBud ? 32 : 26
    for (let i = 0; i < sepalCount; i++) {
      const ring = Math.floor(i / 13), angle = (i % 13 + ring * 0.5) / 13 * TAU
      const radius = isBud ? (ring ? 0.12 : 0.22) : (ring ? 0.20 : 0.31)
      const forwardAngle = isBud ? (ring ? -1.1 : -1.4) : (-0.50 - ring * 0.6)
      dummy.position.set(-Math.sin(angle) * radius, Math.cos(angle) * radius, isBud ? (0.05 + ring * 0.04) : (-0.10 - ring * 0.065))
      zRotation.setFromAxisAngle(zAxis, angle); xRotation.setFromAxisAngle(xAxis, forwardAngle)
      dummy.quaternion.copy(zRotation).multiply(xRotation)
      dummy.scale.set(isBud ? 0.45 : (0.38 - ring * 0.05), isBud ? 0.65 : (0.46 - ring * 0.09), isBud ? 1.1 : 0.8)
      dummy.updateMatrix(); sepals.current.setMatrixAt(i, dummy.matrix)
    }
    sepals.current.instanceMatrix.needsUpdate = true
  }, [colors.seedDark, colors.seedLight, seedCount, detail, phase, dummy, zRotation, xRotation, zAxis, xAxis, isBud])

  useFrame(() => {
    if (lastProgress.current === progress.current) return
    lastProgress.current = progress.current
    let index = 0
    const activeProgress = isBud ? Math.min(0.08, progress.current * 0.08) : progress.current
    RINGS.forEach((ring, ringIndex) => {
      const opening = smooth((activeProgress - ringIndex * 0.07) / (1 - ringIndex * 0.07))
      for (let i = 0; i < ring.count; i++) {
        const theta = (i + ring.offset) / ring.count * TAU + (noise(i + phase) - 0.5) * 0.065
        const fold = isBud ? 1.45 : THREE.MathUtils.lerp(1.36, -0.16 + ringIndex * 0.14, opening)
        zRotation.setFromAxisAngle(zAxis, theta)
        xRotation.setFromAxisAngle(xAxis, fold + Math.sin(i * 4.2 + phase) * 0.18 * (isBud ? 0.05 : opening))
        dummy.quaternion.copy(zRotation).multiply(xRotation)
        const radius = THREE.MathUtils.lerp(0.10, ring.radius, opening)
        dummy.position.set(-Math.sin(theta) * radius, Math.cos(theta) * radius, ring.z)
        dummy.scale.set(
          isBud ? 0.4 : (0.84 + noise(i * 3 + phase) * 0.30),
          isBud ? (ring.length * 0.35) : (ring.length * (0.82 + noise(i + phase) * 0.28)),
          isBud ? 0.3 : (0.65 + noise(i * 5.7 + phase) * 0.75)
        )
        dummy.updateMatrix(); petals.current.setMatrixAt(index++, dummy.matrix)
      }
    })
    petals.current.instanceMatrix.needsUpdate = true
    head.current.scale.setScalar(THREE.MathUtils.lerp(0.67, 1, smooth(progress.current)))
  })
  return <group ref={head} dispose={null}>
    <instancedMesh ref={petals} args={[detail ? resources.petals : resources.distantPetals, resources.wind.material, PETAL_COUNT]} frustumCulled={false} castShadow />
    <mesh geometry={resources.disc} material={resources.discMaterial} position={[0, 0, 0.15]} scale={[0.47, 0.47, 0.17]} />
    <instancedMesh ref={seeds} args={[detail ? resources.floret : resources.seed, detail ? resources.floretMaterial : resources.seedMaterial, seedCount]} frustumCulled={false} />
    <mesh geometry={resources.disc} material={resources.receptacleMaterial} position={[0, 0, -0.07]} scale={[0.43, 0.43, 0.22]} />
    <instancedMesh ref={sepals} args={[resources.leaf, resources.leafMaterial, isBud ? 32 : 26]} frustumCulled={false} />
  </group>
}

function Leaf({ resources, position, rotation, scale, detail }) {
  return <group position={position} rotation={rotation} scale={scale} dispose={null}>
    <mesh geometry={resources.leaf} material={resources.leafMaterial} castShadow receiveShadow />
    {detail && <lineSegments geometry={resources.veins} material={resources.veinMaterial} />}
  </group>
}

export function FallenPetals({ resources }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const count = 16

  useLayoutEffect(() => {
    if (!meshRef.current) return
    const tint = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU + noise(i * 12.3) * 0.8
      const dist = 0.4 + (i % 5) * 0.45 + noise(i * 7.1) * 0.3
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist - 0.4
      const y = -0.095 + noise(i * 3.7) * 0.015
      
      dummy.position.set(x, y, z)
      dummy.rotation.set(
        Math.PI / 2 + (noise(i * 2.1) - 0.5) * 0.2,
        (noise(i * 5.5) - 0.5) * 0.3,
        angle + (noise(i * 9.2) - 0.5) * 1.5
      )
      const size = 0.7 + noise(i * 4.4) * 0.5
      dummy.scale.set(size * 0.8, size, size * 0.5)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      tint.setRGB(1, 0.85 + noise(i * 2.9) * 0.15, 0.25 + noise(i * 4.1) * 0.35)
      meshRef.current.setColorAt(i, tint)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.instanceColor.needsUpdate = true
  }, [dummy])

  return (
    <instancedMesh ref={meshRef} args={[resources.petals, resources.wind.material, count]} frustumCulled={false} castShadow />
  )
}

export default function FlowerModel({ colors, active, cycle, reducedMotion, duration, plant, resources, detail }) {
  const group = useRef(), progress = useRef(0), elapsed = useRef(0)
  const { height, lean, phase, headScale, delay, facing, isBud = false } = plant
  
  // Per-plant head tilt variation so no two sunflowers face identically
  const customFacing = useMemo(() => [
    facing[0] + (noise(phase * 1.3) - 0.5) * 0.22,
    facing[1] + (noise(phase * 2.7) - 0.5) * 0.28,
    facing[2] + (noise(phase * 3.9) - 0.5) * 0.18,
  ], [facing, phase])

  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.12 + Math.sin(phase) * 0.06, height * 0.32, 0.06),
    new THREE.Vector3(lean * 0.68 - Math.sin(phase) * 0.04, height * 0.73, -0.06), new THREE.Vector3(lean, height, -0.18 * headScale),
  ]), [height, lean, phase, headScale])
  const leaves = useMemo(() => [0.22, 0.40, 0.59, 0.76].map((t, index) => {
    const side = index % 2 === 0 ? 1 : -1
    const point = curve.getPointAt(t + (noise(phase + index * 4) - 0.5) * 0.04)
    const rotation = [0.10 + noise(phase + index) * 0.45, side * (0.2 + noise(phase * 2 + index) * 0.4), side * (1.04 + noise(index + phase) * 0.56)]
    const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...rotation))
    const end = point.clone().addScaledVector(direction, 0.16 + (1 - t) * 0.12)
    return { position: end.toArray(), rotation, start: point, end,
      scale: (0.99 - t * 0.53) * (0.88 + noise(phase + index) * 0.2) }
  }), [curve, phase])
  const stem = useMemo(() => {
    const geometry = new THREE.TubeGeometry(curve, 28, isBud ? 0.032 : 0.045, 7, false)
    const positions = geometry.attributes.position
    for (let row = 0; row <= 28; row++) {
      const point = curve.getPointAt(row / 28), taper = 1.25 - row / 28 * 0.59
      for (let col = 0; col <= 7; col++) {
        const i = row * 8 + col
        positions.setXYZ(i, point.x + (positions.getX(i) - point.x) * taper,
          point.y + (positions.getY(i) - point.y) * taper, point.z + (positions.getZ(i) - point.z) * taper)
      }
    }
    geometry.computeVertexNormals()
    const parts = [geometry, ...leaves.map(leaf => {
      const mid = leaf.start.clone().lerp(leaf.end, 0.48); mid.y += 0.035
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([leaf.start, mid, leaf.end]), 6, 0.013, 5, false)
    })]
    const joined = mergeGeometries(parts)
    parts.forEach(part => part.dispose())
    return joined
  }, [curve, leaves, isBud])
  useEffect(() => () => stem.dispose(), [stem])
  useEffect(() => { elapsed.current = 0; progress.current = 0 }, [active, cycle])
  useFrame(({ clock }, delta) => {
    if (active) elapsed.current += delta
    progress.current = active ? (reducedMotion ? 1 : clamp01((elapsed.current - delay) / duration)) : 0.035
    group.current.rotation.z = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.55 + phase) * 0.013
    group.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.38 + phase * 1.7) * 0.024
  })
  return <group position={plant.position}>
    <group ref={group}>
      <mesh geometry={stem} material={resources.stemMaterial} dispose={null} castShadow receiveShadow />
      {leaves.map((leaf, i) => <Leaf key={i} {...leaf} resources={resources} detail={detail} />)}
      <group position={[lean, height, 0]} rotation={[customFacing[0], customFacing[1], customFacing[2]]} scale={isBud ? headScale * 0.5 : headScale}>
        <FlowerHead colors={colors} progress={progress} resources={resources} detail={detail} phase={phase} isBud={isBud} />
      </group>
    </group>
  </group>
}
