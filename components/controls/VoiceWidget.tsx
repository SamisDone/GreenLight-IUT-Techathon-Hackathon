'use client';

import { useState, useCallback } from 'react';
import { useVoice } from '@/lib/voice/useVoice';
import { parseVoiceCommand } from '@/lib/voice/parser';
import { execute } from '@/lib/pipeline/executor';
import { useRobotStore } from '@/store/robot';
import { startPin } from '@/lib/panel/pin-controller';
import { useAgent, type AgentMessage } from '@/lib/agent/useAgent';

type LogEntry = {
  text: string;
  status: 'success' | 'fail' | 'info';
  timestamp: number;
};

export default function VoiceWidget() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const voice = useVoice();
  const agent = useAgent();

  const addLogEntry = useCallback((text: string, status: LogEntry['status']) => {
    setLog((prev) => [...prev.slice(-4), { text, status, timestamp: Date.now() }]);
  }, []);

  // ── Keyword mode handler ──────────────────────────────────
  const handleKeywordTranscript = useCallback((transcript: string) => {
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

  // ── Agent mode handler ────────────────────────────────────
  const handleAgentTranscript = useCallback((transcript: string) => {
    agent.process(transcript);
  }, [agent]);

  // ── Toggle mic ────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    const handler = agentMode ? handleAgentTranscript : handleKeywordTranscript;
    voice.toggle(handler);
  }, [voice, agentMode, handleAgentTranscript, handleKeywordTranscript]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>{voice.listening ? 'LISTENING' : 'VOICE'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mode toggle */}
          <div
            onClick={() => setAgentMode(!agentMode)}
            style={{
              display: 'flex',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span style={{
              padding: '3px 8px',
              background: !agentMode ? 'var(--primary)' : 'var(--muted)',
              color: !agentMode ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              transition: 'all 0.15s ease',
            }}>
              KEYWORD
            </span>
            <span style={{
              padding: '3px 8px',
              background: agentMode ? 'var(--primary)' : 'var(--muted)',
              color: agentMode ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              transition: 'all 0.15s ease',
            }}>
              AGENT
            </span>
          </div>

          {/* Mic button */}
          <button
            onClick={handleToggle}
            disabled={!voice.supported || agent.loading}
            title={
              !voice.supported ? 'Chrome only'
              : agent.loading ? 'Processing...'
              : voice.listening ? 'Stop' : 'Start'
            }
            style={{
              width: 28, height: 28,
              borderRadius: '50%',
              border: `2px solid ${voice.listening ? 'var(--primary)' : 'var(--border)'}`,
              background: voice.listening ? 'var(--primary-light)' : 'var(--muted)',
              color: voice.listening ? 'var(--primary)' : 'var(--muted-foreground)',
              cursor: voice.supported && !agent.loading ? 'pointer' : 'not-allowed',
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
      </div>

      <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 8 }}>
        {/* Loading indicator */}
        {agent.loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 6, fontSize: 10, color: 'var(--primary)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--primary)', display: 'inline-block',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            Thinking...
          </div>
        )}

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

        {/* Agent mode: chat messages */}
        {agentMode ? (
          agent.messages.length > 0 ? (
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {agent.messages.map((msg: AgentMessage, i: number) => (
                <div key={msg.timestamp + i} style={{
                  padding: '3px 0',
                  fontSize: 10,
                  color: msg.role === 'user' ? 'var(--foreground)' : 'var(--primary)',
                  opacity: i < agent.messages.length - 1 ? 0.6 : 1,
                }}>
                  <span className="font-mono" style={{
                    fontSize: 9, color: 'var(--muted-foreground)', marginRight: 6,
                  }}>
                    {msg.role === 'user' ? 'YOU' : 'ARM'}
                  </span>
                  {msg.text}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 9, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              Agent mode: speak naturally. &quot;Touch keys 1 through 3&quot;, &quot;nudge it left and tap 5&quot;
            </div>
          )
        ) : (
          /* Keyword mode: simple log */
          log.length > 0 ? (
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
          )
        )}
      </div>
    </div>
  );
}
