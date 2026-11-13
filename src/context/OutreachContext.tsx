'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OutreachSearch, Prospect, ProspectStatus } from '@/types'
import {
  DEFAULT_OUTREACH_SETTINGS,
  OUTREACH_SETTINGS_KEY,
  OutreachSettings,
  ParsedProspect,
  parseOutreachSettings,
} from '@/lib/outreach'
import { displayName } from './DataContext'

interface OutreachContextValue {
  searches: OutreachSearch[]
  prospects: Prospect[]
  settings: OutreachSettings
  loading: boolean
  error: string | null
  /** false until migration 017 has been run. */
  ready: boolean

  createSearch: (input: { job_title: string; location?: string; notes?: string }) => Promise<OutreachSearch>
  deleteSearch: (id: string) => Promise<void>
  /** Adds prospects to a search; people already in it are ignored. */
  importProspects: (searchId: string, rows: ParsedProspect[]) => Promise<{ added: number }>
  setProspectStatus: (id: string, status: ProspectStatus) => Promise<void>
  deleteProspect: (id: string) => Promise<void>
  saveSettings: (s: OutreachSettings) => Promise<void>
}

const Ctx = createContext<OutreachContextValue | null>(null)

const CHUNK = 400

export function OutreachProvider({ children }: { children: React.ReactNode }) {
  const [searches, setSearches] = useState<OutreachSearch[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [settings, setSettings] = useState<OutreachSettings>(DEFAULT_OUTREACH_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Latest prospects for callbacks that must not re-create on every change.
  const latest = useLatest(prospects)
  /** Who is signed in, kept in memory so marking a prospect never waits on a request. */
  const meRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession()
    meRef.current = displayName(sess.session?.user ?? null)
    const [sRes, pRes, cfgRes] = await Promise.all([
      supabase.from('outreach_searches').select('*').order('created_at', { ascending: false }),
      // PostgREST caps a response at 1000 rows by default; page through it.
      fetchAllProspects(),
      supabase.from('app_settings').select('value').eq('key', OUTREACH_SETTINGS_KEY).maybeSingle(),
    ])

    if (sRes.error || pRes.error) {
      const msg = sRes.error?.message ?? pRes.error?.message ?? ''
      // Table missing: migration 017 hasn't been run yet.
      if (/outreach_|relation|schema cache/i.test(msg)) setReady(false)
      else setError(msg)
    } else {
      setReady(true)
      setError(null)
      setSearches((sRes.data as OutreachSearch[]) ?? [])
      setProspects(pRes.data)
    }
    if (!cfgRes.error) setSettings(parseOutreachSettings(cfgRes.data?.value))
    setLoading(false)
  }, [])

  useEffect(() => {
    // Deferred a tick: the first load is a subscription to the database, not a render-time update.
    const first = setTimeout(() => void refresh(), 0)
    const channel = supabase
      .channel('outreach-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outreach_searches' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outreach_prospects' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => refresh())
      .subscribe()
    return () => {
      clearTimeout(first)
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const createSearch = useCallback<OutreachContextValue['createSearch']>(
    async (input) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('outreach_searches')
        .insert({
          job_title: input.job_title.trim(),
          location: input.location?.trim() || null,
          notes: input.notes?.trim() || null,
          created_by: displayName(auth.user),
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      setSearches((prev) => [data as OutreachSearch, ...prev])
      return data as OutreachSearch
    },
    []
  )

  const deleteSearch = useCallback(async (id: string) => {
    const { error } = await supabase.from('outreach_searches').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setSearches((prev) => prev.filter((s) => s.id !== id))
    setProspects((prev) => prev.filter((p) => p.search_id !== id))
  }, [])

  const importProspects = useCallback<OutreachContextValue['importProspects']>(
    async (searchId, rows) => {
      let added = 0
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((r) => ({
          search_id: searchId,
          name: r.name,
          company: r.company || null,
          title: r.title || null,
          location: r.location || null,
          tier: r.tier || null,
          linkedin_url: r.linkedin_url,
        }))
        const { data, error } = await supabase
          .from('outreach_prospects')
          .upsert(chunk, { onConflict: 'search_id,linkedin_url', ignoreDuplicates: true })
          .select('id')
        if (error) throw new Error(error.message)
        added += data?.length ?? 0
      }
      await refresh()
      return { added }
    },
    [refresh]
  )

  const setProspectStatus = useCallback(
    async (id: string, status: ProspectStatus) => {
      const current = latest.current.find((p) => p.id === id)
      if (!current) return
      const now = new Date().toISOString()
      const patch: Partial<Prospect> = { status, status_at: now }
      if (status === 'pending') {
        // Back to the queue: it no longer counts as sent.
        patch.sent_at = null
        patch.sent_by = null
      } else if (status !== 'skipped' && status !== 'rejected' && !current.sent_at) {
        patch.sent_at = now
        patch.sent_by = meRef.current
      }

      // Optimistic: the screen changes at once; the database catches up behind it.
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
      const { data, error } = await supabase
        .from('outreach_prospects')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) {
        setProspects((prev) => prev.map((p) => (p.id === id ? current : p)))
        throw new Error(error.message)
      }
      setProspects((prev) => prev.map((p) => (p.id === id ? (data as Prospect) : p)))
    },
    [latest]
  )

  const deleteProspect = useCallback(async (id: string) => {
    const { error } = await supabase.from('outreach_prospects').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setProspects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const saveSettings = useCallback(async (s: OutreachSettings) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: OUTREACH_SETTINGS_KEY, value: s, updated_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
    setSettings(s)
  }, [])

  const value = useMemo(
    () => ({
      searches,
      prospects,
      settings,
      loading,
      error,
      ready,
      createSearch,
      deleteSearch,
      importProspects,
      setProspectStatus,
      deleteProspect,
      saveSettings,
    }),
    [
      searches,
      prospects,
      settings,
      loading,
      error,
      ready,
      createSearch,
      deleteSearch,
      importProspects,
      setProspectStatus,
      deleteProspect,
      saveSettings,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOutreach() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOutreach must be used within an OutreachProvider')
  return ctx
}

async function fetchAllProspects(): Promise<{ data: Prospect[]; error: { message: string } | null }> {
  const out: Prospect[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('outreach_prospects')
      .select('*')
      .order('position', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return { data: [], error }
    out.push(...((data as Prospect[]) ?? []))
    if (!data || data.length < PAGE) break
  }
  return { data: out, error: null }
}

function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}
