import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useFoxAnimations } from '@/lib/fox-terminal/fox-animations';

function FoxModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { currentAnimation } = useFoxAnimations();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Base rotation
    meshRef.current.rotation.y += 0.01;

    // Hover effect
    if (hovered) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }

    // Animation effects
    if (currentAnimation === 'dance') {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.2;
      meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.5;
    } else if (currentAnimation === 'spin') {
      meshRef.current.rotation.y += 0.1;
    } else if (currentAnimation === 'shake') {
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 20) * 0.1;
    }
  });

  return (
    <group>
      {/* Low-poly fox head */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Fox head - pyramid shape */}
        <coneGeometry args={[1, 1.5, 4]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#00ff41"
          emissiveIntensity={hovered ? 0.5 : 0.2}
          wireframe={false}
        />
      </mesh>

      {/* Fox ears */}
      <mesh position={[-0.5, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.2, 0.5, 3]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#00ff41"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0.5, 0.8, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.2, 0.5, 3]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#00ff41"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Fox eyes */}
      <mesh position={[-0.3, 0.2, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#00ff41"
          emissive="#00ff41"
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[0.3, 0.2, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#00ff41"
          emissive="#00ff41"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Holographic grid lines */}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.ConeGeometry(1, 1.5, 4)]} />
        <lineBasicMaterial attach="material" color="#00ff41" linewidth={2} />
      </lineSegments>
    </group>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }

  useFrame((state) => {
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y += 0.001;
    
    // Animate particles
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.001;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00ff41"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export function FoxHologram() {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enableZoom={false} enablePan={false} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ff41" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ff88" />
        
        {/* Fox Model */}
        <FoxModel />
        
        {/* Particles */}
        <Particles />
        
        {/* Grid */}
        <gridHelper args={[10, 10, '#00ff41', '#00ff41']} rotation={[Math.PI / 2, 0, 0]} />
      </Canvas>
    </div>
  );
}
