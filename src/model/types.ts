import type { z } from 'zod';
import type {
  DayEntrySchema,
  DomainEntrySchema,
  DomainConfigSchema,
  ConfigSchema,
  WeeklyReviewSchema,
  InnerStateSchema,
} from './schema';

export type DayEntry = z.infer<typeof DayEntrySchema>;
export type DomainEntry = z.infer<typeof DomainEntrySchema>;
export type DomainConfig = z.infer<typeof DomainConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;
export type InnerState = z.infer<typeof InnerStateSchema>;

/** `YYYY-MM-DD` in the user's local time zone. */
export type DateKey = string;
/** `YYYY-MM` — one sync file per month. */
export type MonthKey = string;
/** ISO week, e.g. `2026-W43`. */
export type WeekKey = string;
