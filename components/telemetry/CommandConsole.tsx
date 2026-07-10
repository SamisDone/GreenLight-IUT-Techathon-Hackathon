'use client';

import { useRef, useEffect } from 'react';
import { useRobotStore } from '@/store/robot';
import type { LogEntry } from '@/store/robot';

interface CommandConsoleProps {
  open: boolean;
  onToggle: () => void;
}

export default function CommandConsole({ open, onToggle }: CommandConsoleProps) {
  const logs = useRobotStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, open]);

  return (
    <div className="panel" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Clickable header — always visible */}
      <div
        className="panel-header"
        onClick={onToggle}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>COMMAND LOG</span>
          <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--muted-foreground)' }}>
            {logs.length} entries
          </span>
        </div>
        <span style={{
          fontSize: 10,
          color: 'var(--muted-foreground)',
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ▲
        </span>
      </div>

      {/* Scrollable log body — only rendered when open */}
      {open && (
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '4px 14px', minHeight: 0 }}
        >
          {logs.length === 0 && (
            <div style={{ color: 'var(--muted-foreground)', padding: '4px 0', fontSize: 11 }}>
              Press 1-6 to touch keys, arrows to jog, Home to reset
            </div>
          )}
          {logs.map((entry: LogEntry, i: number) => (
            <div key={i} className="font-mono" style={{
              display: 'flex',
              gap: 8,
              padding: '2px 0',
              fontSize: 10,
              color: entry.result === 'ALLOW' ? 'var(--primary)' : 'var(--destructive)',
            }}>
              <span style={{ color: 'var(--muted-foreground)', minWidth: 60 }}>
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span style={{ color: 'var(--muted-foreground)', minWidth: 55 }}>[{entry.source}]</span>
              <span style={{ minWidth: 45, fontWeight: 600 }}>{entry.result}</span>
              <span style={{ color: 'var(--foreground)' }}>{entry.kind}</span>
              {entry.reason && (
                <span style={{ color: 'var(--destructive)', opacity: 0.8 }}>— {entry.reason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
