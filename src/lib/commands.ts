import { pipelineReport } from '@/lib/report'

/**
 * The commands the bot answers in chat. Anything else is ignored, so normal
 * conversation in the group never gets a reply.
 */
const HELP = [
  '🤖 <b>Silicon Valley bot</b>',
  '━━━━━━━━━━━━━━━',
  '',
  'I post an update whenever something moves in the pipeline.',
  '',
  '/pipeline — who is in play, stage by stage',
  '/help — this message',
].join('\n')

export async function handleCommand(text: string | undefined): Promise<string | null> {
  if (!text) return null

  // In a group, Telegram appends the bot's username: "/pipeline@the_bot".
  const command = text.trim().split(/\s+/)[0].toLowerCase().split('@')[0]

  switch (command) {
    case '/pipeline':
    case '/report':
    case '/status':
      return pipelineReport()
    case '/help':
    case '/start':
      return HELP
    default:
      return null
  }
}
