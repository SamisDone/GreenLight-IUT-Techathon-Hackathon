'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { KEYS } from '@/lib/robot/constants';
import { useRobotStore } from '@/store/robot';
import type { Mesh } from 'three';

// ── Layout ──────────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  '1': '#e74c3c', '2': '#3498db', '3': '#2ecc71',
  '4': '#f1c40f', '5': '#9b59b6', '6': '#e67e22',
};

const CAP_W = 0.038;
const CAP_D = 0.038;
const CAP_H = 0.012;
const PRESS_DEPTH = 0.008;
const PRESS_THRESHOLD = 0.03;

// Base plate dimensions (computed from key positions + padding)
const entries = Object.values(KEYS);
const xs = entries.map((k) => k.x);
const ys = entries.map((k) => k.y);
const PAD = 0.035;
const BASE_CX = (Math.min(...xs) + Math.max(...xs)) / 2;
const BASE_CY = (Math.min(...ys) + Math.max(...ys)) / 2;
const BASE_W = Math.max(...xs) - Math.min(...xs) + CAP_W + PAD * 2;
const BASE_D = Math.max(...ys) - Math.min(...ys) + CAP_D + PAD * 2;
const BASE_H = 0.008;
const BASE_Z = 0.050 - BASE_H / 2;

// ── Full Key Panel (single useFrame for all keys) ───────────────────

export function Keys() {
  const keyEntries = useMemo(() => Object.entries(KEYS), []);
  const keyRefs = useRef<(Mesh | null)[]>(new Array(keyEntries.length).fill(null));
  const pressOffsets = useRef<number[]>(new Array(keyEntries.length).fill(0));

  // Single useFrame drives all key press animations
  useFrame((_, delta) => {
    const { tcp } = useRobotStore.getState();
    const speed = 12;

    keyEntries.forEach(([, pos], i) => {
      const mesh = keyRefs.current[i];
      if (!mesh) return;

      // Distance from TCP to key center
      const dx = tcp.x - pos.x;
      const dy = tcp.y - pos.y;
      const dz = tcp.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Spring toward press/release
      const target = dist < PRESS_THRESHOLD ? -PRESS_DEPTH : 0;
      pressOffsets.current[i] += (target - pressOffsets.current[i]) * Math.min(speed * delta, 1);

      mesh.position.z = pos.z + CAP_H / 2 + pressOffsets.current[i];
    });
  });

  return (
    <group name="key-panel">
      {/* Base plate */}
      <mesh position={[BASE_CX, BASE_CY, BASE_Z]}>
        <boxGeometry args={[BASE_W, BASE_D, BASE_H]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Key caps */}
      {keyEntries.map(([id, pos], i) => {
        const color = COLORS[id] ?? '#ffffff';
        return (
          <mesh
            key={id}
            ref={(el) => { keyRefs.current[i] = el; }}
            position={[pos.x, pos.y, pos.z + CAP_H / 2]}
            name={`key-${id}`}
          >
            <boxGeometry args={[CAP_W, CAP_D, CAP_H]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.4}
              metalness={0.2}
              roughness={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}
