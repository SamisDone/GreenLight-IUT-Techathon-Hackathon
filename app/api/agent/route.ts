// Server-side LLM route — keeps the API key server-side.
// Two endpoints via action field:
//   "parse"   → transcript → MotionCommand[] + reply
//   "summarize" → execution results → spoken summary

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { AgentResponseSchema, AgentSummarySchema } from '@/lib/agent/schema';
import { AGENT_SYSTEM_PROMPT, AGENT_SUMMARY_PROMPT } from '@/lib/agent/prompt';

const model = google(process.env.MODEL_NAME || 'gemini-3.1-flash-lite');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'parse') {
      // ── Parse: transcript → structured commands ──────────
      const { transcript } = body;
      if (!transcript || typeof transcript !== 'string') {
        return Response.json({ error: 'Missing transcript' }, { status: 400 });
      }

      const { object } = await generateObject({
        model,
        schema: AgentResponseSchema,
        system: AGENT_SYSTEM_PROMPT,
        prompt: transcript,
      });

      return Response.json(object);

    } else if (action === 'summarize') {
      // ── Summarize: execution results → spoken reply ──────
      const { originalTranscript, results } = body;
      if (!results || !Array.isArray(results)) {
        return Response.json({ error: 'Missing results' }, { status: 400 });
      }

      const summaryPrompt = [
        `User said: "${originalTranscript}"`,
        '',
        'Execution results:',
        ...results.map((r: { command: string; success: boolean; detail: string }, i: number) =>
          `${i + 1}. ${r.command}: ${r.success ? 'SUCCESS' : 'REJECTED'} — ${r.detail}`
        ),
        '',
        'Generate a concise spoken response for the operator.',
      ].join('\n');

      const { object } = await generateObject({
        model,
        schema: AgentSummarySchema,
        system: AGENT_SUMMARY_PROMPT,
        prompt: summaryPrompt,
      });

      return Response.json(object);

    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agent route]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
