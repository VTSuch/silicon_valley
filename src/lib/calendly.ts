/**
 * Read-only Calendly client. Only what the call sync needs: the scheduled
 * events in a window, and who booked them.
 */

const API = 'https://api.calendly.com'

export interface CalendlyEvent {
  uri: string
  name: string | null
  status: string
  start_time: string
  end_time: string
  updated_at: string
  location?: { join_url?: string | null; type?: string } | null
}

export interface CalendlyInvitee {
  uri: string
  name: string
  email: string | null
  status: string
  cancel_url: string | null
  reschedule_url: string | null
  questions_and_answers?: { question: string; answer: string }[] | null
}

/** The booking as the app stores it: the event and its one invitee, merged. */
export interface CalendlyBooking {
  uri: string
  eventName: string | null
  status: string
  startsAt: string
  endsAt: string
  updatedAt: string
  joinUrl: string | null
  inviteeName: string
  inviteeEmail: string | null
  cancelUrl: string | null
  rescheduleUrl: string | null
  notes: string | null
}

class CalendlyError extends Error {}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; title?: string }
    throw new CalendlyError(
      `Calendly ${res.status} on ${path.split('?')[0]}: ${body.message ?? body.title ?? 'request failed'}`
    )
  }
  return (await res.json()) as T
}

/** The URI identifying the signed-in Calendly user. Needed by every listing. */
export async function currentUser(token: string) {
  const body = await get<{ resource: { uri: string } }>('/users/me', token)
  return body.resource.uri
}

/** Scheduled events between two instants, oldest first, following pagination. */
export async function scheduledEvents(token: string, user: string, from: Date, to: Date) {
  const out: CalendlyEvent[] = []
  let page: string | null =
    `/scheduled_events?user=${encodeURIComponent(user)}&count=100&sort=start_time:asc` +
    `&min_start_time=${from.toISOString()}&max_start_time=${to.toISOString()}`

  while (page) {
    const body: { collection: CalendlyEvent[]; pagination: { next_page_token: string | null } } =
      await get(page, token)
    out.push(...body.collection)
    const next = body.pagination?.next_page_token
    page = next
      ? `/scheduled_events?user=${encodeURIComponent(user)}&count=100&sort=start_time:asc` +
        `&min_start_time=${from.toISOString()}&max_start_time=${to.toISOString()}` +
        `&page_token=${next}`
      : null
  }
  return out
}

export async function invitees(token: string, eventUri: string) {
  const uuid = eventUri.split('/').pop()
  const body = await get<{ collection: CalendlyInvitee[] }>(
    `/scheduled_events/${uuid}/invitees?count=100`,
    token
  )
  return body.collection
}

/**
 * One booking per event. Calendly models the invitee separately, and a
 * screening is always one-to-one, so the first active invitee is the
 * candidate — falling back to the first of any status for cancelled bookings,
 * which still need to be recorded as cancelled.
 */
export function toBooking(event: CalendlyEvent, people: CalendlyInvitee[]): CalendlyBooking | null {
  const invitee = people.find((p) => p.status === 'active') ?? people[0]
  if (!invitee) return null

  const answers = (invitee.questions_and_answers ?? [])
    .map((qa) => qa.answer?.trim())
    .filter(Boolean)
    .join('\n')

  return {
    uri: event.uri,
    eventName: event.name,
    // A cancelled invitee means a cancelled booking even when the event
    // itself still reads as active.
    status: event.status === 'active' && invitee.status === 'active' ? 'active' : 'canceled',
    startsAt: event.start_time,
    endsAt: event.end_time,
    updatedAt: event.updated_at,
    joinUrl: event.location?.join_url ?? null,
    inviteeName: invitee.name,
    inviteeEmail: invitee.email,
    cancelUrl: invitee.cancel_url,
    rescheduleUrl: invitee.reschedule_url,
    notes: answers || null,
  }
}
