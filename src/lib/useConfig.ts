import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Config, DomainConfig } from '../model/types';
import { defaultConfig } from '../model/defaults';
import { getConfig, putConfig } from '../storage/db';
import { schedulePush } from '../storage/sync';
import { nowIso } from './dates';

export function useConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  useEffect(() => {
    const load = () => void getConfig().then(setConfig);
    load();
    window.addEventListener('spheres:synced', load);
    return () => window.removeEventListener('spheres:synced', load);
  }, []);

  const save = useCallback(async (domains: DomainConfig[]) => {
    const next: Config = { ...config, domains: domains.map((d, order) => ({ ...d, order })), updatedAt: nowIso() };
    await putConfig(next);
    setConfig(next);
    schedulePush();
  }, [config]);

  const sorted = [...config.domains].sort((a, b) => a.order - b.order);
  return { config, domains: sorted, active: sorted.filter((d) => d.active), save };
}
