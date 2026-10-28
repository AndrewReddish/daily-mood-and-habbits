import { describe, expect, it } from 'vitest';
import { mean, rollingMean, spearman, tagStats, spanDays } from '../../src/analytics/metrics';
import { computeInsights, needsCare } from '../../src/analytics/insights';
import { DEFAULT_DOMAINS } from '../../src/model/defaults';
import { addDays } from '../../src/lib/dates';
import type { DayEntry } from '../../src/model/types';
import { entry } from './fixtures';

const TODAY = '2026-10-28';

/** n days ending today; `make(i)` customises day i (0 = oldest). */
function days(n: number, make: (i: number, date: string) => Partial<DayEntry> = () => ({})): DayEntry[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(TODAY, i - n + 1);
    return entry(date, `${date}T21:00:00+03:00`, make(i, date));
  });
}

describe('metrics', () => {
  it('mean skips gaps instead of counting them as zero', () => {
    expect(mean([4, undefined, 2])).toBe(3);
    expect(mean([undefined])).toBeUndefined();
  });
  it('rolling mean uses only logged days in the window', () => {
    expect(rollingMean([2, undefined, 4], 7)).toEqual([2, 2, 3]);
  });
  it('spearman handles ties and drops unpaired days', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])!.rho).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])!.rho).toBeCloseTo(-1);
    expect(spearman([1, 1, 2, undefined], [1, 1, 2, 5])!.n).toBe(3);
    expect(spearman([3, 3, 3], [1, 2, 3])).toBeUndefined();
  });
  it('tag stats count each tag once per day', () => {
    const e = days(2, (i) => ({ mood: i ? 5 : 3, domains: { body: { tags: ['walk'] }, nature: { tags: ['walk'] } } }));
    expect(tagStats(e)).toEqual([{ tag: 'walk', n: 2, mood: 4 }]);
  });
  it('span counts calendar days since the first entry', () => {
    expect(spanDays(days(10), TODAY)).toBe(10);
    expect(spanDays([], TODAY)).toBe(0);
  });
});

describe('insights', () => {
  it('finds a domain–mood link and states n', () => {
    const e = days(20, (i) => {
      const body = (i % 5) + 1;
      return { mood: Math.min(5, body + (i % 2)), domains: { body: { score: body } } };
    });
    const ins = computeInsights(e, DEFAULT_DOMAINS, TODAY);
    const link = ins.find((x) => x.key === 'ins.domainUp' && x.domain === 'body');
    expect(link).toBeDefined();
    expect(link!.n).toBe(20);
    expect(+link!.vars.diff).toBeGreaterThan(0);
  });

  it('needs 14 paired days before claiming a link', () => {
    const e = days(10, (i) => ({ mood: (i % 5) + 1, domains: { body: { score: (i % 5) + 1 } } }));
    expect(computeInsights(e, DEFAULT_DOMAINS, TODAY).some((x) => x.domain === 'body' && x.tone === 'link')).toBe(false);
  });

  it('nudges a domain that went quiet for 7+ days', () => {
    const e = days(14, (i) => (i < 5 ? { domains: { growth: { score: 4 } } } : {}));
    expect(computeInsights(e, DEFAULT_DOMAINS, TODAY).some((x) => x.key === 'ins.neglected' && x.domain === 'growth')).toBe(true);
  });

  it('finds a hard weekday only with ≥3 entries per weekday', () => {
    const e = days(28, (_, date) => ({ mood: new Date(date + 'T12:00').getDay() === 1 ? 1 : 4 }));
    const hw = computeInsights(e, DEFAULT_DOMAINS, TODAY).find((x) => x.key === 'ins.hardWeekday');
    expect(hw?.vars.weekday).toBe(0); // Monday
    expect(computeInsights(e.slice(-10), DEFAULT_DOMAINS, TODAY).some((x) => x.key === 'ins.hardWeekday')).toBe(false);
  });

  it('finds a helpful tag (5+ uses, +0.5 mood)', () => {
    const e = days(20, (i) => (i % 3 === 0 ? { mood: 5, domains: { nature: { tags: ['ліс'] } } } : { mood: 3 }));
    expect(computeInsights(e, DEFAULT_DOMAINS, TODAY).find((x) => x.key === 'ins.tag')?.vars.tag).toBe('ліс');
  });

  it('works with 0, 3, 30 and 365 days of data', () => {
    for (const n of [0, 3, 30, 365]) {
      const e = days(n, (i) => ({ mood: (i % 5) + 1, inner: { anxiety: i % 11, lifeSpace: 10 - (i % 11), control: i % 7 } }));
      expect(() => computeInsights(e, DEFAULT_DOMAINS, TODAY)).not.toThrow();
    }
  });

  it('care card: anxiety ≥ 8 on 5 of the last 7 logged days', () => {
    expect(needsCare(days(7, (i) => ({ inner: { anxiety: i < 5 ? 9 : 2 } })))).toBe(true);
    expect(needsCare(days(7, (i) => ({ inner: { anxiety: i < 4 ? 9 : 2 } })))).toBe(false);
  });
});
