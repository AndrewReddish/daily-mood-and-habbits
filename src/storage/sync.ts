import { db, getSettings, patchSettings } from './db';
import { pullAll, pushDirty, SyncError } from './sync-github';
import { nowIso } from '../lib/dates';

export type SyncStatus =
  | { state: 'off' }
  | { state: 'idle'; lastSyncAt?: string }
  | { state: 'syncing' }
  | { state: 'offline' }
  | { state: 'error'; message: string };

const PUSH_DELAY_MS = 3000;

let status: SyncStatus = { state: 'off' };
const listeners = new Set<(s: SyncStatus) => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;

function emit(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

export const getSyncStatus = () => status;
export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function describe(e: unknown): string {
  if (e instanceof SyncError) {
    if (e.status === 401) return 'token rejected (401)';
    if (e.status === 403) return 'no access (403)';
    if (e.status === 404) return 'repository not found (404)';
    return `${e.message} (${e.status ?? 'network'})`;
  }
  return e instanceof Error ? e.message : String(e);
}

async function run(kind: 'pull' | 'push'): Promise<void> {
  const s = await getSettings();
  if (!s.repo || !s.token) return emit({ state: 'off' });
  if (!navigator.onLine) return emit({ state: 'offline' });
  emit({ state: 'syncing' });
  try {
    const target = { repo: s.repo, token: s.token };
    if (kind === 'pull') await pullAll(target, db);
    else await pushDirty(target, db);
    const lastSyncAt = nowIso();
    await patchSettings({ lastSyncAt });
    emit({ state: 'idle', lastSyncAt });
    window.dispatchEvent(new CustomEvent('spheres:synced'));
  } catch (e) {
    emit({ state: 'error', message: describe(e) });
  }
}

/** Serialise runs so a pull and a push never overlap. */
function enqueue(kind: 'pull' | 'push'): Promise<void> {
  const next = (running ?? Promise.resolve()).then(() => run(kind));
  running = next.finally(() => {
    if (running === next) running = undefined;
  });
  return next;
}

export const syncNow = () => enqueue('pull');

/** Call after every local write: pushes ~3 s after the last edit. */
export function schedulePush(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void enqueue('push'), PUSH_DELAY_MS);
}

export async function initSync(): Promise<void> {
  const s = await getSettings();
  emit(s.repo && s.token ? { state: 'idle', lastSyncAt: s.lastSyncAt } : { state: 'off' });
  window.addEventListener('online', () => void enqueue('pull'));
  window.addEventListener('offline', () => emit({ state: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      void enqueue('push');
    }
  });
  void syncNow();
}
