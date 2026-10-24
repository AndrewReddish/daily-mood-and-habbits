import { getSettings, patchSettings, switchDb } from './db';
import { initSync, pushNow } from './sync';
import { DEFAULT_PROFILE_ID, dbNameFor, getActiveId, setActiveId, syncPrefixFor } from './profiles';

/**
 * New users reuse the first user's data repo and token, in their own folder.
 * Runs on every open of a profile, so profiles restored from profiles.json get sync too.
 */
async function inheritSync(id: string): Promise<void> {
  if (id === DEFAULT_PROFILE_ID) return;
  const own = await getSettings();
  if (own.repo && own.token) return;
  const main = await getSettings(switchDb(dbNameFor(DEFAULT_PROFILE_ID)));
  switchDb(dbNameFor(id));
  if (main.repo && main.token) {
    await patchSettings({ repo: main.repo, token: main.token, prefix: syncPrefixFor(id), lang: main.lang, theme: main.theme });
  }
}

/** Open the active profile's database on app start. */
export async function openActiveProfile(): Promise<string> {
  const id = await getActiveId();
  switchDb(dbNameFor(id));
  await inheritSync(id);
  return id;
}

/** Finish pending pushes for the current user, then open another one. */
export async function switchProfile(id: string): Promise<void> {
  await pushNow();
  switchDb(dbNameFor(id));
  await setActiveId(id);
  await inheritSync(id);
  await initSync();
}
