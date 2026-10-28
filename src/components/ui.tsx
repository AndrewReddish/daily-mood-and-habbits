import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { sound } from '../lib/sound';
import { useT } from '../i18n/t';

const BASE = import.meta.env.BASE_URL;
export const asset = (p: string) => BASE + p;

export const domainVars = (palette: string) =>
  `--c: var(--d-${palette}); --c-soft: var(--d-${palette}-soft); --c-ink: var(--d-${palette}-ink)`;
export const moodVars = (m?: number) => (m ? `--m: var(--mood-${m}); --m-soft: var(--mood-${m}-soft)` : '');

export function Icon({ name, size = 24, label, class: cls = '' }: { name: string; size?: number; label?: string; class?: string }) {
  return (
    <svg
      class={'sf-icon ' + cls}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      <use href={`${asset('icons.svg')}#${name}`} />
    </svg>
  );
}

export const Illustration = ({ name, alt = '', width = 200, height = 150 }: { name: string; alt?: string; width?: number; height?: number }) => (
  <img src={asset(`illustrations/${name}.svg`)} alt={alt} width={width} height={height} decoding="async" />
);

type BtnProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon'> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
  icon?: string;
  iconEnd?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children?: ComponentChildren;
};
export function Button({ variant = 'primary', block, icon, iconEnd, children, ...rest }: BtnProps) {
  return (
    <button type="button" class={`sf-btn sf-btn--${variant}${block ? ' sf-btn--block' : ''}`} {...rest}>
      {icon && <Icon name={icon} size={22} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={22} />}
    </button>
  );
}

export const IconButton = ({ icon, label, tone, size = 24, ...rest }: { icon: string; label: string; tone?: 'surface' | 'sunk'; size?: number } & JSX.HTMLAttributes<HTMLButtonElement> & { disabled?: boolean; type?: 'button' | 'submit' }) => (
  <button type="button" class={`sf-iconbtn sf-press${tone ? ' sf-iconbtn--' + tone : ''}`} aria-label={label} {...rest}>
    <Icon name={icon} size={size} />
  </button>
);

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A little burst of petals from the centre of its (position: relative) parent. Re-key to replay. */
export function Burst({ count = 7, distance = 34 }: { count?: number; distance?: number }) {
  return (
    <span class="sf-burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span style={`--a:${(360 / count) * i + 12}deg;--d:${distance + (i % 2) * 8}px;--delay:${(i % 3) * 25}ms`} />
      ))}
    </span>
  );
}

const LIFT = ['14px', '5px', '0px', '5px', '14px'];
/** Mood picker — the only required field. */
export function MoodPicker({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  const t = useT();
  const [pulse, setPulse] = useState(0); // bumps on taps only, not when a saved day loads
  return (
    <div class="sf-mood">
      <h3 class="sf-h2">{t('today.mood.q')}</h3>
      <p class="sf-meta">{t('today.mood.hint')}</p>
      <div class="sf-mood__row" role="radiogroup" aria-label={t('today.mood.q')}>
        {[1, 2, 3, 4, 5].map((n, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${t('mood.' + n)}`}
            class={'sf-mood__opt' + (value === n ? ' is-on' : '')}
            style={`--lift:${LIFT[i]};${moodVars(n)}`}
            onClick={() => { sound('mood', n); setPulse((p) => p + 1); onChange(n); }}
          >
            <Icon name={'mood-' + n} size={40} />
            {value === n && pulse > 0 && <Burst key={pulse} count={8} distance={40} />}
          </button>
        ))}
      </div>
      <div class="sf-mood__ends">
        <span aria-hidden="true">{t('score.1')}</span>
        <span class="sf-mood__caption sf-fadeup" key={value} aria-live="polite">{value ? `${value} · ${t('mood.' + value)}` : ''}</span>
        <span aria-hidden="true">{t('score.5')}</span>
      </div>
    </div>
  );
}

/** Bloom rating 1–5 (seed → flower). Tapping the selected value clears it. Number always visible. */
export function BloomRating({ palette, value, onChange, label }: { palette: string; value?: number; onChange: (n?: number) => void; label: string }) {
  const t = useT();
  const keys = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = Math.min(5, Math.max(1, (value ?? 0) + (e.key === 'ArrowRight' ? 1 : -1)));
    pick(n);
    ((e.currentTarget as HTMLElement).querySelectorAll('button')[n - 1] as HTMLButtonElement | undefined)?.focus();
  };
  const [pulse, setPulse] = useState(0);
  const pick = (n?: number) => {
    sound(n ? 'bloom' : 'clear', n);
    setPulse((p) => p + 1);
    onChange(n);
  };
  return (
    <div class="sf-bloom" style={domainVars(palette)}>
      <div class="sf-bloom__row" role="radiogroup" aria-label={label} onKeyDown={keys}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === n}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            class={'sf-bloom__opt' + (value === n ? ' is-on' : '') + (value && n < value ? ' is-past' : '')}
            aria-label={`${n} — ${t('bloom.' + n)}, ${t('score.' + n)}`}
            onClick={() => pick(value === n ? undefined : n)}
          >
            <Icon name={'bloom-' + n} size={36} />
            <span class="sf-bloom__n">{n}</span>
            {value === n && pulse > 0 && <Burst key={pulse} count={n === 5 ? 10 : 6} distance={n === 5 ? 44 : 32} />}
          </button>
        ))}
      </div>
      <p class="sf-bloom__caption sf-fadeup" key={value ?? 0} aria-live="polite">
        {value ? `${t('bloom.of', { n: value })} · ${t('bloom.' + value)} — ${t('score.' + value)}` : t('common.notLogged')}
      </p>
    </div>
  );
}

/** 0–10 inner-state slider with end anchors. undefined = not logged (never 0). */
export function Slider({ id, label, question, value, onChange, color = 'var(--accent)' }: {
  id: string; label: string; question?: string; value?: number; onChange: (n: number) => void; color?: string;
}) {
  const t = useT();
  const set = (e: Event) => {
    const v = +(e.currentTarget as HTMLInputElement).value;
    if (v !== value) sound('tick', v);
    onChange(v);
  };
  return (
    <div class={'sf-slider' + (value == null ? ' is-unset' : '')} style={`--c:${color};--p:${(value ?? 0) * 10}%`}>
      <div class="sf-slider__head">
        <label class="sf-label" for={id}>{label}</label>
        <span class="sf-slider__value sf-bump" key={value ?? 'unset'} aria-hidden="true">{value ?? t('common.notLogged')}</span>
      </div>
      {question && <p class="sf-slider__q" id={id + '-q'}>{question}</p>}
      <input
        type="range" id={id} min="0" max="10" step="1" value={value ?? 5}
        aria-describedby={question ? id + '-q' : undefined}
        aria-valuetext={value == null ? t('common.notLogged') : `${value} / 10`}
        onInput={set} onClick={set}
      />
      <div class="sf-slider__ends" aria-hidden="true">
        <span>0 · {t('anchor.min')}</span><span>{t('anchor.max')} · 10</span>
      </div>
    </div>
  );
}

export function Chip({ selected, onClick, children, palette }: { selected: boolean; onClick: () => void; children: ComponentChildren; palette?: string }) {
  return (
    <button type="button" class="sf-chip sf-press" aria-pressed={selected} style={palette ? domainVars(palette) : ''}
      onClick={() => { sound(selected ? 'chipOff' : 'chipOn'); onClick(); }}>
      {selected && <Icon name="check" size={18} />}
      {children}
    </button>
  );
}

/** "+ Мітка" chip that turns into a small input. */
export function AddChip({ onAdd }: { onAdd: (tag: string) => void }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState('');
  const commit = () => {
    const tag = v.trim();
    if (tag) {
      sound('chipOn');
      onAdd(tag);
    }
    setV('');
    setEditing(false);
  };
  if (!editing)
    return (
      <button type="button" class="sf-chip sf-chip--add sf-press" onClick={() => setEditing(true)}>
        <Icon name="plus" size={18} />{t('tags.add')}
      </button>
    );
  return (
    <input
      class="sf-chip-input" autoFocus aria-label={t('tags.new')} placeholder={t('tags.new')} value={v} maxLength={40}
      enterKeyHint="done"
      onInput={(e) => setV((e.currentTarget as HTMLInputElement).value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      onBlur={commit}
    />
  );
}

export function TextField({ id, label, value = '', placeholder, multiline, onInput, maxLength, ui }: {
  id: string; label: string; value?: string; placeholder?: string; multiline?: boolean; onInput: (v: string) => void; maxLength?: number; ui?: boolean;
}) {
  const cls = 'sf-input' + (ui ? ' sf-input--ui' : '');
  const handler = (e: Event) => onInput((e.currentTarget as HTMLInputElement).value);
  return (
    <div class="sf-field">
      <label class="sf-field__label" for={id}>{label}</label>
      {multiline ? (
        <textarea id={id} class={cls} rows={4} value={value} placeholder={placeholder} maxLength={maxLength} onInput={handler} />
      ) : (
        <input id={id} class={cls} value={value} placeholder={placeholder} maxLength={maxLength} onInput={handler} autoComplete="off" />
      )}
    </div>
  );
}

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" class="sf-switch" aria-checked={checked} aria-label={label} onClick={() => { sound('toggle'); onChange(!checked); }}>
    <span>{checked && <Icon name="check" size={16} />}</span>
  </button>
);

export function Segmented<V extends string>({ options, value, onChange, label }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string;
}) {
  return (
    <div class="sf-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.value === value} onClick={() => { if (o.value !== value) sound('toggle'); onChange(o.value); }}>{o.label}</button>
      ))}
    </div>
  );
}

export function TabBar({ active }: { active: string }) {
  const t = useT();
  return (
    <nav class="sf-tabs" aria-label={t('app.name')}>
      {['today', 'history', 'insights', 'settings'].map((id) => (
        <a class="sf-tab sf-press" href={'#/' + id} aria-current={active === id ? 'page' : undefined} onClick={() => active !== id && sound('tick', 4)}>
          <Icon name={id} />
          <span>{t('tab.' + id)}</span>
        </a>
      ))}
    </nav>
  );
}

type SheetChildren = ComponentChildren | ((close: () => void) => ComponentChildren);

/**
 * Bottom sheet that springs up and slides away. Pass children as a function to get an
 * animated `close` for buttons inside; `onClose` runs once the exit animation ends.
 */
export function Sheet({ onClose, labelledBy, style, silent, children }: {
  onClose: () => void; labelledBy: string; style?: string; silent?: boolean; children: SheetChildren;
}) {
  const [closing, setClosing] = useState(false);
  useEffect(() => { if (!silent) sound('sheetOpen'); }, []);
  const close = () => {
    if (closing) return;
    if (!silent) sound('sheetClose');
    if (reducedMotion()) return onClose();
    setClosing(true);
    setTimeout(onClose, 240);
  };
  return (
    <>
      <div class={'sf-sheet-scrim' + (closing ? ' is-closing' : '')} onClick={close} />
      <section
        class={'sf-sheet' + (closing ? ' is-closing' : '')} role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={style}
        onKeyDown={(e) => e.key === 'Escape' && close()}
      >
        <div class="sf-sheet__handle" />
        {typeof children === 'function' ? children(close) : children}
      </section>
    </>
  );
}

export function StepHeader({ step, total, label, onBack, backIcon = 'chevron-left', onSkip }: {
  step: number; total: number; label: string; onBack: () => void; backIcon?: string; onSkip?: () => void;
}) {
  const t = useT();
  return (
    <div class="sf-stephead">
      <IconButton icon={backIcon} label={t('common.back')} onClick={onBack} />
      <div class="sf-stephead__mid">
        <div class="sf-stephead__label">{label}</div>
        <div class="sf-stephead__bars" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <span class={i < step ? (i === step - 1 ? 'is-done is-new' : 'is-done') : ''} />)}
        </div>
      </div>
      {onSkip ? <button type="button" class="sf-stephead__skip" onClick={onSkip}>{t('common.skip')}</button> : <span style="width:44px;height:44px" />}
    </div>
  );
}

/** Petals drifting down over the "day saved" illustration. Deterministic, so no layout jitter. */
export function PetalRain({ count = 14 }: { count?: number }) {
  const palettes = ['home', 'leisure', 'relationships', 'nature', 'mood', 'sleep'];
  return (
    <span class="sf-rain" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          style={`--x:${(i * 37) % 100}%;--delay:${(i * 90) % 700}ms;--dur:${1500 + ((i * 53) % 700)}ms;--rot:${(i * 47) % 360}deg;--drift:${((i % 5) - 2) * 14}px;background:var(--d-${palettes[i % palettes.length]})`}
        />
      ))}
    </span>
  );
}
