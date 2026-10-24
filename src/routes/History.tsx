import { useEffect, useState } from 'preact/hooks';
import type { DateKey, DayEntry, MonthKey } from '../model/types';
import { useLang, useT, locale } from '../i18n/t';
import { addMonths, capFirst, fromDateKey, monthGrid, monthOf, monthTitle, todayKey } from '../lib/dates';
import { useConfig } from '../lib/useConfig';
import { go } from '../lib/router';
import { entriesInMonth, db } from '../storage/db';
import { Button, Icon, IconButton, Illustration, TabBar, domainVars, moodVars } from '../components/ui';
import { MonthCalendar, domainLabel } from '../components/domain';
import { PALETTES } from '../model/defaults';

export function History() {
  const t = useT();
  const lang = useLang();
  const loc = locale(lang);
  const today = todayKey();
  const { domains } = useConfig();
  const [month, setMonth] = useState<MonthKey>(monthOf(today));
  const [entries, setEntries] = useState<Record<DateKey, DayEntry>>({});
  const [selected, setSelected] = useState<DateKey>(today);
  const [hasAny, setHasAny] = useState<boolean | null>(null);

  useEffect(() => {
    void entriesInMonth(month).then((rows) => setEntries(Object.fromEntries(rows.map((e) => [e.date, e]))));
  }, [month]);
  useEffect(() => {
    void db.entries.count().then((n) => setHasAny(n > 0));
    void db.entries.orderBy('date').last().then((e) => e && setSelected((s) => (s === today && e.date !== today ? e.date : s)));
  }, []);

  const moods = Object.fromEntries(Object.values(entries).map((e) => [e.date, e.mood]));
  const monthLabel = monthTitle(month, loc);
  const sel = entries[selected];
  const isCurrent = month >= monthOf(today);

  return (
    <>
      <main class="screen">
        <h1 class="sf-title">{t('history.title')}</h1>
        {hasAny === false ? (
          <div class="sf-empty">
            <Illustration name="empty-history" width={240} height={180} />
            <p class="sf-entry" style="color:var(--ink)">{t('history.empty')}</p>
            <Button onClick={() => go('today')}>{t('tab.today')}</Button>
          </div>
        ) : (
          <>
            <div class="month-nav">
              <IconButton icon="chevron-left" size={22} tone="surface" label={t('history.prevMonth')} onClick={() => setMonth(addMonths(month, -1))} />
              <span>{monthLabel}</span>
              <IconButton icon="chevron-right" size={22} tone="surface" label={t('history.nextMonth')} disabled={isCurrent} onClick={() => setMonth(addMonths(month, 1))} />
            </div>
            <MonthCalendar cells={monthGrid(month)} moods={moods} today={today} selected={selected} onSelect={setSelected} />
            <div class="sf-legend">
              <span style="display:flex;gap:4px">
                {[1, 3, 5].map((m) => <span class="sf-legend__sw" style={`background:var(--mood-${m}-soft)`}><Icon name={'mood-' + m} size={16} /></span>)}
              </span>
              <span>{t('history.legend.mood')}</span>
              <span class="sf-legend__sw sf-legend__sw--gap" />
              <span>{t('history.legend.empty')}</span>
            </div>
            {monthOf(selected) === month && (
              <button type="button" class="sf-card day-card sf-press" style="border:0;text-align:left;cursor:pointer;color:var(--ink)"
                onClick={() => go(selected === today ? 'today' : 'day/' + selected)}>
                <div class="day-card__top">
                  <div style="display:grid;gap:2px">
                    <span class="sf-label">{capFirst(new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(fromDateKey(selected)))}</span>
                    <span class="sf-meta">{sel ? `${sel.mood} · ${t('mood.' + sel.mood)}` : t('history.noEntry')}</span>
                  </div>
                  {sel ? (
                    <span class="day-card__face" style={moodVars(sel.mood)}><Icon name={'mood-' + sel.mood} size={30} /></span>
                  ) : (
                    <span class="day-card__face" style="background:var(--bg-sunk)"><Icon name="plus" size={22} /></span>
                  )}
                </div>
                {sel?.highlight && <p class="day-card__hl">«{sel.highlight}»</p>}
                {sel?.domains && (
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    {domains.filter((d) => sel.domains?.[d.id]?.score !== undefined).map((d) => {
                      const p = PALETTES.includes(d.color) ? d.color : 'mood';
                      return (
                        <span class="sf-pill" style={domainVars(p)}>
                          <Icon name={d.icon.startsWith('d-') ? d.icon : 'd-' + p} size={18} />
                          {domainLabel(d, lang)} {sel.domains![d.id].score}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            )}
          </>
        )}
      </main>
      <TabBar active="history" />
    </>
  );
}
