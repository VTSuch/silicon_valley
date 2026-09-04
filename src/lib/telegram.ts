/**
 * Telegram delivery. Server-only: the bot token never reaches the browser.
 */

const API = 'https://api.telegram.org'

function token() {
  return process.env.TELEGRAM_BOT_TOKEN ?? ''
}

/**
 * Chat ids Telegram gave us for this bot, remembered for the life of the
 * server process so we only ask once.
 */
let cachedChats: string[] | null = null

/**
 * Where to post. TELEGRAM_CHAT_ID wins (comma-separated for several chats);
 * otherwise we ask Telegram who has talked to the bot — which is every chat
 * that has sent it /start — so setup is just "message the bot once".
 */
export async function resolveChats(): Promise<string[]> {
  const configured = (process.env.TELEGRAM_CHAT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  if (configured.length) return configured

  if (cachedChats?.length) return cachedChats

  const res = await fetch(`${API}/bot${token()}/getUpdates`, { cache: 'no-store' })
  const body = (await res.json()) as {
    ok: boolean
    result?: { message?: { chat?: { id: number } } }[]
  }
  if (!body.ok) return []

  const ids = new Set<string>()
  for (const update of body.result ?? []) {
    const id = update.message?.chat?.id
    if (id !== undefined) ids.add(String(id))
  }
  cachedChats = [...ids]
  return cachedChats
}

/** Posts one message to one chat. Returns Telegram's own error, if any. */
export async function sendTo(chatId: string | number, text: string) {
  const res = await fetch(`${API}/bot${token()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  return (await res.json()) as { ok: boolean; description?: string }
}

/** The chats allowed to talk to the bot: the same ones we broadcast to. */
export function allowedChats(): string[] {
  return (process.env.TELEGRAM_CHAT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export interface SendResult {
  sent: number
  skipped?: string
  errors?: string[]
}

/** Posts one message to every chat that follows the bot. Never throws. */
export async function sendTelegram(text: string): Promise<SendResult> {
  if (!token()) return { sent: 0, skipped: 'TELEGRAM_BOT_TOKEN is not set' }

  const chats = await resolveChats()
  if (!chats.length) {
    return { sent: 0, skipped: 'No chat yet — send /start to the bot, or set TELEGRAM_CHAT_ID' }
  }

  const errors: string[] = []
  let sent = 0
  for (const chatId of chats) {
    try {
      const res = await fetch(`${API}/bot${token()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })
      const body = (await res.json()) as { ok: boolean; description?: string }
      if (body.ok) sent += 1
      else errors.push(`${chatId}: ${body.description ?? 'unknown error'}`)
    } catch (e) {
      errors.push(`${chatId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return errors.length ? { sent, errors } : { sent }
}
