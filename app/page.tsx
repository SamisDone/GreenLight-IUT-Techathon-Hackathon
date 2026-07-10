'use client';

import dynamic from 'next/dynamic';
import HUD from '@/components/scene/HUD';
import KeyboardHandler from '@/components/controls/KeyboardHandler';
import CommandConsole from '@/components/telemetry/CommandConsole';
import PinEntry from '@/components/controls/PinEntry';

// Three.js / R3F must be client-only — ssr: false prevents window crashes
const SceneCanvas = dynamic(() => import('@/components/scene/Canvas'), { ssr: false });

export default function Home() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0A0B0D' }}>
      <SceneCanvas />
      <HUD />
      <CommandConsole />
      <PinEntry />
      <KeyboardHandler />
    </div>
  );
}
