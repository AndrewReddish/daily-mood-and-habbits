import { z } from 'zod';
import type { Config, DayEntry, WeeklyReview } from '../model/types';
import { ConfigSchema, DayEntrySchema, SCHEMA_VERSION, WeeklyReviewSchema } from '../model/schema';

export const BackupSchema = z.object({
  app: z.literal('spheres'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string(),
  config: ConfigSchema,
  entries: z.array(DayEntrySchema),
  reviews: z.array(WeeklyReviewSchema),
});
export type Backup = z.infer<typeof BackupSchema>;

export function toBackup(config: Config, entries: DayEntry[], reviews: WeeklyReview[], exportedAt: string): Backup {
  return { app: 'spheres', schemaVersion: SCHEMA_VERSION, exportedAt, config, entries, reviews };
}

export function parseBackup(json: string): Backup {
  return BackupSchema.parse(JSON.parse(json));
}

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per day, one column per field. Empty cell = not logged. */
export function toCsv(entries: DayEntry[], config: Config): string {
  const domains = [...config.domains].sort((a, b) => a.order - b.order).map((d) => d.id);
  for (const e of entries) for (const id of Object.keys(e.domains ?? {})) if (!domains.includes(id)) domains.push(id);

  const header = [
    'date', 'mood', 'energy', 'sleep', 'anxiety', 'control', 'lifeSpace',
    ...domains.flatMap((id) => [`${id}.score`, `${id}.good`, `${id}.tags`]),
    'highlight', 'note', 'updatedAt',
  ];
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      e.date, e.mood, e.energy, e.sleep, e.inner?.anxiety, e.inner?.control, e.inner?.lifeSpace,
      ...domains.flatMap((id) => {
        const d = e.domains?.[id];
        return [d?.score, d?.good, d?.tags];
      }),
      e.highlight, e.note, e.updatedAt,
    ]);
  // BOM so Excel/Numbers read Cyrillic correctly.
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Share sheet on iOS; download fallback elsewhere. */
export async function shareFile(name: string, mime: string, content: string): Promise<void> {
  const file = new File([content], name, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
