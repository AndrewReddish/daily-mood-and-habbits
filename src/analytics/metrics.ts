import type { DateKey, DayEntry } from '../model/types';
import { addDays, fromDateKey, weekdayIndex } from '../lib/dates';

/** Missing values are gaps, never zero: every helper skips undefined. */
export type Num = number | undefined;

export const mean = (xs: Num[]): Num => {
  const v = xs.filter((x): x is number => x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};

export const round1 = (x: number) => Math.round(x * 10) / 10;

/** Consecutive date keys from `from` to `to`, inclusive. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function byDate(entries: DayEntry[]): Map<DateKey, DayEntry> {
  return new Map(entries.map((e) => [e.date, e]));
}

/** Days between the first entry and today, inclusive (0 with no entries). */
export function spanDays(entries: DayEntry[], today: DateKey): number {
  if (!entries.length) return 0;
  const first = entries.reduce((m, e) => (e.date < m ? e.date : m), entries[0].date);
  return Math.round((fromDateKey(today).getTime() - fromDateKey(first).getTime()) / 86400000) + 1;
}

/** Trailing average over the last `window` calendar days, using only the days that were logged. */
export function rollingMean(values: Num[], window = 7): Num[] {
  return values.map((_, i) => mean(values.slice(Math.max(0, i - window + 1), i + 1)));
}

function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1; // ties share the average rank
    for (let k = i; k <= j; k++) r[order[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

/** Spearman's ρ over paired values (pairs with a gap on either side are dropped). */
export function spearman(a: Num[], b: Num[]): { rho: number; n: number } | undefined {
  const pairs = a.flatMap((x, i) => (x !== undefined && b[i] !== undefined ? [[x, b[i]!] as const] : []));
  const n = pairs.length;
  if (n < 3) return undefined;
  const ra = ranks(pairs.map((p) => p[0]));
  const rb = ranks(pairs.map((p) => p[1]));
  const ma = mean(ra)!;
  const mb = mean(rb)!;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  if (!da || !db) return undefined; // one side never varies
  return { rho: num / Math.sqrt(da * db), n };
}

export const domainScore = (e: DayEntry | undefined, id: string): Num => e?.domains?.[id]?.score;

/** Average of a value per weekday (Mon = 0), with how many days fed each average. */
export function byWeekday(entries: DayEntry[], pick: (e: DayEntry) => Num): { avg: Num; n: number }[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const e of entries) {
    const v = pick(e);
    if (v !== undefined) buckets[weekdayIndex(e.date)].push(v);
  }
  return buckets.map((b) => ({ avg: mean(b), n: b.length }));
}

/** Tags from every domain's "що було добре", with use count and the average mood of those days. */
export function tagStats(entries: DayEntry[]): { tag: string; n: number; mood: number }[] {
  const days = new Map<string, number[]>();
  for (const e of entries) {
    const tags = new Set(Object.values(e.domains ?? {}).flatMap((d) => d.tags ?? []));
    for (const t of tags) (days.get(t) ?? days.set(t, []).get(t)!).push(e.mood);
  }
  return [...days.entries()]
    .map(([tag, moods]) => ({ tag, n: moods.length, mood: mean(moods)! }))
    .sort((a, b) => b.n - a.n || b.mood - a.mood);
}
