/**
 * Runs the bot's command side without a public URL.
 *
 * Telegram normally pushes updates to a webhook, which needs the app to be
 * deployed. Until then this long-polls instead, so `/pipeline` works from the
 * group while everything is still running on a laptop.
 *
 *   npm run bot
 */
import { handleCommand } from '../src/lib/commands'
import { allowedChats, sendTo } from '../src/lib/telegram'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

const allowed = allowedChats()
let offset = 0

console.log(`Listening for commands${allowed.length ? ` from ${allowed.join(', ')}` : ''}…`)

for (;;) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=50&offset=${offset}`
    )
    const body = (await res.json()) as {
      ok: boolean
      result?: { update_id: number; message?: { text?: string; chat?: { id: number } } }[]
    }
    if (!body.ok) {
      await new Promise((r) => setTimeout(r, 5000))
      continue
    }

    for (const update of body.result ?? []) {
      offset = update.update_id + 1
      const chatId = update.message?.chat?.id
      if (chatId === undefined) continue
      if (allowed.length && !allowed.includes(String(chatId))) continue

      const reply = await handleCommand(update.message?.text)
      if (!reply) continue

      const sent = await sendTo(chatId, reply)
      console.log(update.message?.text, '→', sent.ok ? 'replied' : `failed: ${sent.description}`)
    }
  } catch (e) {
    console.error('Poll failed:', e instanceof Error ? e.message : e)
    await new Promise((r) => setTimeout(r, 5000))
  }
}
