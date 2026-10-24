import { useState } from 'preact/hooks';
import type { DomainConfig, DomainEntry, DateKey } from '../model/types';
import { DEFAULT_TAGS, PALETTES } from '../model/defaults';
import { useLang, useT, locale, type Lang } from '../i18n/t';
import { fromDateKey } from '../lib/dates';
import { AddChip, BloomRating, Button, Chip, Icon, IconButton, Illustration, Sheet, TextField, domainVars, moodVars } from './ui';

export const domainLabel = (d: DomainConfig, lang: Lang) => (lang === 'en' ? d.labelEn : d.labelUk);
/** Built-in palettes have prompts and illustrations; custom domains fall back gracefully. */
const palette = (d: DomainConfig) => (PALETTES.includes(d.color) ? d.color : 'mood');
const iconOf = (d: DomainConfig) => (d.icon.startsWith('d-') ? d.icon : `d-${palette(d)}`);

export function DomainChip({ domain, size = 'md' }: { domain: DomainConfig; size?: 'md' | 'lg' | 'sm' }) {
  return (
    <span class={'sf-dchip' + (size !== 'md' ? ' sf-dchip--' + size : '')} style={domainVars(palette(domain))}>
      <Icon name={iconOf(domain)} size={size === 'sm' ? 20 : 22} />
    </span>
  );
}

/** Domain card: icon, label, bloom + number, "що було добре". Opens the domain sheet. */
export function DomainCard({ domain, entry, onOpen }: { domain: DomainConfig; entry?: DomainEntry; onOpen: () => void }) {
  const t = useT();
  const lang = useLang();
  const score = entry?.score;
  const good = entry?.good;
  const name = domainLabel(domain, lang);
  return (
    <button
      type="button" class="sf-dcard" style={domainVars(palette(domain))} onClick={onOpen}
      aria-label={`${name}: ${score ? `${score} — ${t('score.' + score)}` : t('common.notLogged')}${good ? '. ' + good : ''}`}
    >
      <span class="sf-dcard__top">
        <span class="sf-dchip"><Icon name={iconOf(domain)} size={22} /></span>
        <span class={'sf-dcard__score' + (score ? '' : ' is-empty')}>
          <Icon name={'bloom-' + (score ?? 0)} size={30} />
          {score && <span>{score}</span>}
        </span>
      </span>
      <span class="sf-dcard__label">{name}</span>
      <span class={'sf-dcard__good' + (good ? '' : ' is-empty')}>{good || (score ? t('card.addGood') : t('card.empty'))}</span>
    </button>
  );
}

/** Bottom sheet for one domain: illustration, bloom rating, "що було добре", tags. */
export function DomainSheet({ domain, entry, onChange, onClose }: {
  domain: DomainConfig; entry?: DomainEntry; onChange: (e: DomainEntry | undefined) => void; onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = palette(domain);
  const [e, setE] = useState<DomainEntry>(entry ?? {});
  const set = (next: DomainEntry) => { setE(next); onChange(next); };
  const tags = e.tags ?? [];
  const suggestions = [...new Set([...(DEFAULT_TAGS[domain.id]?.[lang] ?? []), ...tags])];
  const toggle = (x: string) => set({ ...e, tags: tags.includes(x) ? tags.filter((y) => y !== x) : [...tags, x] });
  const prompt = t('prompt.' + domain.id);
  const name = domainLabel(domain, lang);
  return (
    <Sheet onClose={onClose} labelledBy="sheet-title" style={domainVars(p)}>
      <div class="sf-sheet__art"><Illustration name={p} width={200} height={150} /></div>
      <div class="sf-sheet__head">
        <DomainChip domain={domain} size="lg" />
        <div style="flex:1;display:grid;gap:2px">
          <h2 class="sf-h2" id="sheet-title" style="line-height:1.2">{name}</h2>
          <span class="sf-meta" style="line-height:1.3">{prompt.startsWith('prompt.') ? t('good.label') : prompt}</span>
        </div>
        <IconButton icon="close" label={t('common.close')} tone="sunk" size={22} onClick={onClose} />
      </div>
      <BloomRating palette={p} label={name} value={e.score} onChange={(score) => set({ ...e, score })} />
      <TextField id="good" label={t('good.label')} placeholder={t('good.placeholder')} value={e.good} maxLength={500} onInput={(good) => set({ ...e, good })} />
      <div class="sf-chips" role="group" aria-label={t('tags.label')}>
        {suggestions.map((x) => <Chip palette={p} selected={tags.includes(x)} onClick={() => toggle(x)}>{x}</Chip>)}
        <AddChip onAdd={(x) => !tags.includes(x) && set({ ...e, tags: [...tags, x] })} />
      </div>
      <div class="sf-sheet__actions">
        <Button block onClick={onClose}>{t('common.done')}</Button>
        <Button variant="ghost" onClick={() => { onChange(undefined); onClose(); }}>{t('common.skipDomain')}</Button>
      </div>
    </Sheet>
  );
}

/** Last 7 days as mood dots (face inside, so colour is never the only signal). */
export function DateStrip({ days, selected, today, onSelect }: {
  days: { date: DateKey; mood?: number }[]; selected: DateKey; today: DateKey; onSelect: (d: DateKey) => void;
}) {
  const t = useT();
  const loc = locale(useLang());
  return (
    <div class="sf-days">
      {days.map((d) => {
        const dt = fromDateKey(d.date);
        const wd = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(dt);
        const full = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(dt);
        return (
          <button
            type="button" class={'sf-day sf-press' + (d.date === selected ? ' is-on' : '')}
            aria-current={d.date === today ? 'date' : undefined} aria-pressed={d.date === selected}
            aria-label={`${full}${d.date === today ? ', ' + t('common.today') : ''}: ${d.mood ? t('mood.' + d.mood) : t('common.noEntry')}`}
            onClick={() => onSelect(d.date)}
          >
            <span class="sf-day__wd">{wd}</span>
            <span class="sf-day__n">{dt.getDate()}</span>
            <span class={'sf-day__dot' + (d.mood ? ' has-mood' : '')} style={moodVars(d.mood)}>
              <Icon name={d.mood ? 'mood-' + d.mood : 'bloom-0'} size={22} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Month calendar tinted by mood; face glyph keeps it readable without colour. Monday-first. */
export function MonthCalendar({ cells, moods, today, selected, onSelect }: {
  cells: (DateKey | null)[]; moods: Record<DateKey, number>; today: DateKey; selected?: DateKey; onSelect: (d: DateKey) => void;
}) {
  const loc = locale(useLang());
  const wds = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(new Date(2026, 9, 19 + i)));
  return (
    <div class="sf-cal">
      {wds.map((w) => <span class="sf-cal__wd" aria-hidden="true">{w}</span>)}
      {cells.map((k) => {
        if (!k) return <span />;
        const m = moods[k];
        const future = k > today;
        const cls = ['sf-cal__d', k === selected ? 'is-on' : k === today ? 'is-today' : !m && !future ? 'is-gap' : ''].join(' ');
        return (
          <button
            type="button" class={cls} disabled={future} style={moodVars(m)} onClick={() => onSelect(k)}
            aria-pressed={k === selected}
            aria-label={new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(fromDateKey(k)) + (m ? `: ${m}` : '')}
          >
            <span>{fromDateKey(k).getDate()}</span>
            {m && <Icon name={'mood-' + m} size={16} />}
          </button>
        );
      })}
    </div>
  );
}
