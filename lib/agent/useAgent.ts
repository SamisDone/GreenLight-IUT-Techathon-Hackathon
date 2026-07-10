'use client';

// Client-side hook for agentic voice control.
// Calls /api/agent to parse → executes commands → calls /api/agent to summarize → speaks result.

import { useState, useCallback, useRef } from 'react';
import { execute } from '@/lib/pipeline/executor';
import type { MotionCommand } from '@/lib/pipeline/types';
import type { AgentResponse } from '@/lib/agent/schema';
import { useRobotStore } from '@/store/robot';

export type AgentMessage = {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
};

export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const speakingRef = useRef<SpeechSynthesisUtterance | null>(null);

  const addMessage = useCallback((role: 'user' | 'agent', text: string) => {
    setMessages((prev) => [...prev.slice(-8), { role, text, timestamp: Date.now() }]);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    speakingRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const process = useCallback(async (transcript: string) => {
    if (loading) return;
    setLoading(true);
    addMessage('user', transcript);

    try {
      // ── Phase 1: Parse transcript → commands ──────────────
      const parseRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', transcript }),
      });

      if (!parseRes.ok) {
        const err = await parseRes.json();
        const errMsg = `Sorry, I couldn't process that. ${err.error || 'Server error.'}`;
        addMessage('agent', errMsg);
        speak(errMsg);
        setLoading(false);
        return;
      }

      const parsed: AgentResponse = await parseRes.json();

      // No commands (ambiguous / clarification needed)
      if (parsed.commands.length === 0) {
        addMessage('agent', parsed.reply);
        speak(parsed.reply);
        setLoading(false);
        return;
      }

      // Show initial intent
      addMessage('agent', parsed.reply);

      // ── Phase 2: Execute each command ─────────────────────
      const results: { command: string; success: boolean; detail: string }[] = [];

      for (const cmd of parsed.commands) {
        const cmdLabel = formatCommand(cmd);
        const report = execute(cmd as MotionCommand, 'agent');

        results.push({
          command: cmdLabel,
          success: report.success,
          detail: report.details.join('; '),
        });

        // Log to store
        useRobotStore.getState().addLog({
          source: 'agent',
          kind: (cmd as MotionCommand).kind,
          result: report.success ? 'ALLOW' : 'REJECT',
          reason: report.success ? undefined : report.details.find((d) => d.startsWith('REJECT')),
          timestamp: Date.now(),
        });

        // Small delay between commands for visual feedback
        if (parsed.commands.length > 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // ── Phase 3: Summarize results → spoken reply ─────────
      const summaryRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          originalTranscript: transcript,
          results,
        }),
      });

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        addMessage('agent', summary.spokenReply);
        speak(summary.spokenReply);
      } else {
        // Fallback: simple template
        const allPassed = results.every((r) => r.success);
        const fallback = allPassed
          ? `Done. ${results.length} command${results.length > 1 ? 's' : ''} executed successfully.`
          : `Completed with issues. ${results.filter((r) => !r.success).length} command${results.filter((r) => !r.success).length > 1 ? 's' : ''} rejected by the safety gate.`;
        addMessage('agent', fallback);
        speak(fallback);
      }
    } catch (err) {
      const errMsg = `Error: ${err instanceof Error ? err.message : 'Something went wrong.'}`;
      addMessage('agent', errMsg);
      speak(errMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, addMessage, speak]);

  return { messages, loading, process };
}

// ── Helpers ───────────────────────────────────────────────────────

function formatCommand(cmd: Record<string, unknown>): string {
  switch (cmd.kind) {
    case 'jog': return `jog ${cmd.axis} ${cmd.delta}m`;
    case 'moveTo': {
      const t = cmd.target as { x: number; y: number; z: number };
      return `moveTo (${t.x}, ${t.y}, ${t.z})`;
    }
    case 'rotateJoint': return `rotate J${cmd.joint} ${cmd.deltaDeg}°`;
    case 'touchKey': return `touch key ${cmd.keyId}`;
    case 'enterPin': return `enter PIN ${cmd.pin}`;
    case 'home': return 'go home';
    default: return JSON.stringify(cmd);
  }
}
