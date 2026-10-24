import type { Config, DomainConfig } from './types';
import { SCHEMA_VERSION } from './schema';

/** The 10 domains chosen in the design brief (design/DESIGN_CHANGES.md §1, CHANGES.md #1). */
const IDS = ['sleep', 'body', 'mood', 'relationships', 'work', 'growth', 'leisure', 'money', 'home', 'nature'] as const;
const LABELS: Record<(typeof IDS)[number], [uk: string, en: string]> = {
  sleep: ['Сон', 'Sleep'],
  body: ['Тіло', 'Body'],
  mood: ['Настрій', 'Mood'],
  relationships: ['Стосунки', 'Relationships'],
  work: ['Робота', 'Work'],
  growth: ['Навчання', 'Growth'],
  leisure: ['Дозвілля', 'Leisure'],
  money: ['Гроші', 'Money'],
  home: ['Дім', 'Home'],
  nature: ['Природа', 'Nature'],
};

/** Palettes that exist in tokens.css (`--d-<palette>`); custom domains pick one of these. */
export const PALETTES: readonly string[] = IDS;

export const DEFAULT_DOMAINS: DomainConfig[] = IDS.map((id, order) => ({
  id,
  labelUk: LABELS[id][0],
  labelEn: LABELS[id][1],
  icon: `d-${id}`,
  color: id,
  order,
  active: true,
}));

/** Suggested tag chips per domain, shown in the domain sheet. */
export const DEFAULT_TAGS: Record<string, { uk: string[]; en: string[] }> = {
  sleep: { uk: ['без телефона', 'рано ліг', 'денний сон'], en: ['no phone', 'early night', 'nap'] },
  body: { uk: ['тренування', 'прогулянка', 'їжа'], en: ['training', 'walk', 'food'] },
  mood: { uk: ['дихання', 'щоденник', 'терапія'], en: ['breathing', 'journal', 'therapy'] },
  relationships: { uk: ['рідні', 'друзі', 'дзвінок'], en: ['family', 'friends', 'call'] },
  work: { uk: ['реліз', 'фокус', 'зустріч'], en: ['release', 'focus', 'meeting'] },
  growth: { uk: ['музика', 'читання', 'курс'], en: ['music', 'reading', 'course'] },
  leisure: { uk: ['гра', 'кіно', 'собака'], en: ['game', 'film', 'the dog'] },
  money: { uk: ['бюджет', 'без імпульсних', 'заощадив'], en: ['budget', 'no impulse buys', 'saved'] },
  home: { uk: ['прибирання', 'готування', 'затишок'], en: ['tidying', 'cooking', 'cosy'] },
  nature: { uk: ['ліс', 'парк', 'сонце'], en: ['forest', 'park', 'sun'] },
};

/** A fixed epoch so a fresh install never overrides a config pulled from the data repo. */
export const DEFAULT_CONFIG_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export function defaultConfig(): Config {
  return {
    schemaVersion: SCHEMA_VERSION,
    domains: DEFAULT_DOMAINS.map((d) => ({ ...d })),
    updatedAt: DEFAULT_CONFIG_UPDATED_AT,
  };
}
