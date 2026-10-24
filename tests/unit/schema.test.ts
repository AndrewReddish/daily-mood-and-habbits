import { describe, expect, it } from 'vitest';
import { ConfigSchema, DayEntrySchema } from '../../src/model/schema';
import { defaultConfig } from '../../src/model/defaults';

const contractExample = {
  schemaVersion: 1,
  date: '2026-10-24',
  mood: 4,
  energy: 3,
  sleep: 4,
  inner: { anxiety: 6, control: 4, lifeSpace: 5 },
  domains: {
    relationships: { score: 4, good: 'Подзвонив батькам', tags: ['call'] },
    body: { score: 3, good: 'Тренування вдома', tags: ['training'] },
    work: { score: 5, good: 'Закрив реліз', tags: [] },
  },
  highlight: 'Прогулянка в лісі з собакою',
  note: '',
  createdAt: '2026-10-24T21:40:12+03:00',
  updatedAt: '2026-10-24T21:43:55+03:00',
};

describe('data contract v1', () => {
  it('accepts the contract example', () => {
    expect(DayEntrySchema.parse(contractExample)).toEqual(contractExample);
  });

  it('only mood is required', () => {
    const minimal = { schemaVersion: 1, date: '2026-10-24', mood: 1, createdAt: 'x', updatedAt: 'x' };
    expect(DayEntrySchema.safeParse(minimal).success).toBe(true);
    const { mood: _, ...noMood } = minimal;
    expect(DayEntrySchema.safeParse(noMood).success).toBe(false);
  });

  it('rejects out-of-range scales', () => {
    expect(DayEntrySchema.safeParse({ ...contractExample, mood: 0 }).success).toBe(false);
    expect(DayEntrySchema.safeParse({ ...contractExample, inner: { anxiety: 11 } }).success).toBe(false);
    expect(DayEntrySchema.safeParse({ ...contractExample, domains: { body: { score: 6 } } }).success).toBe(false);
  });

  it('default config is valid and has the 10 design domains', () => {
    const c = ConfigSchema.parse(defaultConfig());
    expect(c.domains.map((d) => d.id)).toEqual([
      'sleep', 'body', 'mood', 'relationships', 'work', 'growth', 'leisure', 'money', 'home', 'nature',
    ]);
  });
});
