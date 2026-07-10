'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { KEYS } from '@/lib/robot/constants';
import { useRobotStore } from '@/store/robot';
import type { Mesh, MeshStandardMaterial } from 'three';
import { Color } from 'three';

// ── Layout ──────────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  '1': '#e74c3c', '2': '#3498db', '3': '#2ecc71',
  '4': '#f1c40f', '5': '#9b59b6', '6': '#e67e22',
};

const LIME = '#10B981';
const LIME_COLOR = new Color(LIME);

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

// Pre-compute Color objects for each key
const KEY_COLORS: Record<string, Color> = {};
for (const id of Object.keys(COLORS)) {
  KEY_COLORS[id] = new Color(COLORS[id]);
}

// ── Full Key Panel (single useFrame for all keys) ───────────────────

export function Keys() {
  const keyEntries = useMemo(() => Object.entries(KEYS), []);
  const keyRefs = useRef<(Mesh | null)[]>(new Array(keyEntries.length).fill(null));
  const pressOffsets = useRef<number[]>(new Array(keyEntries.length).fill(0));
  const flashTimers = useRef<number[]>(new Array(keyEntries.length).fill(0));

  // Single useFrame drives all key press animations + highlight + flash
  useFrame((_, delta) => {
    const { tcp, pinState } = useRobotStore.getState();
    const speed = 25;
    const activeKeyId = pinState?.activeKeyId ?? null;

    keyEntries.forEach(([id, pos], i) => {
      const mesh = keyRefs.current[i];
      if (!mesh) return;

      const mat = mesh.material as MeshStandardMaterial;

      // Distance from TCP to key center
      const dx = tcp.x - pos.x;
      const dy = tcp.y - pos.y;
      const dz = tcp.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Spring toward press/release
      const target = dist < PRESS_THRESHOLD ? -PRESS_DEPTH : 0;
      pressOffsets.current[i] += (target - pressOffsets.current[i]) * Math.min(speed * delta, 1);
      mesh.position.z = pos.z + CAP_H / 2 + pressOffsets.current[i];

      // Flash on contact: trigger when TCP enters threshold during PIN
      if (dist < PRESS_THRESHOLD && activeKeyId === id) {
        flashTimers.current[i] = 0.3;  // 300ms flash
      }
      if (flashTimers.current[i] > 0) {
        flashTimers.current[i] -= delta;
      }

      // Color logic: active key during PIN → lime, flash → white burst, else normal
      const baseColor = KEY_COLORS[id] ?? new Color('#ffffff');
      const isActive = activeKeyId === id;
      const isFlashing = flashTimers.current[i] > 0;

      if (isFlashing) {
        // White flash that fades back
        const flashIntensity = Math.min(flashTimers.current[i] / 0.15, 1);
        mat.color.set('#ffffff');
        mat.emissive.set('#ffffff');
        mat.emissiveIntensity = 1.0 * flashIntensity;
      } else if (isActive) {
        // Lime highlight for active key
        mat.color.copy(LIME_COLOR);
        mat.emissive.copy(LIME_COLOR);
        mat.emissiveIntensity = 0.8;
      } else {
        // Normal color
        mat.color.copy(baseColor);
        mat.emissive.copy(baseColor);
        mat.emissiveIntensity = 0.4;
      }
    });
  });

  return (
    <group name="key-panel">
      {/* Base plate */}
      <mesh position={[BASE_CX, BASE_CY, BASE_Z]}>
        <boxGeometry args={[BASE_W, BASE_D, BASE_H]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Key caps with labels */}
      {keyEntries.map(([id, pos], i) => {
        const color = COLORS[id] ?? '#ffffff';
        return (
          <group key={id}>
            <mesh
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

            {/* Number label — DOM-based, zero WebGL cost */}
            <Html
              position={[pos.x, pos.y, pos.z + CAP_H + 0.002]}
              center
              distanceFactor={0.8}
              style={{
                color: '#1A1B1E',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 800,
                fontSize: 13,
                textShadow: `0 0 3px rgba(255,255,255,0.8)`,
                userSelect: 'none',
                pointerEvents: 'none',
                lineHeight: 1,
              }}
            >
              {id}
            </Html>
          </group>
        );
      })}
    </group>
  );
}
