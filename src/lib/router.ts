import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'today'; date?: string }
  | { name: 'checkin'; date: string; step: number }
  | { name: 'history' }
  | { name: 'insights' }
  | { name: 'settings' }
  | { name: 'styleguide' };

/** Hash routing: GitHub Pages has no SPA fallback. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  switch (parts[0]) {
    case 'day':
      return isDate(parts[1]) ? { name: 'today', date: parts[1] } : { name: 'today' };
    case 'checkin': {
      const step = Number(parts[2]);
      if (isDate(parts[1])) return { name: 'checkin', date: parts[1], step: step >= 3 && step <= 5 ? step : 3 };
      return { name: 'today' };
    }
    case 'history':
    case 'insights':
    case 'settings':
    case 'styleguide':
      return { name: parts[0] };
    default:
      return { name: 'today' };
  }
}

export const go = (path: string) => {
  location.hash = '#/' + path;
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const f = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}
