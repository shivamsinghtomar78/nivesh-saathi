"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      {/* Positioned slightly to the right to balance the text on the left */}
      <mesh ref={meshRef} position={[2.5, 0, 0]} scale={1.8}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.8}
          chromaticAberration={0.08}
          anisotropy={0.2}
          distortion={0.3}
          distortionScale={0.4}
          temporalDistortion={0.1}
          color="#d7b66d"
          attenuationDistance={1.5}
          attenuationColor="#ffffff"
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none opacity-40 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.5} />
        <AbstractShape />
        <Environment preset="city" />
        <ContactShadows position={[2.5, -2.5, 0]} opacity={0.3} scale={10} blur={2.5} far={4} />
      </Canvas>
    </div>
  );
}
