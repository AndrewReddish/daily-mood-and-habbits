import type { z } from 'zod';
import type { Config, DayEntry, WeeklyReview } from '../model/types';
import { ConfigSchema, MonthFileSchema, ReviewsFileSchema } from '../model/schema';
import { CONFIG_PATH, SpheresDB, db as defaultDb, getConfig, putConfig } from './db';
import { differs, mergeConfig, mergeEntries, mergeReviews } from './merge';
import { ProfilesFileSchema, mergeProfiles, type Profile } from './profiles';

/**
 * Sync with a PRIVATE GitHub repo through the Contents API.
 * Layout: entries/YYYY-MM.json, reviews/YYYY.json, config.json.
 * The token is only ever sent to api.github.com and never logged.
 */
const API = 'https://api.github.com';

export interface SyncTarget {
  repo: string; // owner/name
  token: string;
  /** Folder inside the repo, e.g. 'users/olena-x1/'. Empty = repo root. */
  prefix?: string;
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

interface RemoteFile<T> {
  data: T;
  sha: string;
}

function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export class GitHubClient {
  constructor(
    private target: SyncTarget,
    private fetchImpl: Fetch = (...a) => fetch(...a),
  ) {}

  private get prefix(): string {
    return this.target.prefix ?? '';
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.fetchImpl(`${API}/repos/${this.target.repo}/contents/${this.prefix}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.target.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    return res;
  }

  async list(dir: string): Promise<string[]> {
    const res = await this.req(dir);
    if (res.status === 404) return [];
    if (!res.ok) throw new SyncError(`list ${dir}`, res.status);
    const items = (await res.json()) as { name: string; type: string; path: string }[];
    // Paths come back repo-absolute; return them relative to our folder.
    return items
      .filter((i) => i.type === 'file' && i.name.endsWith('.json'))
      .map((i) => (i.path.startsWith(this.prefix) ? i.path.slice(this.prefix.length) : i.path));
  }

  async get<S extends z.ZodTypeAny>(path: string, schema: S): Promise<RemoteFile<z.infer<S>> | undefined> {
    const res = await this.req(path);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new SyncError(`get ${path}`, res.status);
    const body = (await res.json()) as { content: string; sha: string };
    const data = schema.parse(JSON.parse(b64decode(body.content)));
    return { data, sha: body.sha };
  }

  async put(path: string, data: unknown, sha: string | undefined, message: string): Promise<string> {
    const res = await this.req(path, {
      method: 'PUT',
      body: JSON.stringify({ message, content: b64encode(JSON.stringify(data, null, 2) + '\n'), sha }),
    });
    if (!res.ok) throw new SyncError(`put ${path}`, res.status);
    const body = (await res.json()) as { content: { sha: string } };
    return body.content.sha;
  }

  /** Checks the token can read the repo. */
  async ping(): Promise<void> {
    const res = await this.fetchImpl(`${API}/repos/${this.target.repo}`, {
      headers: { Authorization: `Bearer ${this.target.token}`, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new SyncError('ping', res.status);
  }
}

const sortKeys = <T>(m: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));

/** Pull one month file, merge with local, write back whichever side is behind. */
async function syncMonthFile(gh: GitHubClient, db: SpheresDB, path: string, attempt = 0): Promise<void> {
  const month = path.slice('entries/'.length, -'.json'.length);
  const remote = await gh.get(path, MonthFileSchema);
  const localRows = await db.entries.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray();
  const local: Record<string, DayEntry> = Object.fromEntries(localRows.map((e) => [e.date, e]));
  const merged = mergeEntries(local, remote?.data ?? {});

  const toLocal = Object.values(merged).filter((e) => local[e.date]?.updatedAt !== e.updatedAt);
  if (toLocal.length) await db.entries.bulkPut(toLocal);

  if (!remote || differs(merged, remote.data)) {
    try {
      await gh.put(path, sortKeys(merged), remote?.sha, `entries ${month}`);
    } catch (e) {
      // 409/422: someone else wrote in between — re-pull and merge once more.
      if (e instanceof SyncError && (e.status === 409 || e.status === 422) && attempt < 2) {
        return syncMonthFile(gh, db, path, attempt + 1);
      }
      throw e;
    }
  }
}

async function syncReviewsFile(gh: GitHubClient, db: SpheresDB, path: string, attempt = 0): Promise<void> {
  const year = path.slice('reviews/'.length, -'.json'.length);
  const remote = await gh.get(path, ReviewsFileSchema);
  const localRows = await db.reviews.where('week').startsWith(`${year}-W`).toArray();
  const local: Record<string, WeeklyReview> = Object.fromEntries(localRows.map((r) => [r.week, r]));
  const merged = mergeReviews(local, remote?.data ?? {});
  const toLocal = Object.values(merged).filter((r) => local[r.week]?.updatedAt !== r.updatedAt);
  if (toLocal.length) await db.reviews.bulkPut(toLocal);
  if (!remote || differs(merged, remote.data)) {
    try {
      await gh.put(path, sortKeys(merged), remote?.sha, `reviews ${year}`);
    } catch (e) {
      if (e instanceof SyncError && (e.status === 409 || e.status === 422) && attempt < 2) {
        return syncReviewsFile(gh, db, path, attempt + 1);
      }
      throw e;
    }
  }
}

async function syncConfig(gh: GitHubClient, db: SpheresDB, pushIfNeeded: boolean): Promise<void> {
  const remote = await gh.get(CONFIG_PATH, ConfigSchema);
  const local = await getConfig(db);
  const merged: Config = mergeConfig(local, remote?.data);
  if (merged !== local) await putConfig(merged, { markDirty: false }, db);
  if (pushIfNeeded && (!remote || merged.updatedAt !== remote.data.updatedAt)) {
    await gh.put(CONFIG_PATH, merged, remote?.sha, 'config');
  }
}

/** Full pull on app open: every remote file plus anything dirty locally. */
export async function pullAll(target: SyncTarget, db = defaultDb, fetchImpl?: Fetch): Promise<void> {
  const gh = new GitHubClient(target, fetchImpl);
  const dirty = new Set((await db.dirty.toArray()).map((d) => d.path));
  await syncConfig(gh, db, dirty.has(CONFIG_PATH));

  const remoteEntries = await gh.list('entries');
  const remoteReviews = await gh.list('reviews');
  const paths = new Set([...remoteEntries, ...remoteReviews, ...dirty]);
  paths.delete(CONFIG_PATH);
  for (const p of [...paths].sort()) {
    if (p.startsWith('entries/')) await syncMonthFile(gh, db, p);
    else if (p.startsWith('reviews/')) await syncReviewsFile(gh, db, p);
  }
  await db.dirty.clear();
}

/** Push only what changed locally (called ~3 s after the last edit). */
export async function pushDirty(target: SyncTarget, db = defaultDb, fetchImpl?: Fetch): Promise<void> {
  const gh = new GitHubClient(target, fetchImpl);
  const dirty = await db.dirty.toArray();
  for (const { path } of dirty) {
    if (path === CONFIG_PATH) await syncConfig(gh, db, true);
    else if (path.startsWith('entries/')) await syncMonthFile(gh, db, path);
    else if (path.startsWith('reviews/')) await syncReviewsFile(gh, db, path);
    await db.dirty.delete(path);
  }
}

/**
 * `profiles.json` at the data-repo root lists every user, so a fresh install of the
 * first user's profile can bring the others back. Returns the merged list.
 */
export async function syncProfilesFile(
  target: SyncTarget,
  local: Profile[],
  fetchImpl?: Fetch,
  attempt = 0,
): Promise<Profile[]> {
  const gh = new GitHubClient({ ...target, prefix: '' }, fetchImpl);
  const remote = await gh.get('profiles.json', ProfilesFileSchema);
  const merged = mergeProfiles(local, remote?.data.profiles ?? []);
  const key = (ps: Profile[]) => JSON.stringify([...ps].sort((a, b) => a.id.localeCompare(b.id)).map((p) => [p.id, p.updatedAt]));
  if (!remote || key(merged) !== key(remote.data.profiles)) {
    try {
      await gh.put('profiles.json', { profiles: [...merged].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }, remote?.sha, 'profiles');
    } catch (e) {
      if (e instanceof SyncError && (e.status === 409 || e.status === 422) && attempt < 2) {
        return syncProfilesFile(target, merged, fetchImpl, attempt + 1);
      }
      throw e;
    }
  }
  return merged;
}
