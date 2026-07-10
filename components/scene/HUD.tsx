'use client';

import { useState, useCallback } from 'react';
import { useRobotStore } from '@/store/robot';
import { JOINTS } from '@/lib/robot/constants';
import StatusLEDs from '@/components/ui/StatusLED';
import JointBars from '@/components/ui/JointBar';

export default function HUD() {
  const joints = useRobotStore((s) => s.joints);
  const tcp = useRobotStore((s) => s.tcp);
  const isMoving = useRobotStore((s) => s.isMoving);
  const queueLen = useRobotStore((s) => s.motionQueue.length);
  const setJoints = useRobotStore((s) => s.setJoints);

  const [showSliders, setShowSliders] = useState(false);

  const handleSlider = useCallback((index: number, value: number) => {
    const state = useRobotStore.getState();
    if (state.isMoving) {
      state.clearQueue();
    }
    const next = [...state.joints];
    next[index] = value;
    setJoints(next);
  }, [setJoints]);

  const toDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(1);

  return (
    <>
      {/* ── TCP + Status overlay (top-left of viewport) ──────── */}
      <div className="panel" style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        padding: '12px 16px',
        minWidth: 210,
      }}>
        <StatusLEDs />

        <div style={{ marginTop: 12 }}>
          <div className="label-micro" style={{ marginBottom: 4 }}>TCP POSITION</div>
          <div className="font-mono" style={{
            display: 'flex', gap: 14,
            fontSize: 13, fontWeight: 600,
            color: 'var(--foreground)',
          }}>
            <span>X <span style={{ color: '#DC2626' }}>{tcp.x.toFixed(4)}</span></span>
            <span>Y <span style={{ color: '#2563EB' }}>{tcp.y.toFixed(4)}</span></span>
            <span>Z <span style={{ color: '#059669' }}>{tcp.z.toFixed(4)}</span></span>
          </div>
        </div>

        {isMoving && queueLen > 1 && (
          <div style={{
            marginTop: 10, fontSize: 10, color: 'var(--primary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--primary)', display: 'inline-block',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            MOVING — {queueLen} waypoints
            <span style={{ color: 'var(--muted-foreground)', marginLeft: 8, fontSize: 9 }}>ESC to stop</span>
          </div>
        )}
      </div>

      {/* ── Joint panel (bottom-left of viewport) ──────── */}
      <div className="panel" style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 10,
        width: 240,
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setShowSliders(!showSliders)}
          className="panel-header"
          style={{ cursor: 'pointer' }}
        >
          <span>JOINTS</span>
          <span style={{ color: 'var(--muted-foreground)', fontSize: 9, fontWeight: 400 }}>
            {showSliders ? '▼ SLIDERS' : '▶ BARS'}
          </span>
        </div>

        <div className="panel-body">
          {showSliders ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {JOINTS.map((jDef, i) => (
                <div key={jDef.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="font-mono" style={{
                    width: 22, textAlign: 'right',
                    color: 'var(--muted-foreground)', fontSize: 10,
                  }}>
                    J{i + 1}
                  </span>
                  <input
                    type="range"
                    min={jDef.lower}
                    max={jDef.upper}
                    step={0.01}
                    value={joints[i]}
                    onChange={(e) => handleSlider(i, parseFloat(e.target.value))}
                    style={{ flex: 1, height: 3, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span className="font-mono" style={{
                    width: 48, textAlign: 'right', fontSize: 10,
                    color: 'var(--foreground)',
                  }}>
                    {toDeg(joints[i])}°
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <JointBars />
          )}
        </div>
      </div>
    </>
  );
}
