import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DayEntry } from '../model/types';
import { useLang, useT, locale } from '../i18n/t';
import { addDays, fromDateKey, todayKey } from '../lib/dates';
import { useConfig } from '../lib/useConfig';
import { allEntries, db } from '../storage/db';
import { byDate, dateRange, rollingMean, spanDays, tagStats } from '../analytics/metrics';
import { computeInsights, needsCare, type Insight } from '../analytics/insights';
import { Chip, Icon, Illustration, Segmented, TabBar, domainVars } from '../components/ui';
import { DomainChip, domainLabel } from '../components/domain';
import { CalendarHeat, ChartCard, DomainHeat, Radar, TagBars, Trend, WeekdayHeat, avgOver } from '../components/charts';

/** When each chart unlocks (plan §6 "Shown after"). */
/** Calendar metric key for the day's overall mood (a domain can itself be called "mood"). */
const MOOD = '__mood';

const AFTER = { calendar: 1, domainHeat: 3, trend: 7, tags: 10, radarSpan: 14, weekdaySpan: 28 };

export function Insights() {
  const t = useT();
  const lang = useLang();
  const loc = locale(lang);
  const today = todayKey();
  const { active: domains } = useConfig();
  const [entries, setEntries] = useState<DayEntry[] | null>(null);
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState(MOOD); // day mood, or a domain id

  useEffect(() => {
    const store = db;
    const load = () => void allEntries(store).then(setEntries);
    load();
    // Re-read when sync brings in entries from another device.
    window.addEventListener('spheres:synced', load);
    return () => window.removeEventListener('spheres:synced', load);
  }, []);

  const data = useMemo(() => {
    if (!entries) return null;
    const map = byDate(entries);
    const days = dateRange(addDays(today, range === 'week' ? -6 : -29), today);
    const last7 = dateRange(addDays(today, -6), today);
    const prev7 = dateRange(addDays(today, -13), addDays(today, -7));
    const trendDays = dateRange(addDays(today, range === 'week' ? -13 : -29), today); // a week needs a run-up for the 7-day average
    const show = range === 'week' ? 7 : 30;
    const series = (pick: (e?: DayEntry) => number | undefined) => {
      const raw = trendDays.map((k) => pick(map.get(k)));
      return { raw: raw.slice(-show), avg: rollingMean(raw, 7).slice(-show) };
    };
    return {
      map, days, last7, prev7, trendDays: trendDays.slice(-show),
      logged: entries.length,
      span: spanDays(entries, today),
      insights: computeInsights(entries, domains, today),
      care: needsCare(entries),
      tags: tagStats(entries),
      mood: series((e) => e?.mood),
      anxiety: series((e) => e?.inner?.anxiety),
      control: series((e) => e?.inner?.control),
      lifeSpace: series((e) => e?.inner?.lifeSpace),
    };
  }, [entries, range, domains, today]);

  const lockedDays = (need: number) => (data!.logged >= need ? undefined : t('chart.after.days', { n: need, have: data!.logged }));
  const lockedSpan = (need: number) => (data!.span >= need ? undefined : t('chart.after.span', { n: need - data!.span }));

  const text = (i: Insight) => {
    const d = domains.find((x) => x.id === i.vars.domain);
    const vars: Record<string, string | number> = { ...i.vars };
    if (d) vars.domain = domainLabel(d, lang);
    if (i.key === 'ins.hardWeekday') vars.weekday = new Intl.DateTimeFormat(loc, { weekday: 'long' }).format(new Date(2026, 9, 19 + +i.vars.weekday));
    if (i.key === 'ins.neglected') vars.last = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(fromDateKey(String(i.vars.last)));
    const s = t(i.key, vars);
    return s.charAt(0).toLocaleUpperCase() + s.slice(1);
  };

  return (
    <>
      <main class="screen">
        <h1 class="sf-title">{t('tab.insights')}</h1>
        {!data ? null : data.logged === 0 ? (
          <div class="sf-empty">
            <Illustration name="first-launch" width={240} height={180} />
            <p class="sf-entry" style="color:var(--ink)">{t('insights.empty')}</p>
          </div>
        ) : (
          <>
            <Segmented<'week' | 'month'> label={t('tab.insights')} value={range} onChange={setRange}
              options={[{ value: 'week', label: t('insights.week') }, { value: 'month', label: t('insights.month') }]} />

            {data.care && (
              <article class="sf-card sf-insight" style="background:var(--d-mood-soft)">
                <h2 class="sf-label">{t('care.title')}</h2>
                <p class="sf-meta" style="color:var(--ink)">{t('care.body')}</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <a class="sf-btn sf-btn--secondary" href="tel:7333">Lifeline Ukraine · 7333</a>
                  <a class="sf-btn sf-btn--ghost" href="tel:112">{t('care.emergency')}</a>
                </div>
              </article>
            )}

            {data.insights.length > 0 ? (
              <div class="stack">
                {data.insights.map((i) => {
                  const dom = domains.find((d) => d.id === i.domain);
                  return (
                  <article class={'sf-card sf-insight' + (i.tone === 'nudge' ? ' sf-insight--nudge' : '')} style={dom ? domainVars(dom.color) : ''}>
                    {dom && <DomainChip domain={dom} size="sm" />}
                    <p class="sf-insight__text">{text(i)}</p>
                    {i.n > 0 && <span class="sf-badge">{t('insights.n', { n: i.n })}</span>}
                  </article>
                  );
                })}
                {data.insights.some((i) => i.tone === 'link') && <p class="sf-meta" style="padding:0 4px">{t('ins.note')}</p>}
              </div>
            ) : (
              <div class="sf-banner"><Icon name="insights" /><span>{t('insights.lowData')}</span></div>
            )}

            <ChartCard title={t('chart.calendar')} hint={t('chart.calendar.hint')} locked={lockedDays(AFTER.calendar)}>
              <div class="sf-chips sf-chips--scroll" role="radiogroup" aria-label={t('chart.calendar')}>
                <Chip selected={metric === MOOD} onClick={() => setMetric(MOOD)}>{t('chart.moodRow')}</Chip>
                {domains.map((d) => <Chip palette={d.color} selected={metric === d.id} onClick={() => setMetric(d.id)}>{domainLabel(d, lang)}</Chip>)}
              </div>
              <CalendarHeat map={data.map} domain={metric === MOOD ? undefined : metric} domains={domains} today={today} />
            </ChartCard>

            <ChartCard title={t('insights.heatmap')} hint={t(range === 'week' ? 'chart.last7' : 'chart.last30')} locked={lockedDays(AFTER.domainHeat)}>
              <DomainHeat map={data.map} domains={domains} days={data.days} />
            </ChartCard>

            <ChartCard title={t('chart.moodTrend')} hint={t('chart.trend.hint')} locked={lockedDays(AFTER.trend)}>
              <Trend days={data.trendDays} min={1} max={5} series={[{ label: t('chart.moodRow'), color: 'var(--accent)', ...data.mood }]} />
            </ChartCard>

            <ChartCard title={t('chart.inner')} hint={t('chart.trend.hint')} locked={lockedDays(AFTER.trend)}>
              <Trend days={data.trendDays} min={0} max={10} series={[
                { label: t('inner.anxiety'), color: 'var(--d-mood)', ...data.anxiety },
                { label: t('inner.control'), color: 'var(--accent)', ...data.control },
                { label: t('inner.lifeSpace'), color: 'var(--d-growth)', ...data.lifeSpace },
              ]} />
            </ChartCard>

            <ChartCard title={t('chart.radar')} hint={t('chart.radar.hint')} locked={lockedSpan(AFTER.radarSpan)}>
              <Radar domains={domains} now={domains.map((d) => avgOver(data.map, data.last7, d.id))} before={domains.map((d) => avgOver(data.map, data.prev7, d.id))} />
            </ChartCard>

            <ChartCard title={t('chart.weekday')} hint={t('chart.weekday.hint')} locked={lockedSpan(AFTER.weekdaySpan)}>
              <WeekdayHeat entries={entries!} domains={domains} />
            </ChartCard>

            <ChartCard title={t('chart.tags')} hint={t('chart.tags.hint')}
              locked={lockedDays(AFTER.tags) ?? (data.tags.length ? undefined : t('chart.tags.none'))}>
              <TagBars stats={data.tags} />
            </ChartCard>
          </>
        )}
      </main>
      <TabBar active="insights" />
    </>
  );
}
