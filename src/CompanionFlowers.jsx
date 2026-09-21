import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createWindMaterial } from './FlowerModel'

const TAU = Math.PI * 2
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const smooth = x => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t) }

// Daisies have rounded, spoon-shaped ray florets; lilies have six broad,
// pointed tepals, rising into a trumpet before their tips curl backwards.
function petalSurface(lily, colors) {
  const positions = [], normalsColors = [], uv = [], indices = []
  const rows = lily ? 24 : 16, columns = lily ? 10 : 6
  const tip = new THREE.Color(lily ? colors.lilyPetal : '#ffffff')
  const throat = new THREE.Color(lily ? colors.lilyThroat : '#ffffff')
  const blush = new THREE.Color(colors.lilyBlush), tint = new THREE.Color()
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, arch = Math.sin(Math.PI * t)
    for (let j = 0; j <= columns; j++) {
      const s = j / columns * 2 - 1
      const width = lily ? 0.36 * arch ** 0.8 : 0.105 * arch ** 0.42 * (0.65 + t * 0.55)
      const z = lily
        ? 0.67 * Math.sin(t * Math.PI * 0.95) - 0.35 * t ** 5 + 0.10 * s * s * arch
        : 0.09 * arch - 0.10 * t ** 4 + 0.04 * s * s * arch + 0.009 * Math.cos(s * 10) * arch
      positions.push(s * (width + 0.001) * (1 + 0.025 * Math.sin(t * 25) * s), t * (lily ? 1.32 : 0.73), z)
      tint.copy(throat).lerp(tip, smooth(t / 0.48))
      if (lily) tint.lerp(blush, Math.exp(-s * s * 18) * arch * 0.34)
      normalsColors.push(tint.r, tint.g, tint.b)
      uv.push(j / columns, t)
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j, b = a + columns + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(normalsColors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function buildGarden(plants, colors, mobile) {
  const batches = { daisy: [], lily: [], discs: [], seeds: [], filaments: [], anthers: [], leaves: [] }
  const stems = []
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
  function add(kind, plant, position, scale, color, rotation = [0, 0, 0], petal = null) {
    dummy.position.fromArray(position); dummy.rotation.set(...rotation); dummy.scale.fromArray(scale); dummy.updateMatrix()
    batches[kind].push({ plant, matrix: dummy.matrix.clone(), color: new THREE.Color(color), petal })
  }
  plants.forEach((plant, plantIndex) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...plant.position),
      new THREE.Vector3(plant.position[0] + plant.lean * 0.3, plant.height * 0.5, plant.position[2] + 0.04),
      new THREE.Vector3(plant.position[0] + plant.lean, plant.height, plant.position[2]),
    ])
    stems.push(new THREE.TubeGeometry(curve, 14, plant.kind === 'lily' ? 0.023 : 0.016, 5, false))
    const isLily = plant.kind === 'lily'
    const petalColor = isLily ? '#ffffff' : colors[plant.color]
    const rings = isLily ? 2 : plant.color === 'companionGold' ? 3 : 2
    for (let ring = 0; ring < rings; ring++) {
      const count = isLily ? 3 : 22 - ring * 3
      for (let i = 0; i < count; i++) {
        const theta = (i + ring * 0.5) / count * TAU + Math.sin(i * 3.1 + plantIndex) * 0.028
        const radius = isLily ? 0.06 : 0.20 - ring * 0.018
        const fold = isLily ? ring * 0.10 : 0.12 + ring * 0.20
        add(isLily ? 'lily' : 'daisy', plantIndex, [0, 0, 0],
          [isLily ? 1 - ring * 0.10 : 1, 1 - ring * (isLily ? 0.035 : 0.14), 1], petalColor,
          [0, 0, 0], { theta, radius, fold, ring })
      }
    }
    if (!isLily) {
      add('discs', plantIndex, [0, 0, 0.10], [0.225, 0.225, 0.12], colors.companionCenter)
      const count = mobile ? 85 : 155
      for (let i = 0; i < count; i++) {
        const r = 0.216 * Math.sqrt((i + 0.5) / count), theta = i * GOLDEN
        add('seeds', plantIndex, [Math.cos(theta) * r, Math.sin(theta) * r, 0.11 + 0.11 * Math.sqrt(1 - (r / 0.23) ** 2)],
          [0.015, 0.019, 0.021], i % 4 ? colors.companionCenter : colors.companionGold, [0, 0, theta])
      }
    } else {
      // Six separate filaments terminate in elongated pollen-bearing anthers.
      for (let i = 0; i < 7; i++) {
        const theta = i / 6 * TAU, central = i === 6
        const end = new THREE.Vector3(central ? 0 : Math.cos(theta) * 0.27,
          central ? 0.04 : Math.sin(theta) * 0.27, central ? 0.87 : 0.72 + (i % 2) * 0.09)
        dummy.position.copy(end).multiplyScalar(0.5)
        dummy.quaternion.setFromUnitVectors(up, end.clone().normalize())
        dummy.scale.set(central ? 0.018 : 0.012, end.length(), central ? 0.018 : 0.012); dummy.updateMatrix()
        batches.filaments.push({ plant: plantIndex, matrix: dummy.matrix.clone(), color: new THREE.Color(colors.lilyThroat) })
        add('anthers', plantIndex, end.toArray(), central ? [0.035, 0.035, 0.025] : [0.035, 0.105, 0.035],
          central ? colors.lilyThroat : colors.lilyPollen, [0.2, 0.4, theta - 0.4])
      }
    }
    // Narrow leaves alternate along the stem; everything shares the existing leaf mesh.
    for (let i = 0; i < (isLily ? 5 : 3); i++) {
      const t = 0.18 + i * 0.12, side = i % 2 ? 1 : -1
      add('leaves', plantIndex, curve.getPointAt(t).toArray(),
        [isLily ? 0.22 : 0.28, isLily ? 0.64 : 0.40, 0.5], '#ffffff', [0.2, side * 0.55, side * 1.0])
    }
  })
  const stem = mergeGeometries(stems)
  stems.forEach(geometry => geometry.dispose())
  return { batches, stem }
}

/** All companion flowers use eight batches, not one mesh per petal or stamen.
 * Matrices upload only during opening; the shared wind shader animates the tips. */
export default function CompanionFlowers({ config, resources, active, cycle, reducedMotion, mobile }) {
  const plants = config.garden.companions
  const refs = useRef({}), elapsed = useRef(0), last = useRef(-1)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const head = useMemo(() => new THREE.Object3D(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  const foldRotation = useMemo(() => new THREE.Quaternion(), [])
  const owned = useMemo(() => {
    const garden = buildGarden(plants, config.ui.colors, mobile)
    const wind = createWindMaterial('#ffffff')
    return { ...garden, wind, daisy: petalSurface(false, config.ui.colors), lily: petalSurface(true, config.ui.colors),
      sphere: new THREE.SphereGeometry(1, 12, 8), cylinder: new THREE.CylinderGeometry(1, 1, 1, 5),
      plain: new THREE.MeshStandardMaterial({ roughness: 0.8 }) }
  }, [plants, config.ui.colors, mobile])
  useEffect(() => () => {
    owned.stem.dispose(); owned.daisy.dispose(); owned.lily.dispose(); owned.sphere.dispose()
    owned.cylinder.dispose(); owned.plain.dispose(); owned.wind.material.dispose()
  }, [owned])
  useLayoutEffect(() => {
    for (const [kind, records] of Object.entries(owned.batches)) {
      const mesh = refs.current[kind]
      records.forEach((record, i) => {
        mesh.setColorAt(i, record.color)
        // Leaves are already in garden space, independent of the bloom transform.
        if (kind === 'leaves') mesh.setMatrixAt(i, record.matrix)
      })
      mesh.instanceColor.needsUpdate = true; mesh.instanceMatrix.needsUpdate = true
    }
    last.current = -1
  }, [owned])
  useEffect(() => { elapsed.current = 0; last.current = -1 }, [active, cycle])
  useFrame(({ clock }, delta) => {
    owned.wind.time.value = clock.elapsedTime
    owned.wind.strength.value = reducedMotion ? 0 : 0.7
    if (active) elapsed.current += delta
    const duration = config.animation.bloomDuration
    const end = duration + Math.max(0, ...plants.map(plant => plant.delay))
    const time = active ? (reducedMotion ? end : Math.min(elapsed.current, end)) : 0
    if (last.current === time) return
    last.current = time
    const heads = plants.map(plant => {
      const opening = active ? smooth((time - plant.delay) / duration) : 0
      head.position.set(plant.position[0] + plant.lean, plant.height, plant.position[2])
      head.rotation.set(...plant.facing); head.scale.setScalar(plant.headScale * (0.45 + 0.55 * opening)); head.updateMatrix()
      return { matrix: head.matrix.clone(), opening }
    })
    for (const [kind, records] of Object.entries(owned.batches)) {
      if (kind === 'leaves') continue
      const mesh = refs.current[kind]
      records.forEach((record, i) => {
        const { matrix: headMatrix, opening } = heads[record.plant]
        if (record.petal) {
          const { theta, radius, fold, ring } = record.petal
          const bloom = smooth((opening - ring * 0.04) / (1 - ring * 0.04))
          dummy.position.set(-Math.sin(theta) * radius, Math.cos(theta) * radius, ring * 0.026)
          dummy.quaternion.setFromAxisAngle(zAxis, theta)
          foldRotation.setFromAxisAngle(xAxis, THREE.MathUtils.lerp(1.30, fold, bloom))
          dummy.quaternion.multiply(foldRotation)
          dummy.scale.setFromMatrixScale(record.matrix); dummy.updateMatrix()
          matrix.multiplyMatrices(headMatrix, dummy.matrix)
        } else matrix.multiplyMatrices(headMatrix, record.matrix)
        mesh.setMatrixAt(i, matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
  })
  const geometry = { daisy: owned.daisy, lily: owned.lily, discs: owned.sphere, seeds: resources.seed,
    filaments: owned.cylinder, anthers: owned.sphere, leaves: resources.leaf }
  return <group dispose={null}>
    <mesh geometry={owned.stem} material={resources.stemMaterial} />
    {Object.entries(owned.batches).map(([kind, records]) => <instancedMesh key={kind}
      ref={mesh => { refs.current[kind] = mesh }} frustumCulled={false}
      args={[geometry[kind], kind === 'leaves' ? resources.leafMaterial : kind === 'daisy' || kind === 'lily' ? owned.wind.material : owned.plain, records.length]} />)}
  </group>
}
