'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useOutreach } from '@/context/OutreachContext'
import { EXTRACTION_BUTTON_HREF } from '@/lib/extractionButton'
import { OutreachSettings, fillTemplate } from '@/lib/outreach'
import { Field, PrimaryButton, inputClass } from '@/components/common/Field'

/** The bookmarklet to install in any Chrome, and the shared message templates and limits. */
export default function SetupView() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <BookmarkletCard />
      <MessagesCard />
    </div>
  )
}

function BookmarkletCard() {
  const ref = useRef<HTMLAnchorElement>(null)
  // React refuses to render a javascript: URL in an href, so set it on the element.
  useEffect(() => {
    ref.current?.setAttribute('href', EXTRACTION_BUTTON_HREF)
  }, [])

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Bookmark className="h-4 w-4 text-zinc-400" />
        Extraction button
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Drag this button to your bookmarks bar (Cmd+Shift+B shows it). Do it once per Chrome.
      </p>
      <div className="mt-4">
        <a
          ref={ref}
          onClick={(e) => {
            e.preventDefault()
            alert('Drag this button to your bookmarks bar. Click it from the Paraform results page.')
          }}
          className="inline-flex cursor-grab items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          draggable
        >
          Extract Paraform
        </a>
      </div>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
        <li>Open your Paraform search with the results in <b>table view</b>.</li>
        <li>Click the button. It asks how many to extract, shows what it found and asks before downloading.</li>
        <li>Open the search here and drop the CSV in <b>Import</b>.</li>
      </ol>
      <p className="mt-3 text-xs text-zinc-400">
        It only reads the Paraform page. LinkedIn is never automated: you connect, paste and send yourself.
      </p>
    </section>
  )
}

function MessagesCard() {
  const { settings, saveSettings } = useOutreach()
  // null = untouched, so a change made by your partner shows up; once you edit, your draft wins.
  const [edited, setEdited] = useState<OutreachSettings | null>(null)
  const draft = edited ?? settings
  const setDraft = (s: OutreachSettings) => setEdited(s)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const dirty = edited !== null && JSON.stringify(edited) !== JSON.stringify(settings)

  const sample = fillTemplate(draft.tpl1, { name: 'Jessica Doe', company: 'Salesforce' })

  const save = async () => {
    setErr(null)
    try {
      await saveSettings(draft)
      setEdited(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save')
    }
  }

  const num = (k: 'charLimit' | 'dayWarn' | 'weekLimit') => (
    <input
      type="number"
      min={1}
      value={draft[k]}
      onChange={(e) => setDraft({ ...draft, [k]: Math.max(1, parseInt(e.target.value, 10) || 1) })}
      className={inputClass}
    />
  )

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Messages and limits</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Shared with your partner. Use <code>{'{{first_name}}'}</code> and <code>{'{{company}}'}</code>.
      </p>
      <div className="mt-4 space-y-4">
        <Field label="Message 1 — first contact">
          <textarea
            rows={8}
            value={draft.tpl1}
            onChange={(e) => setDraft({ ...draft, tpl1: e.target.value })}
            className={inputClass}
          />
          <p className={`mt-1 text-xs ${sample.length > draft.charLimit ? 'text-red-600' : 'text-zinc-400'}`}>
            With “Jessica” and “Salesforce”: {sample.length} / {draft.charLimit} characters
          </p>
        </Field>
        <Field label="Message 2 — when they reply">
          <textarea
            rows={7}
            value={draft.tpl2}
            onChange={(e) => setDraft({ ...draft, tpl2: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Connection note limit" hint="LinkedIn caps it at 300.">
            {num('charLimit')}
          </Field>
          <Field label="Warn above, per day">{num('dayWarn')}</Field>
          <Field label="Cap per calendar week" hint="Monday to Sunday.">
            {num('weekLimit')}
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <PrimaryButton onClick={save} disabled={!dirty}>
          Save
        </PrimaryButton>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </section>
  )
}
