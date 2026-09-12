import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CalendlyBooking, currentUser, invitees, scheduledEvents, toBooking } from '@/lib/calendly'
import { matchBooking } from '@/lib/match'
import { candidateSummary, formatEvent, statusLabel } from '@/lib/events'
import { sendTelegram } from '@/lib/telegram'
import { CandidateWithRole } from '@/types'

export const runtime = 'nodejs'
// Talking to Calendly once per booking adds up; the default budget is tight
// enough that a slow reply used to kill the run halfway.
export const maxDuration = 60

/** How far around today the sync looks. */
const DAYS_BACK = 1
const DAYS_AHEAD = 60

/** Note left on the status event, so an automatic move is recognisable later. */
const AUTO_NOTE = 'Booked via Calendly'

interface CallRow {
  id: string
  external_id: string
  candidate_id: string | null
  match: string
  starts_at: string
  remote_updated_at: string | null
}

/**
 * Two ways in: a signed-in user pressing Sync, or the scheduled job carrying
 * the shared secret. The job has no session, so it cannot use the first.
 */
async function authorized(req: NextRequest) {
  const secret = process.env.CALLS_SYNC_SECRET
  if (secret) {
    const offered =
      req.headers.get('x-sync-secret') ??
      req.headers.get('authorization')?.replace(/^Bearer /i, '')
    if (offered && offered === secret) return true
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return false
  const { data, error } = await createClient(url, key).auth.getUser(token)
  return !error && !!data.user
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const token = process.env.CALENDLY_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'CALENDLY_API_TOKEN is not set' }, { status: 501 })
  }
  const db = admin()
  if (!db) {
    return NextResponse.json({ error: 'Supabase service key is not set' }, { status: 501 })
  }

  // Loaded before anything else on purpose. This used to sit after the
  // Calendly round trips, fifteen seconds into the request, where a slow reply
  // came back as a gateway timeout and took the whole sync with it. There is
  // also nothing to sync without it, so failing here costs nothing.
  // Supabase returns the odd gateway timeout on this one, so give it a few
  // goes before abandoning the run — a sync that gives up is a sync that does
  // not happen for another quarter of an hour.
  const BACKOFF = [400, 1500, 4000]
  let candidates: CandidateWithRole[] = []
  let lastError = 'none returned'
  for (let attempt = 0; attempt < BACKOFF.length; attempt++) {
    const { data, error } = await db.from('candidates').select('*, role:roles(*)')
    if (data?.length) {
      candidates = data as CandidateWithRole[]
      break
    }
    lastError = error?.message ?? 'none returned'
    await new Promise((resolve) => setTimeout(resolve, BACKOFF[attempt]))
  }
  if (!candidates.length) {
    return NextResponse.json(
      { error: `Could not load candidates to match against: ${lastError}` },
      { status: 502 }
    )
  }

  const now = new Date()
  const from = new Date(now.getTime() - DAYS_BACK * 86_400_000)
  const to = new Date(now.getTime() + DAYS_AHEAD * 86_400_000)

  let bookings: CalendlyBooking[]
  try {
    const user = await currentUser(token)
    const events = await scheduledEvents(token, user, from, to)

    const { data: existingRows } = await db
      .from('calls')
      .select('id, external_id, candidate_id, match, starts_at, remote_updated_at')
    const existing = new Map<string, CallRow>(
      ((existingRows as CallRow[]) ?? []).map((r) => [r.external_id, r])
    )

    // Invitees are a request per booking, so skip the ones Calendly says have
    // not changed since the last sync and that already found their candidate.
    //
    // Compared as instants rather than as text: Postgres hands the timestamp
    // back as "+00:00" where Calendly wrote "Z", so string equality never held
    // and every run re-fetched every booking it already had.
    const unchanged = (stored: string | null, remote: string) =>
      !!stored && new Date(stored).getTime() === new Date(remote).getTime()

    const fresh = events.filter((e) => {
      const row = existing.get(e.uri)
      if (!row) return true
      if (!unchanged(row.remote_updated_at, e.updated_at)) return true
      return !row.candidate_id && row.match !== 'manual'
    })

    bookings = (
      await Promise.all(
        fresh.map(async (event) => toBooking(event, await invitees(token, event.uri)))
      )
    ).filter((b): b is CalendlyBooking => b !== null)

    let linked = 0
    let advanced = 0

    for (const booking of bookings) {
      const row = existing.get(booking.uri)
      // A decision made by hand is never second-guessed by the matcher —
      // including the decision that this booking belongs to nobody.
      const decided = row?.match === 'manual'
      const match = decided
        ? {
            candidate: candidates.find((c) => c.id === row?.candidate_id) ?? null,
            kind: 'manual' as const,
            score: 1,
          }
        : matchBooking(booking, candidates)

      // A booking that is already linked keeps its candidate when a later
      // pass cannot place it. Matching should only ever add certainty.
      const candidateId = match.candidate?.id ?? row?.candidate_id ?? null
      const kind = match.candidate ? match.kind : row?.candidate_id ? row.match : match.kind

      const { error } = await db.from('calls').upsert(
        {
          external_id: booking.uri,
          candidate_id: candidateId,
          invitee_name: booking.inviteeName,
          invitee_email: booking.inviteeEmail,
          event_name: booking.eventName,
          starts_at: booking.startsAt,
          ends_at: booking.endsAt,
          join_url: booking.joinUrl,
          cancel_url: booking.cancelUrl,
          reschedule_url: booking.rescheduleUrl,
          status: booking.status,
          match: kind,
          notes: booking.notes,
          remote_updated_at: booking.updatedAt,
        },
        { onConflict: 'external_id' }
      )
      if (error) {
        console.warn('Could not store call', booking.uri, error.message)
        continue
      }
      if (match.candidate) linked++

      // Someone can book with an address we never had. Fill a blank in, but
      // never overwrite one already on file: booking from a second address is
      // ordinary, and the one we hold is the one we have been writing to.
      if (
        match.candidate &&
        match.kind !== 'suggested' &&
        booking.inviteeEmail &&
        !match.candidate.email?.trim()
      ) {
        const { error: mailError } = await db
          .from('candidates')
          .update({ email: booking.inviteeEmail })
          .eq('id', match.candidate.id)
        if (!mailError) match.candidate.email = booking.inviteeEmail
      }

      // Only a booking that still stands, still lies ahead and matched
      // beyond doubt moves anybody — and only out of "Calendly sent".
      const candidate = match.candidate
      const confident = match.kind === 'email' || match.kind === 'name'
      const upcoming = booking.status === 'active' && new Date(booking.startsAt) > now
      if (!candidate || !confident || !upcoming) continue
      if (candidate.status !== 'calendly_sent') continue

      const { error: moveError } = await db
        .from('candidates')
        .update({ status: 'calendly_booked' })
        .eq('id', candidate.id)
      if (moveError) {
        console.warn('Could not advance candidate', candidate.id, moveError.message)
        continue
      }
      candidate.status = 'calendly_booked'
      advanced++

      await db.from('candidate_status_events').insert({
        candidate_id: candidate.id,
        status: 'calendly_booked',
        occurred_at: new Date().toISOString(),
        note: AUTO_NOTE,
      })

      // Same notification any manual move would send. A failure here must not
      // cost us the rest of the sync: the move is already recorded.
      try {
        await sendTelegram(
          formatEvent({
            type: 'candidate_status_changed',
            candidate: candidateSummary(
              { ...candidate, status: 'calendly_booked' },
              candidate.role
            ),
            from: statusLabel('calendly_sent'),
            to: statusLabel('calendly_booked') ?? 'Calendly booked',
            toId: 'calendly_booked',
            note: AUTO_NOTE,
          })
        )
      } catch (e) {
        console.warn('Could not announce the automatic move', e)
      }
    }

    // Bookings that vanished from Calendly entirely (deleted, not cancelled)
    // would otherwise linger as upcoming calls that never happen. Only rows
    // inside the window we just fetched can be judged missing — anything
    // older simply was not asked for.
    const seen = new Set(events.map((e) => e.uri))
    const stale = [...existing.values()].filter((r) => {
      if (seen.has(r.external_id)) return false
      const at = new Date(r.starts_at)
      return at >= from && at <= to
    })
    if (stale.length) {
      await db
        .from('calls')
        .delete()
        .in(
          'id',
          stale.map((r) => r.id)
        )
    }

    return NextResponse.json({
      ok: true,
      events: events.length,
      updated: bookings.length,
      linked,
      advanced,
      removed: stale.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    console.error('Calendly sync failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
