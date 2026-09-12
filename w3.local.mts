import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const stamp = () => new Date().toISOString().slice(11, 19)
for (let i = 0; i < 14; i++) {
  const { data: c } = await db.from('candidates').select('status').eq('full_name', 'Victor Torres').single()
  const { count } = await db.from('calls').select('*', { count: 'exact', head: true })
  console.log(`${stamp()} UTC — Victor Torres: ${c?.status} · calls: ${count}`)
  if (c?.status === 'calendly_booked') {
    await wait(10_000)
    const { data: ev } = await db.from('candidate_status_events')
      .select('status, occurred_at, note').eq('status', 'calendly_booked')
      .order('occurred_at', { ascending: false }).limit(3)
    console.log('\npromoted automatically. newest calendly_booked events:')
    for (const e of ev!) console.log('   ', e.occurred_at.slice(0, 19), '·', e.note ?? '(no note)')
    process.exit(0)
  }
  await wait(45_000)
}
console.log('no promotion within the window')
