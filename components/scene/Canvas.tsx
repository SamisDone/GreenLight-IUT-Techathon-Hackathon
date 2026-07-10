'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Arm } from './Arm';

export default function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [2, 2, 2], fov: 50, near: 0.01, far: 100 }}
      style={{ background: '#F4F5F7' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />

      <Arm />

      <Grid
        infiniteGrid
        fadeDistance={10}
        fadeStrength={2}
        cellSize={0.1}
        sectionSize={1}
        cellColor="#D1D5DB"
        sectionColor="#9CA3AF"
      />

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </Canvas>
  );
}
