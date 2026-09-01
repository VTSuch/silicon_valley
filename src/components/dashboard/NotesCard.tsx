'use client'

import { useMemo, useState } from 'react'
import { Check, History, Plus, RotateCcw, StickyNote, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { formatDate } from '@/lib/dates'

/** A scratchpad. Ticking a note archives it, so nothing is lost. */
export default function NotesCard() {
  const { notes, createNote, setNoteArchived, deleteNote } = useData()
  const [body, setBody] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)

  const { open, archived } = useMemo(
    () => ({
      open: notes.filter((n) => !n.archived_at),
      archived: notes
        .filter((n) => n.archived_at)
        .sort(
          (a, b) =>
            new Date(b.archived_at as string).getTime() -
            new Date(a.archived_at as string).getTime()
        ),
    }),
    [notes]
  )

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    try {
      await createNote(text)
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  const list = showArchived ? archived : open

  return (
    <section className="flex flex-col rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <StickyNote className="h-4 w-4 text-zinc-400" />
          Notes
        </h2>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium transition ${
            showArchived
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
          }`}
          title={showArchived ? 'Back to open notes' : 'Show archived notes'}
        >
          <History className="h-4 w-4" />
          {archived.length > 0 && archived.length}
        </button>
      </header>

      {!showArchived && (
        <form onSubmit={add} className="flex items-start gap-2 border-b border-zinc-100 p-3">
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Enter saves; shift+enter keeps writing.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                add(e)
              }
            }}
            placeholder="Write a note…"
            className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
          />
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="shrink-0 rounded-lg bg-zinc-900 p-1.5 text-white transition hover:bg-zinc-700 disabled:opacity-30"
            title="Add note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="max-h-[420px] flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-zinc-400">
            {showArchived ? 'Nothing archived yet.' : 'No notes. Jot something down.'}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {list.map((note) => (
              <li key={note.id} className="group flex items-start gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p
                    className={`whitespace-pre-wrap break-words text-sm ${
                      showArchived ? 'text-zinc-400 line-through' : 'text-zinc-800'
                    }`}
                  >
                    {note.body}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-zinc-400">
                    {formatDate(note.created_at)}
                    {note.author ? ` · ${note.author}` : ''}
                  </p>
                </div>

                {showArchived ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setNoteArchived(note.id, false)}
                      className="rounded-md p-1 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-700"
                      title="Bring back"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="rounded-md p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      title="Delete for good"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNoteArchived(note.id, true)}
                    className="shrink-0 rounded-md border border-zinc-200 p-1 text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-50"
                    title="Done — archive this note"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
