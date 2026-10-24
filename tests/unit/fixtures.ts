import type { DayEntry } from '../../src/model/types';

export function entry(date: string, updatedAt: string, patch: Partial<DayEntry> = {}): DayEntry {
  return { schemaVersion: 1, date, mood: 3, createdAt: updatedAt, updatedAt, ...patch };
}
