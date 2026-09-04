import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatEvent, PipelineEvent } from '@/lib/events'
import { resolveChats, sendTelegram } from '@/lib/telegram'

export const runtime = 'nodejs'

/**
 * Notifications go out over a bot anyone could message, so the route only
 * answers to a signed-in session — the same people who can see the pipeline.
 */
async function signedIn(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false

  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return false

  const { data, error } = await createClient(url, key).auth.getUser(token)
  return !error && !!data.user
}

export async function POST(req: NextRequest) {
  if (!(await signedIn(req))) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let event: PipelineEvent
  try {
    event = (await req.json()) as PipelineEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!event || typeof event.type !== 'string') {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const result = await sendTelegram(formatEvent(event))
  return NextResponse.json(result)
}

/** Setup check: says whether the bot is configured and who it would message. */
export async function GET(req: NextRequest) {
  if (!(await signedIn(req))) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const configured = !!process.env.TELEGRAM_BOT_TOKEN
  const chats = configured ? await resolveChats() : []
  return NextResponse.json({ configured, chats: chats.length })
}
