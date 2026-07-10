'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Arm } from './Arm';

export default function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [2, 2, 2], fov: 50, near: 0.01, far: 100 }}
      style={{ background: '#0A0B0D' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      <Arm />

      <Grid
        infiniteGrid
        fadeDistance={10}
        fadeStrength={2}
        cellSize={0.1}
        sectionSize={1}
        cellColor="#444444"
        sectionColor="#888888"
      />

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </Canvas>
  );
}
