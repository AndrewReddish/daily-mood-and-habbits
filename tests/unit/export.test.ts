import { describe, expect, it } from 'vitest';
import { parseBackup, toBackup, toCsv } from '../../src/storage/export';
import { defaultConfig } from '../../src/model/defaults';
import { entry } from './fixtures';

describe('export', () => {
  const e1 = entry('2026-10-24', '2026-10-24T21:43:55+03:00', {
    mood: 4, inner: { anxiety: 6 }, domains: { body: { score: 3, good: 'Тренування, "вдома"', tags: ['a', 'b'] } },
  });
  const e2 = entry('2026-10-22', '2026-10-22T20:00:00+03:00', { mood: 2 });

  it('CSV has one row per day, sorted, with empty cells for gaps', () => {
    const csv = toCsv([e1, e2], defaultConfig());
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith('date,mood,energy,sleep,anxiety,control,lifeSpace,sleep.score')).toBe(true);
    expect(lines[1].startsWith('2026-10-22,2,,,')).toBe(true);
    expect(lines[2]).toContain('"Тренування, ""вдома"""');
    expect(lines[2]).toContain('a; b');
  });

  it('JSON backup round-trips', () => {
    const b = toBackup(defaultConfig(), [e1, e2], [], '2026-10-24T22:00:00+03:00');
    expect(parseBackup(JSON.stringify(b))).toEqual(b);
    expect(() => parseBackup('{"app":"other"}')).toThrow();
  });
});
