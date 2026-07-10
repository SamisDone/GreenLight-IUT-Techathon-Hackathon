'use client';

import dynamic from 'next/dynamic';
import HUD from '@/components/scene/HUD';
import KeyboardHandler from '@/components/controls/KeyboardHandler';
import CommandConsole from '@/components/telemetry/CommandConsole';
import PinEntry from '@/components/controls/PinEntry';
import Joystick from '@/components/controls/Joystick';
import VoiceWidget from '@/components/controls/VoiceWidget';
import PinVerifier from '@/components/scene/PinVerifier';

const SceneCanvas = dynamic(() => import('@/components/scene/Canvas'), { ssr: false });

export default function Home() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gridTemplateRows: '1fr 160px',
      background: 'var(--background)',
      fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)',
      overflow: 'hidden',
    }}>
      {/* ── Viewport (left, dominant) ─────────────────────────── */}
      <div style={{
        position: 'relative',
        gridRow: '1 / 2',
        gridColumn: '1 / 2',
        background: 'var(--viewport-bg)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <SceneCanvas />
        <HUD />
        <PinVerifier />
      </div>

      {/* ── Right rail ────────────────────────────────────────── */}
      <div style={{
        gridRow: '1 / 2',
        gridColumn: '2 / 3',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        overflowY: 'auto',
        borderBottom: '1px solid var(--border)',
      }}>
        <Joystick />
        <VoiceWidget />
      </div>

      {/* ── Bottom bar (fixed 160px) ──────────────────────────── */}
      <div style={{
        gridRow: '2 / 3',
        gridColumn: '1 / 3',
        display: 'flex',
        gap: 8,
        padding: 8,
        minHeight: 0,
      }}>
        {/* Command Log — fills remaining space */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CommandConsole />
        </div>
        {/* Autonomous PIN — fixed width */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <PinEntry />
        </div>
      </div>

      <KeyboardHandler />
    </div>
  );
}
