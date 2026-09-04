import { NextRequest, NextResponse } from 'next/server'
import { handleCommand } from '@/lib/commands'
import { allowedChats, sendTo } from '@/lib/telegram'

export const runtime = 'nodejs'

/**
 * Where Telegram delivers messages sent to the bot.
 *
 * Anyone can guess this URL, so two things guard it: the secret token
 * Telegram echoes back on every call, and the chat allowlist — the bot only
 * answers the chats we broadcast to.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: { message?: { text?: string; chat?: { id: number } } }
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const chatId = update.message?.chat?.id
  // Always 200: an error status makes Telegram retry the same update forever.
  if (chatId === undefined) return NextResponse.json({ ok: true })

  const allowed = allowedChats()
  if (allowed.length && !allowed.includes(String(chatId))) {
    return NextResponse.json({ ok: true })
  }

  const reply = await handleCommand(update.message?.text)
  if (reply) await sendTo(chatId, reply)

  return NextResponse.json({ ok: true })
}
