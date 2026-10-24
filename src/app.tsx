import { useEffect, useMemo, useState } from 'preact/hooks';
import { I18n, makeT, type Lang } from './i18n/t';
import { useRoute } from './lib/router';
import { getSettings, patchSettings, type LocalSettings } from './storage/db';
import { initSync } from './storage/sync';
import { Today } from './routes/Today';
import { CheckIn } from './routes/CheckIn';
import { History } from './routes/History';
import { Insights } from './routes/Insights';
import { Settings } from './routes/Settings';
import { InstallHint } from './components/InstallHint';

type Theme = LocalSettings['theme'];

export function App() {
  const route = useRoute();
  const [lang, setLangState] = useState<Lang>('uk');
  const [theme, setThemeState] = useState<Theme>('system');
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    void getSettings().then((s) => {
      setLangState(s.lang);
      setThemeState(s.theme);
      const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
      setShowHint(!standalone && !s.installHintSeen && /iPhone|iPad|iPod/.test(navigator.userAgent));
      setReady(true);
    });
    void initSync();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const r = document.documentElement;
    if (theme === 'system') r.removeAttribute('data-theme');
    else r.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const setLang = (l: Lang) => { setLangState(l); void patchSettings({ lang: l }); };
  const setTheme = (th: Theme) => { setThemeState(th); void patchSettings({ theme: th }); };
  const ctx = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);

  if (!ready) return null;
  return (
    <I18n.Provider value={ctx}>
      {route.name === 'today' && <Today key={route.date ?? 'today'} date={route.date} />}
      {route.name === 'checkin' && <CheckIn key={route.date + route.step} date={route.date} step={route.step} />}
      {route.name === 'history' && <History />}
      {route.name === 'insights' && <Insights />}
      {(route.name === 'settings' || route.name === 'styleguide') && (
        <Settings theme={theme} setTheme={setTheme} setLang={setLang} toast={setToast} />
      )}
      {showHint && <InstallHint onClose={() => { setShowHint(false); void patchSettings({ installHintSeen: true }); }} />}
      {toast && <div class="toast" role="status">{toast}</div>}
    </I18n.Provider>
  );
}
