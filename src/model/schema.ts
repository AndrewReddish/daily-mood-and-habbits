import { z } from 'zod';

/**
 * Data contract v1 (see specs/DATA_CONTRACT.md).
 * Missing fields mean "not logged", never zero — analytics treat them as gaps.
 * Never change this alone: propose changes in CHANGES.md.
 */
export const SCHEMA_VERSION = 1 as const;

const DateKeyRe = /^\d{4}-\d{2}-\d{2}$/;
const WeekKeyRe = /^\d{4}-W\d{2}$/;

const Score5 = z.number().int().min(1).max(5);
const Score10 = z.number().int().min(0).max(10);

export const InnerStateSchema = z.object({
  anxiety: Score10.optional(),
  control: Score10.optional(),
  lifeSpace: Score10.optional(),
});

export const DomainEntrySchema = z.object({
  score: Score5.optional(),
  good: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export const DayEntrySchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  date: z.string().regex(DateKeyRe),
  mood: Score5,
  energy: Score5.optional(),
  sleep: Score5.optional(),
  inner: InnerStateSchema.optional(),
  domains: z.record(z.string(), DomainEntrySchema).optional(),
  highlight: z.string().max(280).optional(),
  note: z.string().max(5000).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DomainConfigSchema = z.object({
  id: z.string().min(1).max(40),
  labelUk: z.string().min(1).max(40),
  labelEn: z.string().min(1).max(40),
  icon: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
  order: z.number().int(),
  active: z.boolean(),
});

export const ConfigSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  domains: z.array(DomainConfigSchema),
  updatedAt: z.string(),
});

export const WeeklyReviewSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  week: z.string().regex(WeekKeyRe),
  bestDomain: z.string().optional(),
  neglectedDomain: z.string().optional(),
  whatHelped: z.string().max(1000).optional(),
  intention: z
    .object({ domain: z.string().optional(), text: z.string().max(280) })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** One sync file: `entries/YYYY-MM.json` → `{ "YYYY-MM-DD": DayEntry }`. */
export const MonthFileSchema = z.record(z.string().regex(DateKeyRe), DayEntrySchema);
/** One sync file: `reviews/YYYY.json` → `{ "YYYY-Www": WeeklyReview }`. */
export const ReviewsFileSchema = z.record(z.string().regex(WeekKeyRe), WeeklyReviewSchema);
