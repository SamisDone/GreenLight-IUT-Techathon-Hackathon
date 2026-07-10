'use client';

import { useState, useCallback } from 'react';
import { useRobotStore } from '@/store/robot';
import { startPin, cancelPin } from '@/lib/panel/pin-controller';

export default function PinEntry() {
  const [input, setInput] = useState('');
  const pinState = useRobotStore((s) => s.pinState);

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

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>AUTONOMOUS PIN</span>
      </div>

      <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="text"
          placeholder="e.g. 145236"
          maxLength={12}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          className="font-mono"
          style={{
            flex: 1,
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '6px 10px',
            color: 'var(--foreground)',
            fontSize: 13,
            letterSpacing: 3,
            outline: 'none',
            opacity: isRunning ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        />
        {!isRunning ? (
          <button
            onClick={handleRun}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? 'var(--primary)' : 'var(--muted)',
              color: input.trim() ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: 10,
              cursor: input.trim() ? 'pointer' : 'default',
              letterSpacing: '0.06em',
              fontFamily: 'inherit',
            }}
          >
            RUN
          </button>
        ) : (
          <button
            onClick={handleCancel}
            style={{
              background: 'var(--destructive)',
              color: 'var(--destructive-foreground)',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: 10,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              fontFamily: 'inherit',
            }}
          >
            STOP
          </button>
        )}
      </div>
    </div>
  );
}
