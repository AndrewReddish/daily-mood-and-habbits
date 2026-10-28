import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { DateKey, DayEntry, DomainConfig } from '../model/types';
import { useLang, useT, locale } from '../i18n/t';
import { addDays, capFirst, fromDateKey, weekdayIndex } from '../lib/dates';
import { PALETTES } from '../model/defaults';
import { byWeekday, domainScore, mean, round1, type Num } from '../analytics/metrics';
import { domainLabel } from './domain';
import { Icon, domainVars } from './ui';

const pal = (d: DomainConfig) => (PALETTES.includes(d.color) ? d.color : 'mood');
const iconOf = (d: DomainConfig) => (d.icon.startsWith('d-') ? d.icon : `d-${pal(d)}`);

/** Card shell; `locked` shows the low-data state instead of the chart. */
export function ChartCard({ title, hint, locked, children }: { title: string; hint?: string; locked?: string; children?: ComponentChildren }) {
  return (
    <section class="sf-card sf-chart">
      <div class="sf-chart__head">
        <h2 class="sf-label">{title}</h2>
        {hint && <p class="sf-meta">{hint}</p>}
      </div>
      {locked ? <p class="sf-chart__locked"><Icon name="bloom-1" size={22} />{locked}</p> : children}
    </section>
  );
}

/** GitHub-style year view: one cell per day, Monday-first rows. Tap a cell to read it. */
export function CalendarHeat({ map, domain, domains, today, weeks = 17 }: {
  map: Map<DateKey, DayEntry>; domain?: string; domains: DomainConfig[]; today: DateKey; weeks?: number;
}) {
  const t = useT();
  const loc = locale(useLang());
  const [picked, setPicked] = useState<DateKey | null>(null);
  const start = addDays(today, -(weeks - 1) * 7 - weekdayIndex(today));
  const d = domains.find((x) => x.id === domain);
  const valueOf = (k: DateKey): Num => (!d ? map.get(k)?.mood : domainScore(map.get(k), d.id));
  const fill = (v: number) =>
    !d ? `background:var(--mood-${v})` : `background:var(--d-${pal(d!)});opacity:${0.25 + v * 0.15}`;
  const wds = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: 'narrow' }).format(new Date(2026, 9, 19 + i)));
  const pv = picked ? valueOf(picked) : undefined;
  return (
    <div class="sf-calheat">
      <div class="sf-calheat__grid" style={`grid-template-columns: 14px repeat(${weeks}, minmax(0, 1fr))`}>
        {Array.from({ length: 7 }, (_, row) => (
          <>
            <span class="sf-calheat__wd" aria-hidden="true">{row % 2 === 0 ? wds[row] : ''}</span>
            {Array.from({ length: weeks }, (_, col) => {
              const k = addDays(start, col * 7 + row);
              if (k > today) return <span />;
              const v = valueOf(k);
              return (
                <button type="button" class={'sf-calheat__c' + (v === undefined ? ' is-gap' : '') + (k === picked ? ' is-on' : '')}
                  style={v !== undefined ? fill(v) : ''} onClick={() => setPicked(k === picked ? null : k)}
                  aria-label={`${new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(fromDateKey(k))}: ${v ?? t('common.noEntry')}`} />
              );
            })}
          </>
        ))}
      </div>
      <p class="sf-meta sf-calheat__read" aria-live="polite">
        {picked
          ? `${capFirst(new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(fromDateKey(picked)))} · ${
              pv === undefined ? t('common.noEntry') : `${pv} · ${t('score.' + pv)}`}`
          : t('chart.calendar.tap')}
      </p>
    </div>
  );
}

/** Domain × day grid, the same look as the Sunday-review heatmap. Numbers in week view. */
export function DomainHeat({ map, domains, days }: { map: Map<DateKey, DayEntry>; domains: DomainConfig[]; days: DateKey[] }) {
  const lang = useLang();
  const loc = locale(lang);
  const compact = days.length > 7;
  const cols = `grid-template-columns: ${compact ? '36px' : '112px'} repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div class={'sf-dheat' + (compact ? ' is-compact' : '')}>
      <div class="sf-dheat__row" style={cols} aria-hidden="true">
        <span />
        {days.map((k, i) => (
          <span class="sf-dheat__wd">
            {compact ? (i % 7 === 0 ? fromDateKey(k).getDate() : '') : new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(fromDateKey(k))}
          </span>
        ))}
      </div>
      {domains.map((d) => (
        <div class="sf-dheat__row" style={`${cols};${domainVars(pal(d))}`}>
          <span class="sf-dheat__label"><Icon name={iconOf(d)} size={18} />{!compact && domainLabel(d, lang)}</span>
          {days.map((k) => {
            const v = domainScore(map.get(k), d.id);
            return (
              <span class={'sf-dheat__c' + (v === undefined ? ' is-gap' : v >= 4 ? ' is-high' : '')}
                aria-label={`${domainLabel(d, lang)}, ${new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(fromDateKey(k))}: ${v ?? '—'}`}>
                {!compact && v}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Wheel of life: average score per domain, last 7 days (filled) vs the 7 before (dashed). */
export function Radar({ domains, now, before }: { domains: DomainConfig[]; now: Num[]; before: Num[] }) {
  const t = useT();
  const lang = useLang();
  const size = 300, c = size / 2, R = 104;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / domains.length;
    const r = (R * v) / 5;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const poly = (vals: Num[]) =>
    vals.flatMap((v, i) => (v === undefined ? [] : [pt(i, v).map((x) => x.toFixed(1)).join(',')])).join(' ');
  return (
    <div class="sf-radar">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t('chart.radar')}>
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon class="sf-radar__ring" points={domains.map((_, i) => pt(i, ring).join(',')).join(' ')} />
        ))}
        {domains.map((_, i) => { const [x, y] = pt(i, 5); return <line class="sf-radar__axis" x1={c} y1={c} x2={x} y2={y} />; })}
        <polygon class="sf-radar__before" points={poly(before)} />
        <polygon class="sf-radar__now" points={poly(now)} />
        {now.map((v, i) => { if (v === undefined) return null; const [x, y] = pt(i, v); return <circle class="sf-radar__dot" cx={x} cy={y} r="3.5" />; })}
        {domains.map((d, i) => {
          const [x, y] = pt(i, 6.1);
          return (
            <g style={domainVars(pal(d))} transform={`translate(${x - 11} ${y - 11})`}>
              <title>{domainLabel(d, lang)}</title>
              <use href={`${import.meta.env.BASE_URL}icons.svg#${iconOf(d)}`} width="22" height="22" class="sf-radar__icon" />
            </g>
          );
        })}
      </svg>
      <div class="sf-legend">
        <span class="sf-legend__line sf-legend__line--now" />{t('chart.thisWeek')}
        <span class="sf-legend__line sf-legend__line--before" />{t('chart.lastWeek')}
      </div>
      <table class="sf-vh">
        <tbody>{domains.map((d, i) => <tr><th>{domainLabel(d, lang)}</th><td>{now[i] !== undefined ? round1(now[i]!) : '—'}</td><td>{before[i] !== undefined ? round1(before[i]!) : '—'}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export interface Series { label: string; color: string; raw: Num[]; avg: Num[] }

/** Daily dots + 7-day average line for one or more series on a shared scale. */
export function Trend({ days, series, min, max }: { days: DateKey[]; series: Series[]; min: number; max: number }) {
  const loc = locale(useLang());
  const W = 320, H = 150, L = 22, Rt = 6, T = 8, B = 22;
  const x = (i: number) => L + ((W - L - Rt) * i) / Math.max(1, days.length - 1);
  const y = (v: number) => T + ((H - T - B) * (max - v)) / (max - min);
  const path = (vals: Num[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === undefined) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const ticks = max === 5 ? [1, 3, 5] : [0, 5, 10];
  const fmt = (k: DateKey) => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(fromDateKey(k));
  return (
    <div class="sf-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.label).join(', ')}>
        {ticks.map((v) => (
          <>
            <line class="sf-trend__grid" x1={L} x2={W - Rt} y1={y(v)} y2={y(v)} />
            <text class="sf-trend__tick" x={L - 6} y={y(v) + 4} text-anchor="end">{v}</text>
          </>
        ))}
        {series.map((s) => (
          <g style={`--s:${s.color}`}>
            {s.raw.map((v, i) => (v === undefined ? null : <circle class="sf-trend__dot" cx={x(i)} cy={y(v)} r="2.6" />))}
            <path class="sf-trend__line" d={path(s.avg)} />
          </g>
        ))}
        <text class="sf-trend__tick" x={L} y={H - 4}>{fmt(days[0])}</text>
        <text class="sf-trend__tick" x={W - Rt} y={H - 4} text-anchor="end">{fmt(days[days.length - 1])}</text>
      </svg>
      {series.length > 1 && (
        <div class="sf-legend">
          {series.map((s) => <><span class="sf-legend__line" style={`background:${s.color}`} />{s.label}</>)}
        </div>
      )}
    </div>
  );
}

/** Average per weekday: mood on top, then each domain. Blank where there's not enough data. */
export function WeekdayHeat({ entries, domains }: { entries: DayEntry[]; domains: DomainConfig[] }) {
  const t = useT();
  const lang = useLang();
  const loc = locale(lang);
  const cols = 'grid-template-columns: 112px repeat(7, minmax(0, 1fr))';
  const rows: { label: string; icon: string; palette?: string; cells: { avg: Num; n: number }[]; mood?: boolean }[] = [
    { label: t('chart.moodRow'), icon: 'mood-3', cells: byWeekday(entries, (e) => e.mood), mood: true },
    ...domains.map((d) => ({ label: domainLabel(d, lang), icon: iconOf(d), palette: pal(d), cells: byWeekday(entries, (e) => domainScore(e, d.id)) })),
  ];
  return (
    <div class="sf-dheat">
      <div class="sf-dheat__row" style={cols} aria-hidden="true">
        <span />
        {Array.from({ length: 7 }, (_, i) => <span class="sf-dheat__wd">{new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(new Date(2026, 9, 19 + i))}</span>)}
      </div>
      {rows.map((r) => (
        <div class="sf-dheat__row" style={`${cols};${r.palette ? domainVars(r.palette) : '--c:var(--accent);--c-soft:var(--accent-soft);--c-ink:var(--accent-ink)'}`}>
          <span class="sf-dheat__label"><Icon name={r.icon} size={18} />{r.label}</span>
          {r.cells.map((c) => {
            const v = c.n >= 2 && c.avg !== undefined ? round1(c.avg) : undefined;
            return <span class={'sf-dheat__c sf-dheat__c--avg' + (v === undefined ? ' is-gap' : v >= 4 ? ' is-high' : '')}>{v?.toFixed(1)}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

/** Most-used tags and the average mood on those days. */
export function TagBars({ stats }: { stats: { tag: string; n: number; mood: number }[] }) {
  const t = useT();
  const top = stats.slice(0, 8);
  const maxN = Math.max(...top.map((s) => s.n), 1);
  return (
    <ul class="sf-tags">
      {top.map((s) => (
        <li>
          <span class="sf-tags__name">{s.tag}</span>
          <span class="sf-tags__bar"><span style={`width:${(s.n / maxN) * 100}%`} /></span>
          <span class="sf-tags__val">{t('chart.tagDays', { n: s.n })} · <Icon name={'mood-' + Math.round(s.mood)} size={16} /> {s.mood.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}

export const avgOver = (map: Map<DateKey, DayEntry>, days: DateKey[], id: string) => mean(days.map((k) => domainScore(map.get(k), id)));
