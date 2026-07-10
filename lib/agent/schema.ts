// Zod schema for the LLM's structured output.
// The LLM returns an array of commands + a natural language reply.
// Validated server-side before any command reaches the pipeline.

import { z } from 'zod';

// ── Individual command schemas ──────────────────────────────────

const JogSchema = z.object({
  kind: z.literal('jog'),
  axis: z.enum(['x', 'y', 'z']),
  delta: z.number().describe('Cartesian nudge in meters. Positive = forward/right/up.'),
});

const MoveToSchema = z.object({
  kind: z.literal('moveTo'),
  target: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  keepVertical: z.boolean().optional().describe('If true, keep stylus pointing straight down.'),
});

const RotateJointSchema = z.object({
  kind: z.literal('rotateJoint'),
  joint: z.number().int().min(1).max(7).describe('Joint number, 1 to 7.'),
  deltaDeg: z.number().describe('Rotation in degrees. Positive = CCW.'),
});

const TouchKeySchema = z.object({
  kind: z.literal('touchKey'),
  keyId: z.string().describe('Key ID: "1" through "6".'),
});

const EnterPinSchema = z.object({
  kind: z.literal('enterPin'),
  pin: z.string().describe('PIN string of digits 1-6, e.g. "145236".'),
});

const HomeSchema = z.object({
  kind: z.literal('home'),
});

// ── Combined command union ──────────────────────────────────────

export const MotionCommandSchema = z.discriminatedUnion('kind', [
  JogSchema,
  MoveToSchema,
  RotateJointSchema,
  TouchKeySchema,
  EnterPinSchema,
  HomeSchema,
]);

// ── Full agent response ─────────────────────────────────────────

export const AgentResponseSchema = z.object({
  commands: z.array(MotionCommandSchema).describe(
    'Array of motion commands to execute in order. Empty if the instruction is ambiguous or unclear.'
  ),
  reply: z.string().describe(
    'Natural language response to the user. Confirm what you understood. If ambiguous, ask a clarifying question. If commands are empty, explain why.'
  ),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// ── Response summary schema (for the second LLM call) ───────────

export const AgentSummarySchema = z.object({
  spokenReply: z.string().describe(
    'Natural spoken summary of the execution results. Include gate rejection reasons if any commands failed. Keep it concise and conversational.'
  ),
});

export type AgentSummary = z.infer<typeof AgentSummarySchema>;
