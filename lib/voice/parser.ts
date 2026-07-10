// Deterministic voice command parser.
// Pure function: transcript string → MotionCommand | null.
// No LLM, no external API — just keyword matching.

import type { MotionCommand } from '../pipeline/types';

// ── Word-to-number map ─────────────────────────────────────────────

const WORD_TO_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/**
 * Extract the first number from a string — handles both digits and words.
 * e.g. "rotate base 30 degrees" → 30, "press five" → 5
 */
function extractNumber(text: string): { value: number; negative: boolean } | null {
  const isNeg = /\b(minus|negative|-)\b/.test(text);

  // Try digit match first
  const digitMatch = text.match(/\d+/);
  if (digitMatch) return { value: parseInt(digitMatch[0], 10), negative: isNeg };

  // Try word match
  const words = text.split(/\s+/);
  for (const w of words) {
    if (WORD_TO_NUM[w] !== undefined) return { value: WORD_TO_NUM[w], negative: isNeg };
  }
  return null;
}

/**
 * Extract a multi-digit PIN from the transcript.
 * Handles: "1 4 5 2 3 6", "one four five two three six", "145236"
 */
function extractPin(text: string): string | null {
  // Direct digit string: "145236"
  const directMatch = text.match(/\b(\d{2,12})\b/);
  if (directMatch) return directMatch[1];

  // Space-separated digits or words: "1 4 5 2 3 6" or "one four five..."
  const tokens = text.split(/\s+/);
  const digits: string[] = [];
  for (const t of tokens) {
    if (/^\d$/.test(t)) {
      digits.push(t);
    } else if (WORD_TO_NUM[t] !== undefined && WORD_TO_NUM[t] <= 9) {
      digits.push(String(WORD_TO_NUM[t]));
    }
  }
  if (digits.length >= 2) return digits.join('');

  return null;
}

// ── Direction → jog axis/delta mapping ─────────────────────────────

const JOG_DELTA = 0.02;

const DIRECTION_MAP: Record<string, { axis: 'x' | 'y' | 'z'; delta: number }> = {
  up:       { axis: 'z', delta: +JOG_DELTA },
  down:     { axis: 'z', delta: -JOG_DELTA },
  left:     { axis: 'y', delta: +JOG_DELTA },
  right:    { axis: 'y', delta: -JOG_DELTA },
  forward:  { axis: 'x', delta: +JOG_DELTA },
  forwards: { axis: 'x', delta: +JOG_DELTA },
  back:     { axis: 'x', delta: -JOG_DELTA },
  backward: { axis: 'x', delta: -JOG_DELTA },
  backwards:{ axis: 'x', delta: -JOG_DELTA },
};

// ── Main parser ────────────────────────────────────────────────────

export type ParseResult = {
  command: MotionCommand;
  description: string;
} | {
  command: null;
  description: string;
};

export function parseVoiceCommand(transcript: string): ParseResult {
  const raw = transcript.toLowerCase().trim();
  if (!raw) return { command: null, description: 'empty input' };

  // ── HOME ──
  if (/\b(go\s+)?home\b/.test(raw)) {
    return { command: { kind: 'home' }, description: 'home' };
  }

  // ── ENTER PIN ──
  if (/\b(enter|input|type)\s+(pin|code)\b/.test(raw)) {
    const pin = extractPin(raw);
    if (pin) {
      return { command: { kind: 'enterPin', pin }, description: `enter pin ${pin}` };
    }
    return { command: null, description: 'enter pin — no digits found' };
  }

  // ── TOUCH / PRESS KEY ──
  if (/\b(touch|press|tap|hit)\b/.test(raw)) {
    const num = extractNumber(raw);
    if (num !== null && num.value >= 0 && num.value <= 9) {
      return {
        command: { kind: 'touchKey', keyId: String(num.value) },
        description: `touch key ${num.value}`,
      };
    }
    return { command: null, description: 'touch — no valid key number found' };
  }

  // ── ROTATE BASE ──
  if (/\brotat/.test(raw)) {
    const num = extractNumber(raw);
    if (num !== null) {
      // Negative if: "minus/negative", "left", "counter", "ccw"
      const negWord = /\b(left|counter|ccw)\b/.test(raw);
      const sign = (num.negative || negWord) ? -1 : 1;
      return {
        command: { kind: 'rotateJoint', joint: 1, deltaDeg: sign * num.value },
        description: `rotate base ${sign * num.value}°`,
      };
    }
    return { command: null, description: 'rotate — no angle found' };
  }

  // ── JOG (move/go + direction) ──
  for (const [dir, mapping] of Object.entries(DIRECTION_MAP)) {
    const pattern = new RegExp(`\\b${dir}\\b`);
    if (pattern.test(raw)) {
      return {
        command: { kind: 'jog', axis: mapping.axis, delta: mapping.delta },
        description: `move ${dir}`,
      };
    }
  }

  // ── STOP ──
  if (/\b(stop|halt|cancel|abort)\b/.test(raw)) {
    return { command: { kind: 'home' }, description: 'stop → home' };
  }

  // ── UNRECOGNIZED ──
  return { command: null, description: `not understood: "${raw}"` };
}
