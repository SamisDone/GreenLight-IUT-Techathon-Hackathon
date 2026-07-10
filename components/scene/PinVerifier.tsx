'use client';

import { useRobotStore } from '@/store/robot';

// PIN verification overlay — sits inside the 3D viewport.
// Shows each digit's pass/fail status as the sequence runs.

export default function PinVerifier() {
  const pinState = useRobotStore((s) => s.pinState);

  if (!pinState || pinState.pin.length === 0) return null;

  const isRunning = pinState.active;
  const isComplete = pinState.phase === 'complete';
  const isFailed = pinState.phase === 'failed';

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 10,
      minWidth: 180,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      fontFamily: 'var(--font-jetbrains-mono, monospace)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: isComplete ? 'var(--primary)' : isFailed ? 'var(--destructive)' : 'var(--muted-foreground)',
        }}>
          {isComplete ? '✓ PIN VERIFIED' : isFailed ? '✕ PIN FAILED' : isRunning ? 'VERIFYING…' : 'PIN RESULT'}
        </span>
        {isRunning && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--primary)', display: 'inline-block',
            animation: 'pulse 1s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Digit grid */}
      <div style={{ padding: '8px 12px 10px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {pinState.pin.split('').map((digit, i) => {
            const result = pinState.results[i];
            const isActive = pinState.active && i === pinState.currentDigitIndex;

            let bg = 'var(--muted)';
            let color = 'var(--muted-foreground)';
            let border = 'var(--border)';

            if (result) {
              bg = result.pass ? 'var(--primary)' : 'var(--destructive)';
              color = '#FFFFFF';
              border = 'transparent';
            } else if (isActive) {
              bg = 'var(--primary-light)';
              color = 'var(--primary)';
              border = 'var(--primary)';
            }

            return (
              <div key={i} style={{
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius)',
                background: bg,
                border: `1.5px solid ${border}`,
                color,
                fontWeight: 700,
                fontSize: 12,
                transition: 'all 0.2s ease',
              }}>
                {digit}
              </div>
            );
          })}
        </div>

        {/* Per-key results */}
        {pinState.results.length > 0 && (
          <div style={{ fontSize: 9, lineHeight: 1.8 }}>
            {pinState.results.map((r, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: r.pass ? 'var(--primary)' : 'var(--destructive)',
              }}>
                <span style={{ color: 'var(--foreground)' }}>Key {r.keyId}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.errorMm.toFixed(2)}mm</span>
                <span style={{ fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                  {r.pass ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Failure reason */}
        {isFailed && pinState.failReason && (
          <div style={{
            marginTop: 6, padding: '4px 8px',
            background: 'var(--destructive-light)',
            borderRadius: 'var(--radius)',
            color: 'var(--destructive)',
            fontSize: 9,
          }}>
            {pinState.failReason}
          </div>
        )}
      </div>
    </div>
  );
}
