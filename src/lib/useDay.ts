import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { DateKey, DayEntry } from '../model/types';
import { SCHEMA_VERSION } from '../model/schema';
import { getEntry, putEntry } from '../storage/db';
import { schedulePush } from '../storage/sync';
import { nowIso } from './dates';

/** A day being edited. Everything except `mood` is optional; nothing is stored until mood is set. */
export type Draft = Partial<Omit<DayEntry, 'schemaVersion' | 'date' | 'createdAt' | 'updatedAt'>>;

const SAVE_DELAY_MS = 400;

function clean(d: Draft): Draft {
  const out: Draft = { ...d };
  if (out.inner && Object.values(out.inner).every((v) => v === undefined)) delete out.inner;
  if (out.domains) {
    const domains = Object.fromEntries(
      Object.entries(out.domains).filter(([, v]) => v.score !== undefined || v.good || v.tags?.length),
    );
    if (Object.keys(domains).length) out.domains = domains;
    else delete out.domains;
  }
  for (const k of ['highlight', 'note'] as const) if (!out[k]) delete out[k];
  return out;
}

/** Load, edit and auto-save one day. Saving is local-first; sync is scheduled after. */
export function useDay(date: DateKey) {
  const [draft, setDraft] = useState<Draft>({});
  const [saved, setSaved] = useState<DayEntry | undefined>();
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef<Draft>({});

  const reload = useCallback(async () => {
    const e = await getEntry(date);
    setSaved(e);
    const d: Draft = e ? { ...e } : {};
    latest.current = d;
    setDraft(d);
    setLoaded(true);
  }, [date]);

  useEffect(() => {
    setLoaded(false);
    void reload();
    const onSync = () => {
      if (!pending.current) void reload();
    };
    window.addEventListener('spheres:synced', onSync);
    return () => window.removeEventListener('spheres:synced', onSync);
  }, [reload]);

  const persist = useCallback(async () => {
    pending.current = undefined;
    const d = clean(latest.current);
    if (d.mood === undefined) return;
    const prev = await getEntry(date);
    const now = nowIso();
    const entry: DayEntry = {
      ...d,
      mood: d.mood,
      schemaVersion: SCHEMA_VERSION,
      date,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    await putEntry(entry);
    setSaved(entry);
    schedulePush();
  }, [date]);

  const update = useCallback(
    (patch: Draft | ((d: Draft) => Draft)) => {
      const next = typeof patch === 'function' ? patch(latest.current) : { ...latest.current, ...patch };
      latest.current = next;
      setDraft(next);
      clearTimeout(pending.current);
      pending.current = setTimeout(() => void persist(), SAVE_DELAY_MS);
    },
    [persist],
  );

  /** Save right away (the "Зберегти день" button, leaving a screen). */
  const flush = useCallback(async () => {
    clearTimeout(pending.current);
    await persist();
  }, [persist]);

  useEffect(() => () => {
    if (pending.current) {
      clearTimeout(pending.current);
      void persist();
    }
  }, [persist]);

  return { draft, saved, loaded, update, flush };
}
