// Server-side LLM API route (Phase 3B)
// Keeps the API key server-side, never shipped to the client.
// Accepts natural language, returns Zod-validated MotionCommand[].

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // TODO: Phase 3B implementation
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
