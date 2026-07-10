'use client';

import { useRef, useEffect } from 'react';
import { useRobotStore } from '@/store/robot';
import type { LogEntry } from '@/store/robot';

export default function CommandConsole() {
  const logs = useRobotStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        maxHeight: 140,
        background: 'rgba(10, 11, 13, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(196, 248, 42, 0.15)',
        borderRadius: 8,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#C4F82A',
        fontWeight: 700,
        letterSpacing: 1,
        fontSize: 10,
      }}>
        COMMAND LOG
      </div>

      {/* Scrollable log body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 12px',
        }}
      >
        {logs.length === 0 && (
          <div style={{ color: '#444', padding: '4px 0' }}>
            Press 1-6 to touch keys, arrows to jog, Home to reset
          </div>
        )}
        {logs.map((entry: LogEntry, i: number) => (
          <div key={i} style={{
            display: 'flex',
            gap: 8,
            padding: '2px 0',
            color: entry.result === 'ALLOW' ? '#2ecc71' : '#e74c3c',
          }}>
            <span style={{ color: '#555', minWidth: 60 }}>
              {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span style={{ color: '#888', minWidth: 60 }}>[{entry.source}]</span>
            <span style={{ minWidth: 40 }}>{entry.result}</span>
            <span style={{ color: '#c8cad0' }}>{entry.kind}</span>
            {entry.reason && (
              <span style={{ color: '#e74c3c', opacity: 0.7 }}>— {entry.reason}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
