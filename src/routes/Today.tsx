import { useEffect, useState } from 'preact/hooks';
import type { DateKey, DomainEntry } from '../model/types';
import { useLang, useT, locale } from '../i18n/t';
import { addDays, capFirst, fromDateKey, todayKey } from '../lib/dates';
import { useDay } from '../lib/useDay';
import { useConfig } from '../lib/useConfig';
import { useOnline } from '../lib/useOnline';
import { go } from '../lib/router';
import { db } from '../storage/db';
import { Button, Icon, Illustration, MoodPicker, Sheet, TabBar } from '../components/ui';
import { DateStrip, DomainCard, DomainSheet } from '../components/domain';

function greetingKey(h: number) {
  if (h >= 5 && h < 12) return 'today.greeting.morning';
  if (h >= 12 && h < 17) return 'today.greeting.day';
  if (h >= 17 && h < 23) return 'today.greeting';
  return 'today.greeting.night';
}

export function Today({ date: dateParam }: { date?: DateKey }) {
  const t = useT();
  const lang = useLang();
  const today = todayKey();
  const date = dateParam && dateParam <= today ? dateParam : today;
  const { draft, update, flush } = useDay(date);
  const { active } = useConfig();
  const online = useOnline();
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [strip, setStrip] = useState<{ date: DateKey; mood?: number }[]>([]);
  const [gap, setGap] = useState(false);

  useEffect(() => {
    const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    void db.entries.bulkGet(keys).then((rows) => {
      setStrip(keys.map((k, i) => ({ date: k, mood: k === date ? draft.mood : rows[i]?.mood })));
    });
    void db.entries.orderBy('date').last().then((last) => setGap(!!last && last.date < addDays(today, -1)));
  }, [today, date, draft.mood]);

  const dt = fromDateKey(date);
  const dateLine = capFirst(new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(dt));
  const isToday = date === today;
  const domains = draft.domains ?? {};
  const filled = active.filter((d) => domains[d.id]?.score !== undefined || domains[d.id]?.good).length;
  const openDomain = active.find((d) => d.id === open);

  const setDomain = (id: string, e: DomainEntry | undefined) =>
    update((d) => {
      const next = { ...(d.domains ?? {}) };
      if (e) next[id] = e;
      else delete next[id];
      return { ...d, domains: next };
    });

  const save = async () => {
    await flush();
    setSaved(true);
  };

  return (
    <>
      <main class="screen screen--today">
        <header class="screen__head">
          <div class="screen__sub">{dateLine}</div>
          <h1 class="sf-title">{isToday ? t(greetingKey(new Date().getHours())) : t('today.past', { date: new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long' }).format(dt) })}</h1>
        </header>

        {!online && (
          <div class="sf-banner" role="status"><Icon name="offline" /><span>{t('offline')}</span></div>
        )}
        {isToday && gap && !draft.mood && (
          <div class="sf-banner"><Icon name="sun" /><span>{t('missed')}</span></div>
        )}

        <DateStrip days={strip} today={today} selected={date} onSelect={(d) => go(d === today ? 'today' : 'day/' + d)} />
        {!isToday && <Button variant="ghost" icon="chevron-left" onClick={() => go('today')}>{t('today.backToToday')}</Button>}

        <MoodPicker value={draft.mood} onChange={(mood) => update({ mood })} />

        <div class="screen__row">
          <h2 class="sf-h2">{t('today.domains')}</h2>
          <span class="sf-meta">{t('today.domains.count', { n: filled, total: active.length })}</span>
        </div>
        <div class="sf-grid2">
          {active.map((d) => <DomainCard domain={d} entry={domains[d.id]} onOpen={() => setOpen(d.id)} />)}
        </div>

        <button
          type="button" class="sf-card more-card sf-press" disabled={!draft.mood}
          onClick={async () => { await flush(); go(`checkin/${date}/3`); }}
        >
          <span class="sf-dchip" style="background:var(--accent-soft);color:var(--accent-ink)"><Icon name="pen" size={22} /></span>
          <span style="flex:1;display:grid;gap:2px">
            <span class="sf-label">{t('today.more')}</span>
            <span class="sf-meta">{draft.mood ? t('today.more.hint') : t('today.more.needMood')}</span>
          </span>
          <Icon name="chevron-right" size={20} class="sf-row__chev" />
        </button>
      </main>

      <div class="save-bar">
        <Button block icon="check" disabled={!draft.mood} onClick={save}>{t('today.save')}</Button>
      </div>
      <TabBar active="today" />

      {openDomain && (
        <DomainSheet
          domain={openDomain} entry={domains[openDomain.id]}
          onChange={(e) => setDomain(openDomain.id, e)} onClose={() => setOpen(null)}
        />
      )}
      {saved && (
        <Sheet onClose={() => setSaved(false)} labelledBy="saved-title">
          <div class="sf-saved" role="status">
            <Illustration name="day-saved" width={200} height={150} />
            <p class="sf-h2" id="saved-title">{t('today.saved')}</p>
          </div>
          <Button block onClick={() => setSaved(false)}>{t('common.done')}</Button>
        </Sheet>
      )}
    </>
  );
}
