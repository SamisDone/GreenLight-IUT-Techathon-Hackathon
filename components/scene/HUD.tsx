'use client';

import { useState, useCallback } from 'react';
import { useRobotStore } from '@/store/robot';
import { JOINTS } from '@/lib/robot/constants';

export default function HUD() {
  const joints = useRobotStore((s) => s.joints);
  const tcp = useRobotStore((s) => s.tcp);
  const mode = useRobotStore((s) => s.mode);
  const safetyFlag = useRobotStore((s) => s.safetyFlag);
  const setJoints = useRobotStore((s) => s.setJoints);

  const [collapsed, setCollapsed] = useState(false);

  const handleSlider = useCallback((index: number, value: number) => {
    const next = [...useRobotStore.getState().joints];
    next[index] = value;
    setJoints(next);
  }, [setJoints]);

  const toDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(1);

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        background: 'rgba(10, 11, 13, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(196, 248, 42, 0.15)',
        borderRadius: 8,
        padding: collapsed ? '8px 12px' : '12px 16px',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
        color: '#c8cad0',
        minWidth: collapsed ? 'auto' : 220,
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ color: '#C4F82A', fontWeight: 700, letterSpacing: 1 }}>TELEMETRY</span>
        <span style={{ color: '#666', fontSize: 10 }}>{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <>
          {/* Mode + Safety */}
          <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
            <span>MODE: <span style={{ color: '#C4F82A' }}>{mode.toUpperCase()}</span></span>
            <span>GATE: <span style={{ color: safetyFlag ? '#2ecc71' : '#666' }}>
              {safetyFlag ? 'ACTIVE' : 'IDLE'}
            </span></span>
          </div>

          {/* TCP Position */}
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
            <div style={{ color: '#888', marginBottom: 4 }}>TCP POSITION (m)</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>X: <span style={{ color: '#e74c3c' }}>{tcp.x.toFixed(4)}</span></span>
              <span>Y: <span style={{ color: '#3498db' }}>{tcp.y.toFixed(4)}</span></span>
              <span>Z: <span style={{ color: '#2ecc71' }}>{tcp.z.toFixed(4)}</span></span>
            </div>
          </div>

          {/* Joint Sliders */}
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
            <div style={{ color: '#888', marginBottom: 6 }}>JOINT ANGLES</div>
            {JOINTS.map((jDef, i) => (
              <div key={jDef.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 20, textAlign: 'right', color: '#666' }}>J{i + 1}</span>
                <input
                  type="range"
                  min={jDef.lower}
                  max={jDef.upper}
                  step={0.01}
                  value={joints[i]}
                  onChange={(e) => handleSlider(i, parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    height: 3,
                    accentColor: '#C4F82A',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ width: 50, textAlign: 'right', fontSize: 10, color: '#aaa' }}>
                  {toDeg(joints[i])}°
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
