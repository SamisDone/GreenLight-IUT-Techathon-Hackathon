'use client';

import { useRobotStore } from '@/store/robot';

// Status LED dots: MODE, GATE, LINK

export default function StatusLEDs() {
  const mode = useRobotStore((s) => s.mode);
  const logs = useRobotStore((s) => s.logs);
  const isMoving = useRobotStore((s) => s.isMoving);

  // Gate: green normally, red if last log was REJECT
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const gateRed = lastLog?.result === 'REJECT';

  const leds: { label: string; color: string; pulse: boolean }[] = [
    {
      label: mode.toUpperCase(),
      color: mode === 'idle' ? '#9CA3AF' : 'var(--primary)',
      pulse: isMoving,
    },
    {
      label: 'GATE',
      color: gateRed ? 'var(--destructive)' : 'var(--primary)',
      pulse: gateRed,
    },
    {
      label: 'SIM',
      color: 'var(--primary)',
      pulse: false,
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {leds.map((led) => (
        <div key={led.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: led.color,
            boxShadow: `0 0 6px ${led.color}`,
            animation: led.pulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
            transition: 'background-color 0.3s ease',
          }} />
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-jetbrains-mono, monospace)',
          }}>
            {led.label}
          </span>
        </div>
      ))}
    </div>
  );
}
