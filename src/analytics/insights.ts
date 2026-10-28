import type { DateKey, DayEntry, DomainConfig } from '../model/types';
import { addDays } from '../lib/dates';
import { byDate, byWeekday, dateRange, domainScore, mean, round1, spearman, tagStats } from './metrics';

/**
 * Insight rules from the plan (INSIGHTS spec, §6). Each insight states its sample size and describes
 * co-movement ("пов'язано з"), never cause. Text is rendered by the UI from `key` + `vars`.
 */
export interface Insight {
  key: string;
  vars: Record<string, string | number>;
  n: number;
  /** Domain id when the insight is about one domain (for colour). */
  domain?: string;
  tone: 'link' | 'nudge';
}

export const RULES = {
  corrWindowDays: 28,
  corrMinPairs: 14,
  corrMinRho: 0.3,
  neglectDays: 7,
  weekdayMinEntries: 3,
  tagMinUses: 5,
  tagMinLift: 0.5,
  careAnxiety: 8,
  careDays: 5,
  careWindow: 7,
};

export function computeInsights(entries: DayEntry[], domains: DomainConfig[], today: DateKey): Insight[] {
  const out: Insight[] = [];
  const map = byDate(entries);
  const window = dateRange(addDays(today, -(RULES.corrWindowDays - 1)), today);
  const day = (d: DateKey) => map.get(d);
  const moods = window.map((d) => day(d)?.mood);

  // Domain–mood link: Spearman over the last 28 days, ≥14 pairs, |ρ| ≥ 0.3.
  const links: Insight[] = [];
  for (const d of domains) {
    const scores = window.map((k) => domainScore(day(k), d.id));
    const r = spearman(scores, moods);
    if (!r || r.n < RULES.corrMinPairs || Math.abs(r.rho) < RULES.corrMinRho) continue;
    const high = mean(window.map((_, i) => ((scores[i] ?? 0) >= 4 ? moods[i] : undefined)));
    const low = mean(window.map((_, i) => (scores[i] !== undefined && scores[i]! < 4 ? moods[i] : undefined)));
    if (high === undefined || low === undefined) continue;
    const diff = round1(Math.abs(high - low));
    if (diff < 0.1) continue;
    links.push({
      key: high > low ? 'ins.domainUp' : 'ins.domainDown',
      vars: { domain: d.id, diff, n: r.n, rho: round1(r.rho) },
      n: r.n,
      domain: d.id,
      tone: 'link',
    });
  }
  links.sort((a, b) => Math.abs(+b.vars.rho) - Math.abs(+a.vars.rho));
  out.push(...links.slice(0, 3));

  // Inner-state links: anxiety vs life space, control vs mood.
  const pairs: [string, (e?: DayEntry) => number | undefined, (e?: DayEntry) => number | undefined][] = [
    ['ins.anxietyLife', (e) => e?.inner?.anxiety, (e) => e?.inner?.lifeSpace],
    ['ins.controlMood', (e) => e?.inner?.control, (e) => e?.mood],
  ];
  for (const [key, fa, fb] of pairs) {
    const r = spearman(window.map((k) => fa(day(k))), window.map((k) => fb(day(k))));
    if (!r || r.n < RULES.corrMinPairs || Math.abs(r.rho) < RULES.corrMinRho) continue;
    out.push({ key: key + (r.rho > 0 ? '.pos' : '.neg'), vars: { n: r.n, rho: round1(r.rho) }, n: r.n, tone: 'link' });
  }

  // Hard weekday: lowest average mood, only weekdays with ≥3 entries (and at least 4 such weekdays).
  const wd = byWeekday(entries, (e) => e.mood);
  const eligible = wd.map((w, i) => ({ ...w, i })).filter((w) => w.n >= RULES.weekdayMinEntries && w.avg !== undefined);
  if (eligible.length >= 4) {
    const worst = eligible.reduce((a, b) => (b.avg! < a.avg! ? b : a));
    const overall = mean(eligible.map((w) => w.avg));
    if (overall !== undefined && overall - worst.avg! >= 0.3) {
      out.push({ key: 'ins.hardWeekday', vars: { weekday: worst.i, avg: round1(worst.avg!), n: worst.n }, n: worst.n, tone: 'link' });
    }
  }

  // Helpful tags: ≥5 uses, days average 0.5+ higher mood than all logged days.
  const all = mean(entries.map((e) => e.mood));
  if (all !== undefined) {
    for (const s of tagStats(entries)) {
      if (s.n >= RULES.tagMinUses && s.mood - all >= RULES.tagMinLift) {
        out.push({ key: 'ins.tag', vars: { tag: s.tag, diff: round1(s.mood - all), n: s.n }, n: s.n, tone: 'link' });
        if (out.filter((i) => i.key === 'ins.tag').length >= 2) break;
      }
    }
  }

  // Neglected domain: scored before, nothing in the last 7 days → a gentle nudge (max 2).
  const recent = dateRange(addDays(today, -(RULES.neglectDays - 1)), today);
  const nudges = domains
    .filter((d) => entries.some((e) => domainScore(e, d.id) !== undefined))
    .filter((d) => recent.every((k) => domainScore(day(k), d.id) === undefined))
    .slice(0, 2);
  for (const d of nudges) {
    const last = entries.filter((e) => domainScore(e, d.id) !== undefined).map((e) => e.date).sort().pop()!;
    out.push({ key: 'ins.neglected', vars: { domain: d.id, last }, n: 0, domain: d.id, tone: 'nudge' });
  }
  return out;
}

/** Care rule: anxiety ≥ 8 on 5 of the last 7 *logged* days. */
export function needsCare(entries: DayEntry[]): boolean {
  const lastLogged = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RULES.careWindow);
  return lastLogged.filter((e) => (e.inner?.anxiety ?? -1) >= RULES.careAnxiety).length >= RULES.careDays;
}
