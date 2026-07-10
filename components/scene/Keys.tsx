'use client';

import { KEYS } from '@/lib/robot/constants';

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
const KEY_SIZE = 0.03;

export function Keys() {
  return (
    <group name="key-panel">
      {Object.entries(KEYS).map(([id, pos], i) => (
        <mesh key={id} position={[pos.x, pos.y, pos.z]} name={`key-${id}`}>
          <boxGeometry args={[KEY_SIZE, KEY_SIZE, KEY_SIZE]} />
          <meshStandardMaterial color={COLORS[i % COLORS.length]} />
        </mesh>
      ))}
    </group>
  );
}
