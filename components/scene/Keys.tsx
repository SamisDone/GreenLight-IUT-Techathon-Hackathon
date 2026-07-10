'use client';

import { Html } from '@react-three/drei';
import { KEYS } from '@/lib/robot/constants';

const COLORS: Record<string, string> = {
  '1': '#e74c3c', '2': '#3498db', '3': '#2ecc71',
  '4': '#f1c40f', '5': '#9b59b6', '6': '#e67e22',
};
const KEY_SIZE = 0.04;
const LABEL_OFFSET = 0.05;  // label floats above key in local Z-up space

export function Keys() {
  return (
    <group name="key-panel">
      {Object.entries(KEYS).map(([id, pos]) => {
        const color = COLORS[id] ?? '#ffffff';
        return (
          <group key={id} position={[pos.x, pos.y, pos.z]} name={`key-${id}`}>
            {/* Visible key cap */}
            <mesh>
              <boxGeometry args={[KEY_SIZE, KEY_SIZE, KEY_SIZE]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
              />
            </mesh>

            {/* Floating label */}
            <Html
              position={[0, 0, LABEL_OFFSET]}
              center
              distanceFactor={1.2}
              style={{
                color,
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 14,
                textShadow: '0 0 6px rgba(0,0,0,0.8)',
                userSelect: 'none',
                pointerEvents: 'none',
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
