import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Config, DomainConfig } from '../model/types';
import { defaultConfig } from '../model/defaults';
import { db, getConfig, putConfig } from '../storage/db';
import { schedulePush } from '../storage/sync';
import { nowIso } from './dates';

export function useConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const store = useRef(db).current;
  useEffect(() => {
    const load = () => void getConfig(store).then(setConfig);
    load();
    window.addEventListener('spheres:synced', load);
    return () => window.removeEventListener('spheres:synced', load);
  }, [store]);

  const save = useCallback(async (domains: DomainConfig[]) => {
    const next: Config = { ...config, domains: domains.map((d, order) => ({ ...d, order })), updatedAt: nowIso() };
    await putConfig(next, {}, store);
    setConfig(next);
    schedulePush();
  }, [config, store]);

  const sorted = [...config.domains].sort((a, b) => a.order - b.order);
  return { config, domains: sorted, active: sorted.filter((d) => d.active), save };
}
