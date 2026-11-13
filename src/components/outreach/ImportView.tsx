'use client'

import { useMemo, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { OutreachSearch } from '@/types'
import { useOutreach } from '@/context/OutreachContext'
import { ImportParse, parseProspectCsv } from '@/lib/outreach'
import { PrimaryButton } from '@/components/common/Field'

/** Drop the CSV the bookmarklet downloaded; it becomes this search's queue and list. */
export default function ImportView({
  search,
  onDone,
}: {
  search: OutreachSearch
  onDone: () => void
}) {
  const { prospects, importProspects } = useOutreach()
  const [parsed, setParsed] = useState<ImportParse | null>(null)
  const [fileName, setFileName] = useState('')
  const [skipContacted, setSkipContacted] = useState(true)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = async (file: File) => {
    setErr(null)
    setFileName(file.name)
    setParsed(parseProspectCsv(await file.text()))
  }

  // Compared against what is already stored.
  const analysis = useMemo(() => {
    if (!parsed) return null
    const inThis = new Set(prospects.filter((p) => p.search_id === search.id).map((p) => p.linkedin_url))
    const contacted = new Set(
      prospects
        .filter((p) => p.search_id !== search.id && p.status !== 'pending' && p.status !== 'skipped')
        .map((p) => p.linkedin_url)
    )
    const fresh = parsed.rows.filter((r) => !inThis.has(r.linkedin_url))
    const alreadyContacted = fresh.filter((r) => contacted.has(r.linkedin_url))
    const toImport = skipContacted ? fresh.filter((r) => !contacted.has(r.linkedin_url)) : fresh
    return {
      alreadyHere: parsed.rows.length - fresh.length,
      alreadyContacted: alreadyContacted.length,
      toImport,
    }
  }, [parsed, prospects, search.id, skipContacted])

  const run = async () => {
    if (!analysis) return
    setBusy(true)
    setErr(null)
    try {
      await importProspects(search.id, analysis.toImport)
      setParsed(null)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files[0]
          if (f) void read(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
          drag ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 bg-white hover:border-zinc-400'
        }`}
      >
        <FileUp className="h-6 w-6 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-800">Drop the extraction CSV here</p>
        <p className="text-xs text-zinc-500">or click to choose it. It goes into this search only.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void read(f)
            e.target.value = ''
          }}
        />
      </div>

      {parsed?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {parsed.error}
        </div>
      )}

      {parsed && !parsed.error && analysis && (
        <section className="rounded-xl border border-zinc-200 bg-white">
          <header className="border-b border-zinc-100 px-4 py-3 text-sm">
            <span className="font-medium text-zinc-900">{fileName}</span>
            <span className="text-zinc-500"> · {parsed.rows.length} with a LinkedIn URL</span>
          </header>
          <ul className="space-y-1 px-4 py-3 text-xs text-zinc-500">
            {parsed.noUrl > 0 && <li>{parsed.noUrl} rows without a LinkedIn URL are ignored.</li>}
            {parsed.duplicatesInFile > 0 && <li>{parsed.duplicatesInFile} repeated in the file.</li>}
            {analysis.alreadyHere > 0 && <li>{analysis.alreadyHere} are already in this search.</li>}
          </ul>
          {analysis.alreadyContacted > 0 && (
            <label className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <input
                type="checkbox"
                checked={skipContacted}
                onChange={(e) => setSkipContacted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {analysis.alreadyContacted} were already contacted in another search. Skip them so nobody gets
                messaged twice.
              </span>
            </label>
          )}
          <div className="max-h-56 overflow-y-auto border-t border-zinc-100">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-zinc-100">
                {analysis.toImport.slice(0, 10).map((r) => (
                  <tr key={r.linkedin_url}>
                    <td className="px-4 py-1.5 font-medium text-zinc-800">{r.name}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{r.title}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{r.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {analysis.toImport.length > 10 && (
              <p className="px-4 py-2 text-xs text-zinc-400">…and {analysis.toImport.length - 10} more</p>
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            {err ? <span className="text-xs text-red-600">{err}</span> : <span />}
            <PrimaryButton onClick={run} disabled={busy || analysis.toImport.length === 0}>
              {busy ? 'Importing…' : `Add ${analysis.toImport.length} to the queue`}
            </PrimaryButton>
          </footer>
        </section>
      )}
    </div>
  )
}
