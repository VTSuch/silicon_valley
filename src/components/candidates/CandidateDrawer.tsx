'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import Drawer from '@/components/common/Drawer'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { buildJourney } from '@/lib/journey'
import { CandidateStatus } from '@/types'
import {
  BOARD_COLUMNS,
  CLOSED_STATUSES,
  MID_STATUSES,
  midStep,
  normalizeStatus,
  statusMeta,
} from '@/lib/status'
import { formatDate, fromDateInput, relativeAgo, relativeDays, toDateInput } from '@/lib/dates'
import DateInput from '@/components/common/DateInput'
import RoleCombobox from '@/components/common/RoleCombobox'

export default function CandidateDrawer() {
  const { openCandidateId, closeCandidate, openRole } = useUI()
  const {
    candidates,
    statusEvents,
    roles,
    setStatus,
    updateCandidate,
    deleteCandidate,
    updateStatusEvent,
    deleteStatusEvent,
    logFollowUp,
    deleteFollowUp,
    followUps,
  } = useData()

  const candidate = candidates.find((c) => c.id === openCandidateId) ?? null

  const journey = useMemo(
    () => (candidate ? buildJourney(candidate, statusEvents) : null),
    [candidate, statusEvents]
  )

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [changeDate, setChangeDate] = useState(() => toDateInput(new Date()))
  const [selected, setSelected] = useState<CandidateStatus>('submitted')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    linkedin_url: '',
    role_id: '',
    notes: '',
  })
  const [hiredSalary, setHiredSalary] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState(() => toDateInput(new Date()))

  useEffect(() => {
    setEditing(false)
    setChangeDate(toDateInput(new Date()))
    if (candidate) {
      setSelected(normalizeStatus(candidate.status))
      setForm({
        full_name: candidate.full_name,
        email: candidate.email,
        linkedin_url: candidate.linkedin_url ?? '',
        role_id: candidate.role_id,
        notes: candidate.notes ?? '',
      })
      setHiredSalary(candidate.hired_salary?.toString() ?? '')
      setFollowUpNote('')
      setFollowUpDate(toDateInput(new Date()))
    }
  }, [candidate?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!candidate || !journey) return null

  const addStage = async () => {
    setBusy('stage')
    try {
      await setStatus(candidate.id, selected, fromDateInput(changeDate))
    } finally {
      setBusy(null)
    }
  }

  const addFollowUp = async () => {
    setBusy('followup')
    try {
      await logFollowUp(candidate.id, fromDateInput(followUpDate), followUpNote)
      setFollowUpNote('')
      setFollowUpDate(toDateInput(new Date()))
    } finally {
      setBusy(null)
    }
  }

  const saveHiredSalary = async () => {
    setBusy('salary')
    try {
      await updateCandidate(candidate.id, {
        hired_salary: hiredSalary ? Number(hiredSalary) : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  const saveDetails = async () => {
    setBusy('details')
    try {
      await updateCandidate(candidate.id, {
        full_name: form.full_name,
        email: form.email,
        linkedin_url: form.linkedin_url || undefined,
        role_id: form.role_id,
        notes: form.notes || undefined,
      })
      setEditing(false)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete ${candidate.full_name}? This also removes their stage history.`)) return
    setBusy('delete')
    try {
      await deleteCandidate(candidate.id)
      closeCandidate()
    } finally {
      setBusy(null)
    }
  }

  const events = [...journey.events].reverse()
  const candidateFollowUps = followUps
    .filter((f) => f.candidate_id === candidate.id)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  return (
    <Drawer
      open
      onClose={closeCandidate}
      subtitle={candidate.role?.company}
      title={candidate.full_name}
      actions={
        <>
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="Open LinkedIn"
            >
              <ExternalLink className="h-4.5 w-4.5" />
            </a>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className={`rounded-lg p-1.5 hover:bg-zinc-100 ${editing ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'}`}
            title="Edit details"
          >
            <Pencil className="h-4.5 w-4.5" />
          </button>
        </>
      }
    >
      <div className="space-y-6 p-5">
        {/* Current state --------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={journey.status} />
          <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            {relativeDays(journey.daysInStatus)} in stage
          </span>
          {journey.stale &&
            (journey.daysSinceFollowUp === null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <AlertTriangle className="h-3 w-3" />
                Needs a follow-up
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <Check className="h-3 w-3" />
                Followed up {relativeAgo(journey.daysSinceFollowUp)}
              </span>
            ))}
        </div>

        <button
          onClick={() => openRole(candidate.role_id)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <div className="text-sm font-medium text-zinc-900">{candidate.role?.job_title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
            <span>{candidate.role?.company}</span>
            <span className="text-zinc-300">•</span>
            <span>
              Bounty {journey.bounty ? `$${journey.bounty.toLocaleString()}` : '—'}
              {candidate.hired_salary && candidate.role?.bounty_pct ? (
                <span className="text-zinc-400">
                  {' '}
                  ({candidate.role.bounty_pct}% of ${candidate.hired_salary.toLocaleString()})
                </span>
              ) : null}
            </span>
          </div>
        </button>

        {/* Move stage ------------------------------------------------------ */}
        <section className="rounded-xl border border-zinc-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Move to stage</h3>

          <div className="flex flex-wrap gap-1.5">
            {BOARD_COLUMNS.map((col) => {
              const picked = col.statuses.includes(selected)
              const current = col.statuses.includes(journey.status)
              return (
                <button
                  key={col.id}
                  onClick={() => setSelected(current ? journey.status : col.entry)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    picked
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${picked ? 'bg-white' : col.color}`} />
                  {col.label}
                  {current && (
                    <span
                      className={`rounded px-1 text-[10px] ${picked ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'}`}
                    >
                      now
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mid stages collapse into one column on the board, so the
              individual steps live here — a company can run three of them. */}
          {(midStep(selected) > 0 || midStep(journey.status) > 0) && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
              <div className="mb-1.5 text-[11px] font-medium text-amber-800">Mid stage steps</div>
              <div className="flex flex-wrap gap-1.5">
                {MID_STATUSES.map((mid, i) => {
                  const picked = mid === selected
                  const current = mid === journey.status
                  return (
                    <button
                      key={mid}
                      onClick={() => setSelected(mid)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition ${
                        picked
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-amber-200 bg-white text-zinc-600 hover:border-amber-400 hover:text-zinc-900'
                      }`}
                    >
                      Mid {i + 1}
                      {current && (
                        <span
                          className={`rounded px-1 text-[10px] ${picked ? 'bg-white/25' : 'bg-amber-100 text-amber-700'}`}
                        >
                          now
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {CLOSED_STATUSES.map((st) => {
              const picked = st === selected
              const current = st === journey.status
              const meta = statusMeta(st)
              return (
                <button
                  key={st}
                  onClick={() => setSelected(st)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-medium transition ${
                    picked
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-800'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${picked ? 'bg-white' : meta.dot}`} />
                  {meta.label}
                  {current && (
                    <span
                      className={`rounded px-1 text-[10px] ${picked ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'}`}
                    >
                      now
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
            <label className="mr-auto flex items-center gap-2 text-xs text-zinc-500">
              Date
              <DateInput
                eager
                value={changeDate}
                onChange={setChangeDate}
                className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
              />
            </label>
            <PrimaryButton onClick={addStage} disabled={busy !== null} className="py-1.5 text-xs">
              {busy === 'stage' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add stage
            </PrimaryButton>
          </div>
          <p className="mt-1.5 text-right text-[11px] text-zinc-400">
            Adds {statusMeta(selected).label} on the date above — even if it is already the
            current stage.
          </p>
        </section>

        {/* Hired salary ---------------------------------------------------- */}
        {statusMeta(journey.status).group === 'hired' && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <h3 className="text-sm font-semibold text-zinc-900">Hired at</h3>
            <p className="mb-2 text-xs text-zinc-500">
              {candidate.role?.bounty_pct
                ? `The bounty is recalculated as ${candidate.role.bounty_pct}% of this salary.`
                : 'Set a fee % on the role to recalculate the bounty from this salary.'}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder={candidate.role?.salary_min?.toString() ?? 'Signed salary'}
                  value={hiredSalary}
                  onChange={(e) => setHiredSalary(e.target.value)}
                  className={`${inputClass} pl-7`}
                />
              </div>
              <PrimaryButton onClick={saveHiredSalary} disabled={busy === 'salary'}>
                {busy === 'salary' ? 'Saving…' : 'Save'}
              </PrimaryButton>
            </div>
            {hiredSalary && candidate.role?.bounty_pct && (
              <p className="mt-2 text-xs text-zinc-600">
                Bounty ={' '}
                <span className="font-semibold text-zinc-900">
                  ${Math.round((Number(hiredSalary) * candidate.role.bounty_pct) / 100).toLocaleString()}
                </span>
              </p>
            )}
          </section>
        )}

        {/* Details --------------------------------------------------------- */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Details</h3>
          {editing ? (
            <div className="space-y-3">
              <Field label="Name">
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  className={inputClass}
                  value={form.linkedin_url}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                />
              </Field>
              <Field label="Role">
                <RoleCombobox
                  roles={roles}
                  value={form.role_id}
                  onChange={(role_id) => setForm({ ...form, role_id })}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
              <div className="flex gap-2">
                <PrimaryButton onClick={saveDetails} disabled={busy === 'details'}>
                  {busy === 'details' ? 'Saving…' : 'Save'}
                </PrimaryButton>
                <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
              </div>
            </div>
          ) : (
            <dl className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
              <Row label="Email" value={candidate.email} />
              <Row
                label="LinkedIn"
                value={
                  candidate.linkedin_url ? (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                    >
                      Profile
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <Row label="Added" value={formatDate(candidate.created_at)} />
              <Row label="Submitted" value={formatDate(journey.submittedAt)} />
              {candidate.notes && <Row label="Notes" value={candidate.notes} />}
            </dl>
          )}
        </section>

        {/* Follow-ups ------------------------------------------------------ */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Follow-ups</h3>
            <span className="text-xs text-zinc-400">
              {journey.daysSinceFollowUp === null
                ? 'Not chased in this stage'
                : `Last chased ${relativeAgo(journey.daysSinceFollowUp)}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="What did you do? (optional)"
              className={`${inputClass} flex-1`}
            />
            <DateInput
              eager
              value={followUpDate}
              onChange={setFollowUpDate}
              className="rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
            />
            <GhostButton onClick={addFollowUp} disabled={busy === 'followup'} className="shrink-0">
              {busy === 'followup' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellRing className="h-3.5 w-3.5" />
              )}
              Log
            </GhostButton>
          </div>

          {candidateFollowUps.length > 0 && (
            <ol className="mt-2 space-y-1">
              {candidateFollowUps.map((f) => (
                <li
                  key={f.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">
                    {f.note || 'Followed up'}
                    {f.author && <span className="text-zinc-400"> · {f.author}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(f.occurred_at)}
                  </span>
                  <button
                    onClick={() => deleteFollowUp(f.id)}
                    className="rounded p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    title="Remove this entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Timeline -------------------------------------------------------- */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Stage history</h3>
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
              No history yet. Moving the candidate to a stage records it here.
            </p>
          ) : (
            <ol className="space-y-1">
              {events.map((e, i) => (
                <li
                  key={e.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusMeta(e.status).dot}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                    {statusMeta(e.status).label}
                    {i === 0 && <span className="ml-2 text-xs text-zinc-400">current</span>}
                  </span>
                  <DateInput
                    value={e.occurred_at}
                    onChange={(next) =>
                      updateStatusEvent(e.id, {
                        occurred_at: fromDateInput(next).toISOString(),
                      })
                    }
                    className="rounded-md border border-transparent px-1.5 py-0.5 text-xs text-zinc-500 outline-none hover:border-zinc-200 focus:border-zinc-400 focus:text-zinc-900"
                  />
                  <button
                    onClick={() => deleteStatusEvent(e.id)}
                    className="rounded p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    title="Remove this entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="border-t border-zinc-100 pt-4">
          <button
            onClick={remove}
            disabled={busy === 'delete'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete candidate
          </button>
        </div>
      </div>
    </Drawer>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-3 py-2.5">
      <dt className="w-24 shrink-0 text-xs text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm break-words text-zinc-900">{value}</dd>
    </div>
  )
}
