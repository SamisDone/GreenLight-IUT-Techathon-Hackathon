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
        source: 'voice',
        kind: 'parse',
        result: 'REJECT',
        reason: result.description,
        timestamp: Date.now(),
      });
      return;
    }

    // PIN entry uses its own controller
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
    <div style={{
      position: 'absolute',
      top: 170,
      right: 12,
      zIndex: 10,
      width: 260,
      background: 'rgba(10, 11, 13, 0.92)',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${voice.listening ? 'rgba(196, 248, 42, 0.3)' : 'rgba(196, 248, 42, 0.15)'}`,
      borderRadius: 8,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 11,
      color: '#c8cad0',
      overflow: 'hidden',
      transition: 'border-color 0.2s ease',
    }}>
      {/* Header with mic button */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <span style={{
            color: voice.listening ? '#C4F82A' : '#5B626B',
            fontWeight: 700,
            letterSpacing: 1,
            fontSize: 10,
            transition: 'color 0.2s ease',
          }}>
            {voice.listening ? 'LISTENING' : 'VOICE'}
          </span>
          {/* Interim (live partial recognition) */}
          {voice.interim && (
            <div style={{
              color: '#666',
              fontSize: 9,
              marginTop: 2,
              fontStyle: 'italic',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {voice.interim}...
            </div>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={!voice.supported}
          title={voice.supported ? (voice.listening ? 'Stop listening' : 'Start listening') : 'Not supported — use Chrome'}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `2px solid ${voice.listening ? '#C4F82A' : '#3a3f47'}`,
            background: voice.listening ? 'rgba(196, 248, 42, 0.15)' : '#191C20',
            color: voice.listening ? '#C4F82A' : '#888',
            cursor: voice.supported ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'all 0.2s ease',
            animation: voice.listening ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
            opacity: voice.supported ? 1 : 0.4,
          }}
        >
          🎤
        </button>
      </div>

      {/* Error */}
      {voice.error && (
        <div style={{
          padding: '4px 12px',
          fontSize: 9,
          color: '#FF4438',
          background: 'rgba(255, 68, 56, 0.08)',
        }}>
          {voice.error}
        </div>
      )}

      {/* Log entries */}
      {log.length > 0 && (
        <div style={{ padding: '6px 12px 10px' }}>
          {log.map((entry, i) => (
            <div key={entry.timestamp + i} style={{
              padding: '2px 0',
              fontSize: 10,
              color: entry.status === 'success' ? '#C4F82A'
                : entry.status === 'fail' ? '#FF4438'
                : '#888',
              opacity: i < log.length - 1 ? 0.5 : 1,
              transition: 'opacity 0.3s ease',
            }}>
              {entry.status === 'success' ? '✓' : entry.status === 'fail' ? '✗' : '·'} {entry.text}
            </div>
          ))}
        </div>
      )}

      {/* Hint when no log */}
      {log.length === 0 && !voice.error && (
        <div style={{
          padding: '8px 12px',
          fontSize: 9,
          color: '#5B626B',
          lineHeight: 1.5,
        }}>
          {voice.supported
            ? 'Try: "move up", "touch 3", "go home", "rotate base 30 degrees"'
            : 'Web Speech API not available — use Chrome'
          }
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196, 248, 42, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(196, 248, 42, 0); }
        }
      `}</style>
    </div>
  );
}
