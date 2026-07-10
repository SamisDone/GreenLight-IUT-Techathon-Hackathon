'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import HUD from '@/components/scene/HUD';
import KeyboardHandler from '@/components/controls/KeyboardHandler';
import CommandConsole from '@/components/telemetry/CommandConsole';
import PinEntry from '@/components/controls/PinEntry';
import Joystick from '@/components/controls/Joystick';
import VoiceWidget from '@/components/controls/VoiceWidget';
import PinVerifier from '@/components/scene/PinVerifier';

const SceneCanvas = dynamic(() => import('@/components/scene/Canvas'), { ssr: false });

const CONSOLE_OPEN_HEIGHT = 160;
const CONSOLE_CLOSED_HEIGHT = 36;

export default function Home() {
  const [consoleOpen, setConsoleOpen] = useState(false);

  const bottomHeight = consoleOpen ? CONSOLE_OPEN_HEIGHT : CONSOLE_CLOSED_HEIGHT;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gridTemplateRows: `1fr ${bottomHeight}px`,
      background: 'var(--background)',
      fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)',
      overflow: 'hidden',
      transition: 'grid-template-rows 0.2s ease',
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
        <PinEntry />
        <VoiceWidget />
      </div>

      {/* ── Bottom bar (collapsible) ──────────────────────────── */}
      <div style={{
        gridRow: '2 / 3',
        gridColumn: '1 / 3',
        padding: '0 8px 8px',
        minHeight: 0,
      }}>
        <CommandConsole
          open={consoleOpen}
          onToggle={() => setConsoleOpen((o) => !o)}
        />
      </div>

      <KeyboardHandler />
    </div>
  );
}
