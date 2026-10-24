import { describe, expect, it } from 'vitest';
import { differs, mergeEntries, pickNewer } from '../../src/storage/merge';
import { entry } from './fixtures';

describe('merge', () => {
  it('newer updatedAt wins per day', () => {
    const local = { '2026-10-24': entry('2026-10-24', '2026-10-24T21:43:55+03:00', { mood: 4 }) };
    const remote = { '2026-10-24': entry('2026-10-24', '2026-10-24T21:40:12+03:00', { mood: 2 }) };
    expect(mergeEntries(local, remote)['2026-10-24'].mood).toBe(4);
    expect(mergeEntries(remote, local)['2026-10-24'].mood).toBe(4);
  });

  it('compares instants, not strings, across offsets', () => {
    const a = entry('2026-10-24', '2026-10-24T21:00:00+03:00', { mood: 1 }); // 18:00Z
    const b = entry('2026-10-24', '2026-10-24T19:00:00+00:00', { mood: 5 }); // 19:00Z
    expect(pickNewer(a, b)!.mood).toBe(5);
  });

  it('keeps days that exist on only one side', () => {
    const m = mergeEntries({ a: entry('2026-10-01', '2026-10-01T10:00:00Z') }, { b: entry('2026-10-02', '2026-10-02T10:00:00Z') });
    expect(Object.keys(m).sort()).toEqual(['a', 'b']);
  });

  it('ties keep local', () => {
    const l = entry('2026-10-24', '2026-10-24T10:00:00Z', { mood: 4 });
    const r = entry('2026-10-24', '2026-10-24T10:00:00Z', { mood: 2 });
    expect(pickNewer(l, r)).toBe(l);
  });

  it('differs detects what a side is missing', () => {
    const e = entry('2026-10-24', '2026-10-24T10:00:00Z');
    expect(differs({ x: e }, { x: e })).toBe(false);
    expect(differs({ x: e }, {})).toBe(true);
    expect(differs({ x: e }, { x: { ...e, updatedAt: '2026-10-23T00:00:00Z' } })).toBe(true);
  });
});
