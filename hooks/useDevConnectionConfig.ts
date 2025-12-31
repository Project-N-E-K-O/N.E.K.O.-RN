import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DEV_CONNECTION_CONFIG,
  parseDevConnectionConfig,
  type DevConnectionConfig,
} from '@/utils/devConnectionConfig';
import { clearStoredDevConnectionConfig, getStoredDevConnectionConfig, setStoredDevConnectionConfig } from '@/services/DevConnectionStorage';

export type ApplyQrResult =
  | { ok: true; config: DevConnectionConfig }
  | { ok: false; error: string };

export function useDevConnectionConfig(): {
  config: DevConnectionConfig;
  isLoaded: boolean;
  setConfig: (next: Partial<DevConnectionConfig> | ((prev: DevConnectionConfig) => DevConnectionConfig)) => Promise<DevConnectionConfig>;
  applyQrRaw: (raw: string) => Promise<ApplyQrResult>;
  clear: () => Promise<void>;
} {
  const [config, _setConfig] = useState<DevConnectionConfig>(DEFAULT_DEV_CONNECTION_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const configRef = useRef<DevConnectionConfig>(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredDevConnectionConfig();
      if (cancelled) return;
      _setConfig(stored);
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setConfig = useCallback(
    async (next: Partial<DevConnectionConfig> | ((prev: DevConnectionConfig) => DevConnectionConfig)) => {
      const prev = configRef.current;
      const computed =
        typeof next === 'function' ? (next as (p: DevConnectionConfig) => DevConnectionConfig)(prev) : { ...prev, ...next };
      _setConfig(computed);
      configRef.current = computed;
      // 统一走 storage 的 sanitize + merge
      const persisted = await setStoredDevConnectionConfig(computed);
      _setConfig(persisted);
      configRef.current = persisted;
      return persisted;
    },
    []
  );

  const applyQrRaw = useCallback(
    async (raw: string): Promise<ApplyQrResult> => {
      const parsed = parseDevConnectionConfig(raw);
      if (!parsed) return { ok: false, error: '二维码内容不可解析（请扫 JSON / URL / host:port 格式）' };
      const next = await setConfig((prev) => ({ ...prev, ...parsed }));
      return { ok: true, config: next };
    },
    [setConfig]
  );

  const clear = useCallback(async () => {
    await clearStoredDevConnectionConfig();
    _setConfig(DEFAULT_DEV_CONNECTION_CONFIG);
    configRef.current = DEFAULT_DEV_CONNECTION_CONFIG;
  }, []);

  return { config, isLoaded, setConfig, applyQrRaw, clear };
}

