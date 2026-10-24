import Dexie, { type Table } from 'dexie';
import type { Config, DateKey, DayEntry, MonthKey, WeeklyReview } from '../model/types';
import { ConfigSchema, DayEntrySchema, WeeklyReviewSchema } from '../model/schema';
import { defaultConfig } from '../model/defaults';
import { monthOf } from '../lib/dates';

interface KV {
  key: string;
  value: unknown;
}

interface Dirty {
  /** `entries/2026-10.json`, `config.json`, `reviews/2026.json` */
  path: string;
}

export class SpheresDB extends Dexie {
  entries!: Table<DayEntry, DateKey>;
  reviews!: Table<WeeklyReview, string>;
  kv!: Table<KV, string>;
  dirty!: Table<Dirty, string>;

  constructor(name = 'spheres') {
    super(name);
    this.version(1).stores({
      entries: 'date',
      reviews: 'week',
      kv: 'key',
      dirty: 'path',
    });
  }
}

/**
 * The active profile's database. A live binding: switchDb() swaps it when the user changes.
 * Hooks capture it at mount so a late save never lands in another user's data.
 */
export let db = new SpheresDB();

export function switchDb(name: string): SpheresDB {
  if (db.name !== name) {
    db.close();
    db = new SpheresDB(name);
  }
  return db;
}

export const entryPath = (month: MonthKey) => `entries/${month}.json`;
export const reviewsPath = (year: string) => `reviews/${year}.json`;
export const CONFIG_PATH = 'config.json';

/** Every read and write goes through Zod (architecture rule). */
export async function getEntry(date: DateKey, d = db): Promise<DayEntry | undefined> {
  const raw = await d.entries.get(date);
  if (!raw) return undefined;
  const parsed = DayEntrySchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export async function putEntry(entry: DayEntry, d = db): Promise<void> {
  const valid = DayEntrySchema.parse(entry);
  await d.transaction('rw', d.entries, d.dirty, async () => {
    await d.entries.put(valid);
    await d.dirty.put({ path: entryPath(monthOf(valid.date)) });
  });
}

export async function allEntries(d = db): Promise<DayEntry[]> {
  const rows = await d.entries.orderBy('date').toArray();
  return rows.flatMap((r) => {
    const p = DayEntrySchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export async function entriesInMonth(month: MonthKey, d = db): Promise<DayEntry[]> {
  const rows = await d.entries.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray();
  return rows.flatMap((r) => {
    const p = DayEntrySchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export async function getConfig(d = db): Promise<Config> {
  const row = await d.kv.get('config');
  const parsed = ConfigSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : defaultConfig();
}

export async function putConfig(config: Config, opts: { markDirty?: boolean } = {}, d = db): Promise<void> {
  const valid = ConfigSchema.parse(config);
  await d.transaction('rw', d.kv, d.dirty, async () => {
    await d.kv.put({ key: 'config', value: valid });
    if (opts.markDirty !== false) await d.dirty.put({ path: CONFIG_PATH });
  });
}

export async function putReview(review: WeeklyReview, d = db): Promise<void> {
  const valid = WeeklyReviewSchema.parse(review);
  await d.transaction('rw', d.reviews, d.dirty, async () => {
    await d.reviews.put(valid);
    await d.dirty.put({ path: reviewsPath(valid.week.slice(0, 4)) });
  });
}

/** Device-local settings: never synced, never exported. */
export interface LocalSettings {
  lang: 'uk' | 'en';
  theme: 'system' | 'light' | 'dark';
  repo?: string; // "owner/name" of the PRIVATE data repo
  token?: string; // fine-grained PAT, only ever sent to api.github.com
  prefix?: string; // folder inside the data repo ('' for the first user, 'users/<id>/' for others)
  installHintSeen?: boolean;
  lastSyncAt?: string;
  sound?: boolean; // interface sounds; on unless turned off
}

const DEFAULT_SETTINGS: LocalSettings = { lang: 'uk', theme: 'system' };

export async function getSettings(d = db): Promise<LocalSettings> {
  const row = await d.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<LocalSettings> | undefined) };
}

export async function patchSettings(patch: Partial<LocalSettings>, d = db): Promise<LocalSettings> {
  const next = { ...(await getSettings(d)), ...patch };
  await d.kv.put({ key: 'settings', value: next });
  return next;
}
