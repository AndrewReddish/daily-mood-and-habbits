import { useEffect, useRef, useState } from 'preact/hooks';
import type { DomainConfig } from '../model/types';
import { useLang, useT, locale, type Lang } from '../i18n/t';
import { useConfig } from '../lib/useConfig';
import { nowIso, todayKey } from '../lib/dates';
import { PALETTES } from '../model/defaults';
import { allEntries, db, getConfig, getSettings, patchSettings, putConfig, putEntry, putReview, type LocalSettings } from '../storage/db';
import { parseBackup, shareFile, toBackup, toCsv } from '../storage/export';
import { getSyncStatus, onSyncStatus, syncNow, type SyncStatus } from '../storage/sync';
import { GitHubClient } from '../storage/sync-github';
import { pickNewer } from '../storage/merge';
import { Button, Icon, IconButton, Segmented, Sheet, TabBar, TextField, Toggle } from '../components/ui';
import { DomainChip, domainLabel } from '../components/domain';
import { AddProfileForm, ProfileList } from '../components/profiles';
import { useProfiles } from '../lib/profile';
import { syncPrefixFor } from '../storage/profiles';

type Theme = LocalSettings['theme'];

export function Settings({ theme, setTheme, setLang, toast }: {
  theme: Theme; setTheme: (t: Theme) => void; setLang: (l: Lang) => void; toast: (msg: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const { domains, save } = useConfig();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [sheet, setSheet] = useState<'token' | 'domains' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { active, switchTo, rename } = useProfiles();

  useEffect(() => onSyncStatus(setStatus), []);
  useEffect(() => void getSettings().then(setSettings), [status, sheet]);

  const toggle = (d: DomainConfig, active: boolean) => void save(domains.map((x) => (x.id === d.id ? { ...x, active } : x)));
  const preview = domains.slice(0, 3);
  const time = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '');
  const syncLine =
    status.state === 'off' ? t('settings.notSynced')
    : status.state === 'syncing' ? t('settings.syncing')
    : status.state === 'offline' ? t('offline')
    : status.state === 'error' ? t('settings.syncError', { msg: status.message })
    : status.lastSyncAt ? t('settings.synced', { time: time(status.lastSyncAt) }) : t('settings.syncing');

  const exportCsv = async () => {
    const [entries, config] = await Promise.all([allEntries(), getConfig()]);
    await shareFile(`spheres-${todayKey()}.csv`, 'text/csv', toCsv(entries, config));
  };
  const exportJson = async () => {
    const [entries, config, reviews] = await Promise.all([allEntries(), getConfig(), db.reviews.toArray()]);
    await shareFile(`spheres-backup-${todayKey()}.json`, 'application/json', JSON.stringify(toBackup(config, entries, reviews, nowIso()), null, 2));
  };
  const restore = async (file: File) => {
    try {
      const b = parseBackup(await file.text());
      let n = 0;
      for (const e of b.entries) {
        const cur = await db.entries.get(e.date);
        if (pickNewer(cur, e) === e && cur?.updatedAt !== e.updatedAt) { await putEntry(e); n++; }
      }
      for (const r of b.reviews) {
        const cur = await db.reviews.get(r.week);
        if (pickNewer(cur, r) === r && cur?.updatedAt !== r.updatedAt) await putReview(r);
      }
      if (pickNewer(await getConfig(), b.config) === b.config) await putConfig(b.config);
      toast(t('settings.restore.done', { n }));
      void syncNow();
    } catch {
      toast(t('settings.restore.error'));
    }
  };

  return (
    <>
      <main class="screen" style="gap:8px">
        <h1 class="sf-title" style="padding-top:10px">{t('tab.settings')}</h1>

        <h2 class="sf-section">{t('profiles.section')}</h2>
        <ProfileList picked={active.id} onPick={switchTo} />
        <AddProfileForm />
        <div class="sf-field" style="padding-top:4px">
          <label class="sf-meta" for="profile-name" style="padding:0 4px">{t('profiles.rename')} · {active.name}</label>
          <input id="profile-name" class="sf-input sf-input--ui" style="background:var(--surface)" defaultValue={active.name} maxLength={40}
            onChange={(e) => void rename(active.id, (e.currentTarget as HTMLInputElement).value)} />
        </div>

        <h2 class="sf-section">{t('settings.domains')}</h2>
        <div class="sf-list">
          {preview.map((d) => (
            <div class="sf-row">
              <DomainChip domain={d} size="sm" />
              <span class="sf-row__title" style="flex:1">{domainLabel(d, lang)}</span>
              <Toggle checked={d.active} label={`${t('settings.domains.show')}: ${domainLabel(d, lang)}`} onChange={(v) => toggle(d, v)} />
            </div>
          ))}
          <button type="button" class="sf-row" onClick={() => setSheet('domains')}>
            <span style="width:34px;height:34px;display:grid;place-items:center;color:var(--accent-ink)"><Icon name="pen" size={22} /></span>
            <span class="sf-row__title sf-row__title--accent" style="flex:1">
              {domains.length > 3 ? t('settings.domains.more', { n: domains.length - 3 }) : t('settings.domains.edit')}
            </span>
            <Icon name="chevron-right" size={20} class="sf-row__chev" />
          </button>
        </div>

        <h2 class="sf-section">{t('settings.lookLang')}</h2>
        <div class="sf-list settings-group">
          <Segmented<Theme> label={t('settings.theme')} value={theme} onChange={setTheme} options={[
            { value: 'system', label: t('theme.system') }, { value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') },
          ]} />
          <Segmented<Lang> label={t('settings.language')} value={lang} onChange={setLang} options={[
            { value: 'uk', label: 'Українська' }, { value: 'en', label: 'English' },
          ]} />
        </div>

        <h2 class="sf-section">{t('settings.syncData')}</h2>
        <div class="sf-list">
          <button type="button" class="sf-row sf-row--tall" onClick={() => setSheet('token')}>
            <Icon name="key" size={22} />
            <span class="sf-row__main">
              <span class="sf-row__title">{t('settings.token')}</span>
              <span class="sf-row__sub">{status.state === 'idle' && <Icon name="check" size={14} />}{syncLine}</span>
            </span>
            <span class="sf-row__end">{settings?.token ? `•••• ${settings.token.slice(-4)}` : ''}</span>
          </button>
          <button type="button" class="sf-row" onClick={exportCsv}>
            <Icon name="download" size={22} /><span class="sf-row__title" style="flex:1">{t('settings.csv')}</span>
            <Icon name="chevron-right" size={20} class="sf-row__chev" />
          </button>
          <button type="button" class="sf-row" onClick={exportJson}>
            <Icon name="sync" size={22} /><span class="sf-row__title" style="flex:1">{t('settings.json')}</span>
            <Icon name="chevron-right" size={20} class="sf-row__chev" />
          </button>
          <button type="button" class="sf-row" onClick={() => fileRef.current?.click()}>
            <Icon name="history" size={22} /><span class="sf-row__title" style="flex:1">{t('settings.restore')}</span>
            <Icon name="chevron-right" size={20} class="sf-row__chev" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) void restore(f); (e.currentTarget as HTMLInputElement).value = ''; }} />
        </div>
        <p class="sf-meta" style="text-align:center;padding-top:12px">{t('settings.version', { v: __APP_VERSION__ })}</p>
      </main>
      <TabBar active="settings" />

      {sheet === 'token' && settings && <TokenSheet settings={settings} onClose={() => setSheet(null)} />}
      {sheet === 'domains' && <DomainsSheet domains={domains} save={save} onClose={() => setSheet(null)} />}
    </>
  );
}

function TokenSheet({ settings, onClose }: { settings: LocalSettings; onClose: () => void }) {
  const t = useT();
  const { active } = useProfiles();
  const [repo, setRepo] = useState(settings.repo ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const connected = !!(settings.repo && settings.token);

  const connect = async () => {
    setBusy(true);
    setErr('');
    const target = { repo: repo.trim(), token: token.trim() || settings.token || '', prefix: syncPrefixFor(active.id) };
    try {
      await new GitHubClient(target).ping();
      await patchSettings(target);
      void syncNow();
      onClose();
    } catch (e) {
      setErr(t('settings.syncError', { msg: (e as { status?: number }).status ? String((e as { status?: number }).status) : 'network' }));
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    await patchSettings({ token: undefined, repo: undefined, lastSyncAt: undefined });
    await syncNow();
    onClose();
  };

  return (
    <Sheet onClose={onClose} labelledBy="token-title">
      <div class="sf-sheet__head">
        <span class="sf-dchip sf-dchip--lg" style="background:var(--accent-soft);color:var(--accent-ink)"><Icon name="key" size={22} /></span>
        <h2 class="sf-h2" id="token-title" style="flex:1">{t('settings.token')}</h2>
        <IconButton icon="close" label={t('common.close')} tone="sunk" size={22} onClick={onClose} />
      </div>
      <TextField id="repo" ui label={t('settings.repo')} placeholder={t('settings.repo.placeholder')} value={repo} onInput={setRepo} />
      <TextField id="token" ui label={t('settings.token')} placeholder={connected ? `•••• ${settings.token!.slice(-4)}` : t('settings.token.placeholder')} value={token} onInput={setToken} />
      <p class="sf-meta">{t('settings.token.hint')}</p>
      <p class="sf-meta">{t('profiles.syncNote')}{syncPrefixFor(active.id) ? ` → ${syncPrefixFor(active.id)}` : ''}</p>
      {err && <div class="sf-banner" role="alert">{err}</div>}
      <div class="sf-sheet__actions">
        <Button block icon="sync" disabled={busy || !/^[\w.-]+\/[\w.-]+$/.test(repo.trim()) || !(token.trim() || settings.token)} onClick={connect}>
          {connected ? t('settings.syncNow') : t('settings.connect')}
        </Button>
        {connected && <Button variant="ghost" onClick={disconnect}>{t('settings.disconnect')}</Button>}
      </div>
    </Sheet>
  );
}

function DomainsSheet({ domains, save, onClose }: { domains: DomainConfig[]; save: (d: DomainConfig[]) => Promise<void>; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const [list, setList] = useState(domains);
  const [editing, setEditing] = useState<string | null>(null);
  const commit = (next: DomainConfig[]) => { setList(next); void save(next); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const add = () => {
    const id = `custom-${Date.now().toString(36)}`;
    const color = PALETTES[list.length % PALETTES.length];
    commit([...list, { id, labelUk: 'Нова сфера', labelEn: 'New domain', icon: `d-${color}`, color, order: list.length, active: true }]);
    setEditing(id);
  };

  return (
    <Sheet onClose={onClose} labelledBy="domains-title">
      <div class="sf-sheet__head">
        <h2 class="sf-h2" id="domains-title" style="flex:1">{t('settings.domains.title')}</h2>
        <IconButton icon="close" label={t('common.close')} tone="sunk" size={22} onClick={onClose} />
      </div>
      <div class="sf-list">
        {list.map((d, i) => (
          <div class="sf-row" style="flex-wrap:wrap;padding-block:4px">
            <DomainChip domain={d} size="sm" />
            <button type="button" class="sf-row__title" style="flex:1;border:0;background:none;text-align:left;min-height:44px;padding:0;cursor:pointer"
              onClick={() => setEditing(editing === d.id ? null : d.id)}>{domainLabel(d, lang)}</button>
            <IconButton icon="chevron-left" size={20} label={t('settings.domains.up')} style="transform:rotate(90deg)" disabled={i === 0} onClick={() => move(i, -1)} />
            <IconButton icon="chevron-right" size={20} label={t('settings.domains.down')} style="transform:rotate(90deg)" disabled={i === list.length - 1} onClick={() => move(i, 1)} />
            <Toggle checked={d.active} label={`${t('settings.domains.show')}: ${domainLabel(d, lang)}`}
              onChange={(active) => commit(list.map((x) => (x.id === d.id ? { ...x, active } : x)))} />
            {editing === d.id && (
              <div class="stack" style="width:100%;padding:8px 0 12px">
                <TextField id={`uk-${d.id}`} ui label={t('settings.domains.labelUk')} value={d.labelUk} maxLength={40}
                  onInput={(v) => v.trim() && commit(list.map((x) => (x.id === d.id ? { ...x, labelUk: v } : x)))} />
                <TextField id={`en-${d.id}`} ui label={t('settings.domains.labelEn')} value={d.labelEn} maxLength={40}
                  onInput={(v) => v.trim() && commit(list.map((x) => (x.id === d.id ? { ...x, labelEn: v } : x)))} />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button variant="secondary" icon="plus" onClick={add}>{t('settings.domains.add')}</Button>
      <Button block onClick={onClose}>{t('common.done')}</Button>
    </Sheet>
  );
}
