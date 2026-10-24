import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
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

const LIFT = ['14px', '5px', '0px', '5px', '14px'];
/** Mood picker — the only required field. */
export function MoodPicker({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  const t = useT();
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
            onClick={() => onChange(n)}
          >
            <Icon name={'mood-' + n} size={40} />
          </button>
        ))}
      </div>
      <div class="sf-mood__ends">
        <span aria-hidden="true">{t('score.1')}</span>
        <span class="sf-mood__caption" aria-live="polite">{value ? `${value} · ${t('mood.' + value)}` : ''}</span>
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
    onChange(n);
    ((e.currentTarget as HTMLElement).querySelectorAll('button')[n - 1] as HTMLButtonElement | undefined)?.focus();
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
            onClick={() => onChange(value === n ? undefined : n)}
          >
            <Icon name={'bloom-' + n} size={36} />
            <span class="sf-bloom__n">{n}</span>
          </button>
        ))}
      </div>
      <p class="sf-bloom__caption" aria-live="polite">
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
  const set = (e: Event) => onChange(+(e.currentTarget as HTMLInputElement).value);
  return (
    <div class={'sf-slider' + (value == null ? ' is-unset' : '')} style={`--c:${color};--p:${(value ?? 0) * 10}%`}>
      <div class="sf-slider__head">
        <label class="sf-label" for={id}>{label}</label>
        <span class="sf-slider__value" aria-hidden="true">{value ?? t('common.notLogged')}</span>
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
    <button type="button" class="sf-chip sf-press" aria-pressed={selected} onClick={onClick} style={palette ? domainVars(palette) : ''}>
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
    if (tag) onAdd(tag);
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
  <button type="button" role="switch" class="sf-switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
    <span>{checked && <Icon name="check" size={16} />}</span>
  </button>
);

export function Segmented<V extends string>({ options, value, onChange, label }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string;
}) {
  return (
    <div class="sf-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function TabBar({ active }: { active: string }) {
  const t = useT();
  return (
    <nav class="sf-tabs" aria-label={t('app.name')}>
      {['today', 'history', 'insights', 'settings'].map((id) => (
        <a class="sf-tab sf-press" href={'#/' + id} aria-current={active === id ? 'page' : undefined}>
          <Icon name={id} />
          <span>{t('tab.' + id)}</span>
        </a>
      ))}
    </nav>
  );
}

export function Sheet({ onClose, labelledBy, style, children }: { onClose: () => void; labelledBy: string; style?: string; children: ComponentChildren }) {
  return (
    <>
      <div class="sf-sheet-scrim" onClick={onClose} />
      <section
        class="sf-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={style}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div class="sf-sheet__handle" />
        {children}
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
          {Array.from({ length: total }, (_, i) => <span class={i < step ? 'is-done' : ''} />)}
        </div>
      </div>
      {onSkip ? <button type="button" class="sf-stephead__skip" onClick={onSkip}>{t('common.skip')}</button> : <span style="width:44px;height:44px" />}
    </div>
  );
}
