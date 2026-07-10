'use client';

import { useState, useCallback } from 'react';
import { useVoice } from '@/lib/voice/useVoice';
import { parseVoiceCommand } from '@/lib/voice/parser';
import { execute } from '@/lib/pipeline/executor';
import { useRobotStore } from '@/store/robot';
import { startPin } from '@/lib/panel/pin-controller';

type LogEntry = {
  text: string;
  status: 'success' | 'fail' | 'info';
  timestamp: number;
};

export default function VoiceWidget() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const voice = useVoice();

  const addLogEntry = useCallback((text: string, status: LogEntry['status']) => {
    setLog((prev) => [...prev.slice(-4), { text, status, timestamp: Date.now() }]);
  }, []);

  const handleTranscript = useCallback((transcript: string) => {
    const result = parseVoiceCommand(transcript);

    if (!result.command) {
      addLogEntry(result.description, 'fail');
      useRobotStore.getState().addLog({
        source: 'voice', kind: 'parse', result: 'REJECT',
        reason: result.description, timestamp: Date.now(),
      });
      return;
    }

    if (result.command.kind === 'enterPin') {
      addLogEntry(`✓ ${result.description}`, 'success');
      startPin(result.command.pin);
      return;
    }

    const report = execute(result.command, 'voice');
    if (report.success) {
      addLogEntry(`✓ ${result.description}`, 'success');
    } else {
      const reason = report.details.find((d) => d.startsWith('REJECT'));
      addLogEntry(`✗ ${result.description} — ${reason ?? 'rejected'}`, 'fail');
    }
  }, [addLogEntry]);

  const handleToggle = useCallback(() => {
    voice.toggle(handleTranscript);
  }, [voice, handleTranscript]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>{voice.listening ? 'LISTENING' : 'VOICE'}</span>
        <button
          onClick={handleToggle}
          disabled={!voice.supported}
          title={voice.supported ? (voice.listening ? 'Stop' : 'Start') : 'Chrome only'}
          style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: `2px solid ${voice.listening ? 'var(--primary)' : 'var(--border)'}`,
            background: voice.listening ? 'var(--primary-light)' : 'var(--muted)',
            color: voice.listening ? 'var(--primary)' : 'var(--muted-foreground)',
            cursor: voice.supported ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            transition: 'all 0.2s ease',
            animation: voice.listening ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
            opacity: voice.supported ? 1 : 0.4,
          }}
        >
          🎤
        </button>
      </div>

      <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 8 }}>
        {/* Interim */}
        {voice.interim && (
          <div style={{
            color: 'var(--muted-foreground)',
            fontSize: 10,
            fontStyle: 'italic',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {voice.interim}...
          </div>
        )}

        {/* Error */}
        {voice.error && (
          <div style={{
            padding: '4px 8px',
            fontSize: 9,
            color: 'var(--destructive)',
            background: 'var(--destructive-light)',
            borderRadius: 'var(--radius)',
            marginBottom: 4,
          }}>
            {voice.error}
          </div>
        )}

        {/* Log entries */}
        {log.length > 0 ? (
          <div>
            {log.map((entry, i) => (
              <div key={entry.timestamp + i} className="font-mono" style={{
                padding: '2px 0',
                fontSize: 10,
                color: entry.status === 'success' ? 'var(--primary)'
                  : entry.status === 'fail' ? 'var(--destructive)'
                  : 'var(--muted-foreground)',
                opacity: i < log.length - 1 ? 0.5 : 1,
              }}>
                {entry.status === 'success' ? '✓' : entry.status === 'fail' ? '✗' : '·'} {entry.text}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 9, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            {voice.supported
              ? '"move up", "touch 3", "go home", "rotate base 30 degrees"'
              : 'Web Speech API not available — use Chrome'
            }
          </div>
        )}
      </div>
    </div>
  );
}
