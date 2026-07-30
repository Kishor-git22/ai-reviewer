'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, ContactShadows, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const CORE_COLOR = '#E8763A'
const CORE_RADIUS = 1.2

// Tilting a ring is a pure rotation about the origin, so it never changes
// how close any point on it gets to the origin  that distance is fixed by
// min(radiusX, radiusZ) alone. The green ring's radiusZ (1.0) was smaller
// than CORE_RADIUS (1.2), so at its narrow ends the ellipse geometrically
// passed *inside* the core  no tilt could fix that, only the radius could.
// Every orbit below now keeps its smaller axis comfortably outside the core
// (>= CORE_RADIUS + 0.6) so the full loop clears it, tilt or no tilt.
const ORBITS = [
  {
    color: '#6C93B0',
    radiusX: 3.0,
    radiusZ: 1.9,
    tiltX: 0.2,
    tiltZ: -0.12,
    speed: 0.32,
    phase: 0,
    node: 0.26,
  },
  {
    color: '#9986B5',
    radiusX: 2.8,
    radiusZ: 2.0,
    tiltX: -0.25,
    tiltZ: 0.2,
    speed: 0.26,
    phase: 2.1,
    node: 0.22,
  },
  {
    color: '#6FA98A',
    radiusX: 3.3,
    radiusZ: 1.85,
    tiltX: 0.15,
    tiltZ: 0.35,
    speed: 0.4,
    phase: 4.2,
    node: 0.22,
  },
] as const

// Bold, flat-shaded low-poly facets instead of a "realistic" glossy gem
// deliberately not chasing photorealism. Flat shading gets its tonal
// contrast from a single strong key light hitting each triangle's true
// normal, so the core reads as a clean 3-tone gradient (bright top, mid
// body, dark underside) reliably, without depending on a reflection
// environment the way a glossy material would.
function useFacetedGeometry(radius: number) {
  return useMemo(() => new THREE.IcosahedronGeometry(radius, 0), [radius])
}

// The faceted core: the pull request under review, held at the center
// while the three agents orbit and weigh in on it.
function ConsensusCore() {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometry = useFacetedGeometry(CORE_RADIUS)

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.1
    if (meshRef.current) meshRef.current.rotation.set(0.15, t, 0)
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={CORE_COLOR} roughness={0.6} metalness={0.05} flatShading />
    </mesh>
  )
}

// One reviewing agent riding an elliptical orbit ring around the core  the
// ring and the node share one tilted group, so the node's position is just
// its own local ellipse parametrization; the group's rotation places both
// in 3D space together with no separate quaternion aiming needed.
function AgentOrbit({
  color,
  radiusX,
  radiusZ,
  tiltX,
  tiltZ,
  speed,
  phase,
  node,
}: {
  color: string
  radiusX: number
  radiusZ: number
  tiltX: number
  tiltZ: number
  speed: number
  phase: number
  node: number
}) {
  const nodeRef = useRef<THREE.Mesh>(null)
  const geometry = useFacetedGeometry(node)

  const ringPoints = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, Math.PI * 2, false, 0)
    return curve.getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y))
  }, [radiusX, radiusZ])

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase
    if (nodeRef.current) {
      nodeRef.current.position.set(Math.cos(t) * radiusX, 0, Math.sin(t) * radiusZ)
      nodeRef.current.rotation.y += 0.015
      nodeRef.current.rotation.x += 0.008
    }
  })

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <Line points={ringPoints} color={color} lineWidth={1} transparent opacity={0.3} />
      <mesh ref={nodeRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.05}
          emissive={color}
          emissiveIntensity={0.2}
          flatShading
        />
      </mesh>
    </group>
  )
}

function BackgroundStars({ count = 18 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 3.4 + Math.random() * 2.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      arr[i3] = radius * Math.sin(phi) * Math.cos(theta)
      arr[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      arr[i3 + 2] = radius * Math.cos(phi)
    }
    return arr
  }, [count])

  const particlesRef = useRef<THREE.Points>(null)
  useFrame((state) => {
    if (particlesRef.current) particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#F3EEE4" size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

// One dominant warm key light does the real work here  that's what
// produces the clean bright-top / mid-body / dark-underside gradient on the
// flat-shaded core. Fill and rim are both deliberately weak; too much of
// either flattens the contrast back out and the facets stop reading.
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight position={[3, 5, 4]} intensity={2.6} color="#FFF0DC" />
      <directionalLight position={[-4, -2, 2]} intensity={0.35} color="#5B7189" />
      <directionalLight position={[0, 2, -5]} intensity={0.5} color="#FFD9B0" />
    </>
  )
}

function Scene() {
  return (
    <>
      <SceneLighting />

      <Float
        speed={1.4}
        rotationIntensity={0.2}
        floatIntensity={0.35}
        floatingRange={[-0.12, 0.12]}
      >
        <ConsensusCore />
        {ORBITS.map((orbit) => (
          <AgentOrbit key={orbit.color} {...orbit} />
        ))}
      </Float>

      <BackgroundStars />

      <ContactShadows position={[0, -1.8, 0]} opacity={0.45} scale={12} blur={2.6} far={4} />

      {/* Real user control: drag to orbit a full 360° on any axis, scroll/
          pinch to zoom within limits that keep the object framed. Panning is
          off on purpose  this sits in a fixed hero slot, and letting users
          drag the whole thing off-center would just strand it out of view
          with no way back short of a page reload. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={5.5}
        maxDistance={12}
      />
    </>
  )
}

export function HeroScene() {
  return (
    <div className="h-full min-h-[400px] w-full touch-none">
      <Canvas
        camera={{ position: [0, 0.5, 8.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export default HeroScene
