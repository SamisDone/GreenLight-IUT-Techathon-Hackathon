'use client';

import { useState, useCallback } from 'react';
import { useRobotStore } from '@/store/robot';
import { startPin, cancelPin } from '@/lib/panel/pin-controller';

export default function PinEntry() {
  const [input, setInput] = useState('');
  const pinState = useRobotStore((s) => s.pinState);
  const isMoving = useRobotStore((s) => s.isMoving);

  const isRunning = pinState?.active === true;

  const handleRun = useCallback(() => {
    if (isRunning || !input.trim()) return;
    startPin(input.trim());
  }, [input, isRunning]);

  const handleCancel = useCallback(() => {
    cancelPin();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }, [handleRun]);

  const totalDigits = pinState?.pin.length ?? 0;
  const completedDigits = pinState?.results.length ?? 0;
  const passCount = pinState?.results.filter((r) => r.pass).length ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 10,
        width: 260,
        background: 'rgba(10, 11, 13, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(196, 248, 42, 0.15)',
        borderRadius: 8,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
        color: '#c8cad0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#C4F82A',
        fontWeight: 700,
        letterSpacing: 1,
        fontSize: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>AUTONOMOUS PIN</span>
        {pinState?.phase === 'complete' && (
          <span style={{ color: '#2ecc71', fontSize: 9 }}>✓ COMPLETE</span>
        )}
        {pinState?.phase === 'failed' && (
          <span style={{ color: '#FF4438', fontSize: 9 }}>✕ FAILED</span>
        )}
      </div>

      {/* Input row */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="e.g. 145236"
          maxLength={12}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          style={{
            flex: 1,
            background: '#191C20',
            border: '1px solid #262A2F',
            borderRadius: 4,
            padding: '5px 8px',
            color: '#E7EAEC',
            fontFamily: 'inherit',
            fontSize: 13,
            letterSpacing: 3,
            outline: 'none',
            opacity: isRunning ? 0.5 : 1,
          }}
        />
        {!isRunning ? (
          <button
            onClick={handleRun}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? '#C4F82A' : '#262A2F',
              color: input.trim() ? '#0A0B0D' : '#5B626B',
              border: 'none',
              borderRadius: 4,
              padding: '5px 12px',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 10,
              cursor: input.trim() ? 'pointer' : 'default',
              letterSpacing: 1,
            }}
          >
            RUN
          </button>
        ) : (
          <button
            onClick={handleCancel}
            style={{
              background: '#FF4438',
              color: '#0A0B0D',
              border: 'none',
              borderRadius: 4,
              padding: '5px 10px',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 10,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            STOP
          </button>
        )}
      </div>

      {/* Progress + Results */}
      {pinState && totalDigits > 0 && (
        <div style={{ padding: '4px 12px 10px' }}>
          {/* Progress bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            fontSize: 10,
          }}>
            <span style={{ color: '#888' }}>PROGRESS</span>
            <span style={{ color: '#C4F82A', fontWeight: 700 }}>
              {completedDigits} / {totalDigits}
            </span>
            {pinState.phase === 'running' && (
              <span style={{
                marginLeft: 'auto',
                display: 'inline-block',
                width: 6, height: 6,
                borderRadius: '50%',
                background: '#C4F82A',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
            )}
          </div>

          {/* Digit dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {pinState.pin.split('').map((digit, i) => {
              const result = pinState.results[i];
              const isActive = pinState.active && i === pinState.currentDigitIndex;

              let bg = '#262A2F';    // pending
              let border = '1px solid transparent';
              if (result) {
                bg = result.pass ? '#2ecc71' : '#FF4438';
              }
              if (isActive) {
                border = '1px solid #C4F82A';
                bg = '#C4F82A33';
              }

              return (
                <div
                  key={i}
                  title={result ? `Key ${result.keyId}: ${result.errorMm.toFixed(2)}mm ${result.pass ? 'PASS' : 'FAIL'}` : `Digit ${digit}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '3px 0',
                    borderRadius: 3,
                    background: bg,
                    border,
                    color: result ? '#0A0B0D' : isActive ? '#C4F82A' : '#666',
                    fontWeight: 700,
                    fontSize: 11,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {digit}
                </div>
              );
            })}
          </div>

          {/* Per-key results */}
          {pinState.results.length > 0 && (
            <div style={{ fontSize: 9, color: '#888' }}>
              {pinState.results.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '1px 0',
                  color: r.pass ? '#2ecc71' : '#FF4438',
                }}>
                  <span>Key {r.keyId}</span>
                  <span>{r.errorMm.toFixed(2)}mm</span>
                  <span style={{ fontWeight: 700 }}>{r.pass ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Failure reason */}
          {pinState.phase === 'failed' && pinState.failReason && (
            <div style={{
              marginTop: 6,
              padding: '4px 8px',
              background: 'rgba(255, 68, 56, 0.1)',
              borderRadius: 4,
              color: '#FF4438',
              fontSize: 9,
            }}>
              {pinState.failReason}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
