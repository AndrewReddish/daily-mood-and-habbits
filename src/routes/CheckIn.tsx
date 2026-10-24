import { useEffect } from 'preact/hooks';
import type { DateKey } from '../model/types';
import { useT } from '../i18n/t';
import { useDay } from '../lib/useDay';
import { go } from '../lib/router';
import { sound } from '../lib/sound';

// Direction of the last step change, so the next screen slides in from the right side.
let direction: 'fwd' | 'back' = 'fwd';
import { BloomRating, Button, Slider, StepHeader, TextField } from '../components/ui';

const TOTAL = 5; // steps 1–2 (mood, domains) live on the Today screen

/** Steps 3–5 of the daily entry: inner state, energy & sleep, highlight & note. */
export function CheckIn({ date, step }: { date: DateKey; step: number }) {
  const t = useT();
  const { draft, update, flush, loaded } = useDay(date);
  const inner = draft.inner ?? {};
  const todayPath = `day/${date}`;

  const next = async () => {
    direction = 'fwd';
    sound('step');
    await flush();
    go(step < TOTAL ? `checkin/${date}/${step + 1}` : todayPath);
  };
  const back = async () => {
    direction = 'back';
    await flush();
    go(step > 3 ? `checkin/${date}/${step - 1}` : todayPath);
  };

  // The check-in only extends a day that already has a mood.
  const noMood = loaded && draft.mood === undefined;
  useEffect(() => {
    if (noMood) go(todayPath);
  }, [noMood, todayPath]);
  if (noMood) return null;

  return (
    <>
      <StepHeader step={step} total={TOTAL} label={t('checkin.step', { n: step, total: TOTAL })} onBack={back} onSkip={next} />
      <main class={`screen screen--flow screen--${direction}`}>
        {step === 3 && (
          <>
            <div class="screen__head">
              <h1 class="sf-title sf-title--step">{t('checkin.inner.title')}</h1>
              <p class="sf-meta">{t('checkin.inner.hint')}</p>
            </div>
            <Slider id="anxiety" label={t('inner.anxiety')} question={t('inner.anxiety.q')} color="var(--d-mood)"
              value={inner.anxiety} onChange={(v) => update((d) => ({ ...d, inner: { ...d.inner, anxiety: v } }))} />
            <Slider id="control" label={t('inner.control')} question={t('inner.control.q')}
              value={inner.control} onChange={(v) => update((d) => ({ ...d, inner: { ...d.inner, control: v } }))} />
            <Slider id="lifeSpace" label={t('inner.lifeSpace')} question={t('inner.lifeSpace.q')} color="var(--d-growth)"
              value={inner.lifeSpace} onChange={(v) => update((d) => ({ ...d, inner: { ...d.inner, lifeSpace: v } }))} />
          </>
        )}
        {step === 4 && (
          <>
            <div class="screen__head">
              <h1 class="sf-title sf-title--step">{t('checkin.energy.title')}</h1>
              <p class="sf-meta">{t('checkin.energy.hint')}</p>
            </div>
            <div class="sf-card" style="padding:14px 16px;display:grid;gap:10px">
              <div style="display:grid;gap:2px"><span class="sf-label">{t('energy')}</span><p class="sf-slider__q">{t('energy.q')}</p></div>
              <BloomRating palette="leisure" label={t('energy')} value={draft.energy} onChange={(energy) => update({ energy })} />
            </div>
            <div class="sf-card" style="padding:14px 16px;display:grid;gap:10px">
              <div style="display:grid;gap:2px"><span class="sf-label">{t('sleep')}</span><p class="sf-slider__q">{t('sleep.q')}</p></div>
              <BloomRating palette="sleep" label={t('sleep')} value={draft.sleep} onChange={(sleep) => update({ sleep })} />
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <div class="screen__head">
              <h1 class="sf-title sf-title--step">{t('checkin.highlight.title')}</h1>
              <p class="sf-meta">{t('checkin.highlight.hint')}</p>
            </div>
            <div class="sf-card" style="padding:14px 16px;display:grid;gap:14px">
              <TextField id="highlight" label={t('highlight.label')} placeholder={t('highlight.placeholder')} maxLength={280}
                value={draft.highlight} onInput={(highlight) => update({ highlight })} />
              <TextField id="note" multiline label={t('note.label')} placeholder={t('note.placeholder')} maxLength={5000}
                value={draft.note} onInput={(note) => update({ note })} />
            </div>
          </>
        )}
      </main>
      <div class="flow-bar">
        <Button block iconEnd={step < TOTAL ? 'chevron-right' : undefined} icon={step === TOTAL ? 'check' : undefined} onClick={next}>
          {step < TOTAL ? t('common.next') : t('common.done')}
        </Button>
      </div>
    </>
  );
}
