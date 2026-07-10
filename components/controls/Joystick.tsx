'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { execute } from '@/lib/pipeline/executor';

const PAD_SIZE = 110;
const KNOB_SIZE = 36;
const DEADZONE = 0.1;
const JOG_STEP = 0.018;
const JOG_Z_STEP = 0.014;
const TICK_MS = 80;

export default function Joystick() {
  const padRef = useRef<HTMLDivElement>(null);
  const [knobX, setKnobX] = useState(0);
  const [knobY, setKnobY] = useState(0);
  const draggingXY = useRef(false);
  const displacement = useRef({ x: 0, y: 0 });
  const intervalXY = useRef<ReturnType<typeof setInterval> | null>(null);

  const zRef = useRef<HTMLDivElement>(null);
  const [knobZ, setKnobZ] = useState(0);
  const draggingZ = useRef(false);
  const displacementZ = useRef(0);
  const intervalZ = useRef<ReturnType<typeof setInterval> | null>(null);

  // XY handlers
  const startXYJog = useCallback(() => {
    if (intervalXY.current) return;
    intervalXY.current = setInterval(() => {
      const { x, y } = displacement.current;
      if (Math.abs(x) > DEADZONE) execute({ kind: 'jog', axis: 'x', delta: x * JOG_STEP }, 'joystick');
      if (Math.abs(y) > DEADZONE) execute({ kind: 'jog', axis: 'y', delta: -y * JOG_STEP }, 'joystick');
    }, TICK_MS);
  }, []);

  const stopXYJog = useCallback(() => {
    if (intervalXY.current) { clearInterval(intervalXY.current); intervalXY.current = null; }
  }, []);

  const onXYDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingXY.current = true;
    startXYJog();
  }, [startXYJog]);

  const onXYMove = useCallback((e: React.PointerEvent) => {
    if (!draggingXY.current || !padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = PAD_SIZE / 2 - KNOB_SIZE / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
    setKnobX(dx); setKnobY(dy);
    displacement.current = { x: dx / maxR, y: dy / maxR };
  }, []);

  const onXYUp = useCallback(() => {
    draggingXY.current = false;
    setKnobX(0); setKnobY(0);
    displacement.current = { x: 0, y: 0 };
    stopXYJog();
  }, [stopXYJog]);

  // Z handlers
  const startZJog = useCallback(() => {
    if (intervalZ.current) return;
    intervalZ.current = setInterval(() => {
      const z = displacementZ.current;
      if (Math.abs(z) > DEADZONE) execute({ kind: 'jog', axis: 'z', delta: -z * JOG_Z_STEP }, 'joystick');
    }, TICK_MS);
  }, []);

  const stopZJog = useCallback(() => {
    if (intervalZ.current) { clearInterval(intervalZ.current); intervalZ.current = null; }
  }, []);

  const onZDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingZ.current = true;
    startZJog();
  }, [startZJog]);

  const onZMove = useCallback((e: React.PointerEvent) => {
    if (!draggingZ.current || !zRef.current) return;
    const rect = zRef.current.getBoundingClientRect();
    const cy = rect.top + rect.height / 2;
    const maxD = (PAD_SIZE - KNOB_SIZE) / 2;
    let dy = Math.max(-maxD, Math.min(maxD, e.clientY - cy));
    setKnobZ(dy);
    displacementZ.current = dy / maxD;
  }, []);

  const onZUp = useCallback(() => {
    draggingZ.current = false;
    setKnobZ(0);
    displacementZ.current = 0;
    stopZJog();
  }, [stopZJog]);

  useEffect(() => {
    return () => { stopXYJog(); stopZJog(); };
  }, [stopXYJog, stopZJog]);

  return (
    <div className="panel">
      <div className="panel-header">JOG CONTROL</div>
      <div className="panel-body" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        {/* XY Pad */}
        <div style={{ textAlign: 'center' }}>
          <div className="label-micro" style={{ marginBottom: 4 }}>XY</div>
          <div
            ref={padRef}
            onPointerDown={onXYDown}
            onPointerMove={onXYMove}
            onPointerUp={onXYUp}
            onPointerCancel={onXYUp}
            style={{
              width: PAD_SIZE,
              height: PAD_SIZE,
              borderRadius: '50%',
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              position: 'relative',
              cursor: 'grab',
              touchAction: 'none',
            }}
          >
            {/* Crosshair */}
            <div style={{ position: 'absolute', top: '50%', left: 10, right: 10, height: 1, background: 'var(--border)', transform: 'translateY(-0.5px)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 10, bottom: 10, width: 1, background: 'var(--border)', transform: 'translateX(-0.5px)' }} />

            {/* Knob */}
            <div style={{
              position: 'absolute',
              width: KNOB_SIZE, height: KNOB_SIZE,
              borderRadius: '50%',
              background: draggingXY.current ? 'var(--primary)' : 'var(--border)',
              border: `2px solid ${draggingXY.current ? 'var(--primary)' : 'var(--muted-foreground)'}`,
              left: '50%', top: '50%',
              transform: `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`,
              transition: draggingXY.current ? 'none' : 'transform 0.15s ease-out',
              cursor: draggingXY.current ? 'grabbing' : 'grab',
            }} />
          </div>
        </div>

        {/* Z Slider */}
        <div style={{ textAlign: 'center' }}>
          <div className="label-micro" style={{ marginBottom: 4 }}>Z</div>
          <div
            ref={zRef}
            onPointerDown={onZDown}
            onPointerMove={onZMove}
            onPointerUp={onZUp}
            onPointerCancel={onZUp}
            style={{
              width: 32, height: PAD_SIZE,
              borderRadius: 16,
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              position: 'relative',
              cursor: 'grab',
              touchAction: 'none',
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: 6, right: 6, height: 1, background: 'var(--border)', transform: 'translateY(-0.5px)' }} />
            <div style={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'var(--muted-foreground)', pointerEvents: 'none' }}>▲</div>
            <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'var(--muted-foreground)', pointerEvents: 'none' }}>▼</div>

            <div style={{
              position: 'absolute',
              width: 24, height: 24,
              borderRadius: '50%',
              background: draggingZ.current ? 'var(--primary)' : 'var(--border)',
              border: `2px solid ${draggingZ.current ? 'var(--primary)' : 'var(--muted-foreground)'}`,
              left: '50%', top: '50%',
              transform: `translate(-50%, calc(-50% + ${knobZ}px))`,
              transition: draggingZ.current ? 'none' : 'transform 0.15s ease-out',
              cursor: draggingZ.current ? 'grabbing' : 'grab',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
