import { beforeEach, describe, expect, it } from 'vitest';
import { SpheresDB, putEntry, getConfig, putConfig } from '../../src/storage/db';
import { pullAll, pushDirty } from '../../src/storage/sync-github';
import { defaultConfig } from '../../src/model/defaults';
import { entry } from './fixtures';

/** In-memory stand-in for the GitHub Contents API. */
function fakeGitHub() {
  const files = new Map<string, { content: string; sha: string }>();
  let n = 0;
  const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
  const unb64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    expect(u.startsWith('https://api.github.com/')).toBe(true);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const path = u.split('/contents/')[1];
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      const cur = files.get(path);
      if (cur && cur.sha !== body.sha) return new Response('{}', { status: 409 });
      const sha = `sha${++n}`;
      files.set(path, { content: body.content, sha });
      return new Response(JSON.stringify({ content: { sha } }), { status: 200 });
    }
    const dirFiles = [...files.keys()].filter((k) => k.startsWith(path + '/'));
    if (dirFiles.length) {
      return new Response(JSON.stringify(dirFiles.map((p) => ({ name: p.split('/').pop(), path: p, type: 'file' }))), { status: 200 });
    }
    const f = files.get(path);
    if (!f) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ content: f.content, sha: f.sha }), { status: 200 });
  };
  return {
    fetchImpl: fetchImpl as typeof fetch,
    read: (p: string) => JSON.parse(unb64(files.get(p)!.content)),
    write: (p: string, data: unknown) => files.set(p, { content: b64(JSON.stringify(data)), sha: `sha${++n}` }),
    paths: () => [...files.keys()].sort(),
  };
}

const target = { repo: 'me/spheres-data', token: 'tok' };
let i = 0;
const freshDb = () => new SpheresDB(`test-${++i}`);

describe('GitHub sync', () => {
  let gh: ReturnType<typeof fakeGitHub>;
  beforeEach(() => {
    gh = fakeGitHub();
  });

  it('pushes dirty months as one file per month, with Cyrillic intact', async () => {
    const db = freshDb();
    await putEntry(entry('2026-10-24', '2026-10-24T21:00:00+03:00', { highlight: 'Прогулянка в лісі' }), db);
    await putEntry(entry('2026-09-30', '2026-09-30T21:00:00+03:00'), db);
    await pushDirty(target, db, gh.fetchImpl);
    expect(gh.paths()).toEqual(['entries/2026-09.json', 'entries/2026-10.json']);
    expect(gh.read('entries/2026-10.json')['2026-10-24'].highlight).toBe('Прогулянка в лісі');
    expect(await db.dirty.count()).toBe(0);
  });

  it('a fresh install restores every entry from the data repo', async () => {
    const phone = freshDb();
    await putEntry(entry('2026-10-24', '2026-10-24T21:00:00+03:00', { mood: 5 }), phone);
    await putEntry(entry('2026-08-01', '2026-08-01T21:00:00+03:00', { mood: 2 }), phone);
    await pushDirty(target, phone, gh.fetchImpl);

    const reinstalled = freshDb();
    await pullAll(target, reinstalled, gh.fetchImpl);
    expect((await reinstalled.entries.get('2026-10-24'))?.mood).toBe(5);
    expect((await reinstalled.entries.get('2026-08-01'))?.mood).toBe(2);
  });

  it('merges per day: newer wins on both sides', async () => {
    gh.write('entries/2026-10.json', {
      '2026-10-23': entry('2026-10-23', '2026-10-23T22:00:00+03:00', { mood: 1 }),
      '2026-10-24': entry('2026-10-24', '2026-10-24T08:00:00+03:00', { mood: 1 }),
    });
    const db = freshDb();
    await putEntry(entry('2026-10-23', '2026-10-23T20:00:00+03:00', { mood: 5 }), db); // older than remote
    await putEntry(entry('2026-10-24', '2026-10-24T21:00:00+03:00', { mood: 5 }), db); // newer than remote
    await pullAll(target, db, gh.fetchImpl);

    expect((await db.entries.get('2026-10-23'))?.mood).toBe(1);
    expect((await db.entries.get('2026-10-24'))?.mood).toBe(5);
    const remote = gh.read('entries/2026-10.json');
    expect(remote['2026-10-23'].mood).toBe(1);
    expect(remote['2026-10-24'].mood).toBe(5);
  });

  it('syncs config.json; a default config never overwrites a remote one', async () => {
    const remoteConfig = { ...defaultConfig(), updatedAt: '2026-10-20T10:00:00+03:00' };
    remoteConfig.domains[0] = { ...remoteConfig.domains[0], labelUk: 'Відпочинок' };
    gh.write('config.json', remoteConfig);
    const db = freshDb();
    await pullAll(target, db, gh.fetchImpl);
    expect((await getConfig(db)).domains[0].labelUk).toBe('Відпочинок');

    const edited = { ...(await getConfig(db)), updatedAt: '2026-10-24T10:00:00+03:00' };
    edited.domains[1] = { ...edited.domains[1], active: false };
    await putConfig(edited, {}, db);
    await pushDirty(target, db, gh.fetchImpl);
    expect(gh.read('config.json').domains[1].active).toBe(false);
  });
});
