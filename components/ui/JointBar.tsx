'use client';

import { JOINTS } from '@/lib/robot/constants';
import { useRobotStore } from '@/store/robot';

// Limit-aware joint bar — shows angle position within [lower, upper] range.
// Grey in safe zone, amber near limit, red on overshoot.

export default function JointBars() {
  const joints = useRobotStore((s) => s.joints);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {JOINTS.map((jDef, i) => {
        const angle = joints[i];
        const range = jDef.upper - jDef.lower;
        const pct = ((angle - jDef.lower) / range) * 100;
        const deg = (angle * 180 / Math.PI).toFixed(1);

        // Distance to nearest limit as fraction of range
        const distToLower = (angle - jDef.lower) / range;
        const distToUpper = (jDef.upper - angle) / range;
        const nearLimit = Math.min(distToLower, distToUpper);

        let barColor = 'var(--primary)';
        if (nearLimit < 0.05) barColor = 'var(--destructive)';
        else if (nearLimit < 0.15) barColor = 'var(--warn)';

        return (
          <div key={jDef.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {/* Joint label */}
            <span style={{
              width: 24,
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              textAlign: 'right',
              fontFamily: 'var(--font-jetbrains-mono, monospace)',
            }}>
              J{i + 1}
            </span>

            {/* Bar track */}
            <div style={{
              flex: 1,
              height: 6,
              background: 'var(--muted)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Fill */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.max(0, Math.min(100, pct))}%`,
                background: barColor,
                borderRadius: 3,
                transition: 'width 0.08s ease-out, background-color 0.2s ease',
              }} />

              {/* Center mark (zero position) */}
              {jDef.lower < 0 && jDef.upper > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${((-jDef.lower) / range) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'var(--border)',
                }} />
              )}
            </div>

            {/* Angle readout */}
            <span style={{
              width: 48,
              fontSize: 10,
              fontFamily: 'var(--font-jetbrains-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              color: nearLimit < 0.05 ? 'var(--destructive)' : 'var(--foreground)',
              transition: 'color 0.2s ease',
            }}>
              {deg}°
            </span>
          </div>
        );
      })}
    </div>
  );
}
