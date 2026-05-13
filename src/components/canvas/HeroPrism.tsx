'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// Prism geometry component
function PrismMesh({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)

  // Create prism geometry
  const geometry = useMemo(() => {
    // Create a triangular prism using CylinderGeometry with 3 radial segments
    const geo = new THREE.CylinderGeometry(1.5, 1.5, 3, 3, 1, false)
    geo.rotateX(Math.PI / 2)
    geo.rotateZ(Math.PI / 6)
    return geo
  }, [])

  // Create edges geometry for wireframe effect
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15)
  }, [geometry])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
    if (edgesRef.current) {
      edgesRef.current.rotation.y = state.clock.elapsedTime * 0.15
      edgesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Main prism mesh */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#3b82f6"
          metalness={0.1}
          roughness={0.1}
          transmission={0.6}
          thickness={1.5}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments ref={edgesRef} geometry={edgesGeometry}>
        <lineBasicMaterial color="#60a5fa" linewidth={2} />
      </lineSegments>

      {/* Inner glow effect */}
      <mesh geometry={geometry} scale={0.95}>
        <meshBasicMaterial color="#1d4ed8" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// Floating particles around the prism
function FloatingParticles({ count = 20 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      // Random position in sphere around center
      const radius = 3 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      // Blue-ish colors
      colors[i3] = 0.3 + Math.random() * 0.3
      colors[i3 + 1] = 0.5 + Math.random() * 0.3
      colors[i3 + 2] = 0.9 + Math.random() * 0.1
    }

    return [positions, colors]
  }, [count])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
      particlesRef.current.rotation.z = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

// Main 3D scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[5, -5, 5]} intensity={0.5} color="#8b5cf6" />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[-0.2, 0.2]}>
        <PrismMesh position={[0, 0, 0]} />
      </Float>

      <FloatingParticles count={30} />

      <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

      <Environment preset="city" />
    </>
  )
}

// Hero Prism Component
export function HeroPrism() {
  return (
    <div className="h-full min-h-[400px] w-full">
      <Canvas
        shadows
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export default HeroPrism
