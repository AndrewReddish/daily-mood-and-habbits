import { useState } from 'preact/hooks';
import { useT } from '../i18n/t';
import { initial, useProfiles } from '../lib/profile';
import type { Profile } from '../storage/profiles';
import { Button, Icon, IconButton, Illustration, Sheet, domainVars } from './ui';

export function Avatar({ profile, size = 36 }: { profile: Profile; size?: number }) {
  return (
    <span
      class="sf-avatar" aria-hidden="true"
      style={`${domainVars(profile.color)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`}
    >
      {initial(profile.name)}
    </span>
  );
}

/** Name input + add button; used by the picker, the switch sheet and Settings. */
export function AddProfileForm({ onAdded }: { onAdded?: () => void }) {
  const t = useT();
  const { add } = useProfiles();
  const [name, setName] = useState('');
  const submit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    await add(name.trim());
    setName('');
    onAdded?.();
  };
  return (
    <form class="sf-addprofile" onSubmit={submit}>
      <input
        class="sf-input sf-input--ui" aria-label={t('profiles.name')} placeholder={t('profiles.namePlaceholder')}
        value={name} maxLength={40} enterKeyHint="done" autoComplete="off"
        onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
      />
      <IconButton icon="plus" label={t('profiles.add')} tone="sunk" type="submit" disabled={!name.trim()} />
    </form>
  );
}

/** One tappable row per user; the picked one carries a check. */
export function ProfileList({ picked, onPick, size = 36 }: { picked: string; onPick: (id: string) => void; size?: number }) {
  const t = useT();
  const { profiles } = useProfiles();
  return (
    <div class="sf-list" role="radiogroup" aria-label={t('profiles.section')}>
      {profiles.map((p) => (
        <button type="button" role="radio" aria-checked={p.id === picked} class="sf-row sf-row--tall" onClick={() => onPick(p.id)}>
          <Avatar profile={p} size={size} />
          <span class="sf-row__title" style="flex:1">{p.name}</span>
          {p.id === picked && <span style="color:var(--accent-ink)"><Icon name="check" size={22} /></span>}
        </button>
      ))}
    </div>
  );
}

/** Opened from the avatar on Today. */
export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { switchTo, active } = useProfiles();
  return (
    <Sheet onClose={onClose} labelledBy="profiles-title">
      {(close) => (<>
      <div class="sf-sheet__head">
        <h2 class="sf-h2" id="profiles-title" style="flex:1">{t('profiles.switch')}</h2>
        <IconButton icon="close" label={t('common.close')} tone="sunk" size={22} onClick={close} />
      </div>
      <ProfileList picked={active.id} onPick={async (id) => { close(); await switchTo(id); }} />
      <AddProfileForm />
      </>)}
    </Sheet>
  );
}

/** First launch: no user yet — ask for a name, then go on to the app. Shown once. */
export function FirstRun({ onDone }: { onDone: (name: string) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const submit = (e: Event) => {
    e.preventDefault();
    if (name.trim()) onDone(name.trim());
  };
  return (
    <main class="screen" style="padding-top:calc(40px + var(--safe-top))">
      <div style="justify-self:center"><Illustration name="first-launch" width={240} height={180} /></div>
      <div class="screen__head">
        <h1 class="sf-title">{t('firstRun.title')}</h1>
        <p class="sf-meta">{t('firstRun.hint')}</p>
      </div>
      <form class="stack" onSubmit={submit}>
        <label class="sf-field__label" for="first-name">{t('profiles.name')}</label>
        <input id="first-name" class="sf-input sf-input--ui" style="background:var(--surface)" autoFocus autoComplete="given-name"
          placeholder={t('firstRun.placeholder')} value={name} maxLength={40} enterKeyHint="go"
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        <Button block iconEnd="chevron-right" type="submit" disabled={!name.trim()}>{t('profiles.continue')}</Button>
      </form>
    </main>
  );
}
