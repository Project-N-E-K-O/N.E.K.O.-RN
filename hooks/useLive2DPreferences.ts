/**
 * useLive2DPreferences Hook - Live2D 偏好设置持久化
 * 
 * 从 N.E.K.O Web 版本同步而来，用于管理 Live2D 模型的位置、缩放等偏好设置
 * 
 * 差异说明：
 * - Web 版本使用 API 端点进行持久化（/api/config/preferences）
 * - RN 版本使用 AsyncStorage 进行本地持久化
 * - 保持相同的数据结构和接口，便于跨平台兼容
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo } from 'react';

const PREFERENCES_KEY = '@neko:live2d_preferences';

export interface Live2DPreferencesSnapshot {
  modelUri: string;
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  parameters?: Record<string, number>;
}

export interface Live2DPreferencesRepository {
  load(modelUri: string): Promise<Live2DPreferencesSnapshot | null>;
  save(snapshot: Live2DPreferencesSnapshot): Promise<void>;
}

type RawPref = {
  model_path?: string;
  position?: { x?: number; y?: number };
  scale?: { x?: number; y?: number };
  parameters?: Record<string, number>;
  display?: { screenX?: number; screenY?: number };
};

function normalizePath(p: string): string {
  return String(p || '')
    .split('#')[0]
    .split('?')[0]
    .trim()
    .toLowerCase();
}

function fileName(p: string): string {
  const clean = String(p || '').split('#')[0].split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * 创建基于 AsyncStorage 的 Live2D 偏好设置仓库
 */
export function createLive2DPreferencesRepository(): Live2DPreferencesRepository {
  async function fetchAll(): Promise<RawPref[]> {
    try {
      const json = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (!json) return [];
      const data = JSON.parse(json);
      return Array.isArray(data) ? (data as RawPref[]) : [];
    } catch (e) {
      console.error('Failed to load preferences:', e);
      return [];
    }
  }

  async function saveAll(prefs: RawPref[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences:', e);
      throw e;
    }
  }

  function pickBest(all: RawPref[], modelUri: string): RawPref | null {
    const target = normalizePath(modelUri);
    if (!target) return null;

    // 1) 精确匹配
    const exact = all.find((p) => normalizePath(String(p?.model_path || '')) === target);
    if (exact) return exact;

    // 2) 文件名匹配
    const tName = fileName(modelUri);
    if (tName) {
      const byName = all.find((p) => fileName(String(p?.model_path || '')) === tName);
      if (byName) return byName;
    }

    // 3) 目录名包含匹配
    const parts = target.split('/').filter(Boolean);
    const modelDir = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (modelDir) {
      const byDir = all.find((p) => normalizePath(String(p?.model_path || '')).includes(`/${modelDir}/`));
      if (byDir) return byDir;
    }

    return null;
  }

  return {
    async load(modelUri: string): Promise<Live2DPreferencesSnapshot | null> {
      const all = await fetchAll();
      const pref = pickBest(all, modelUri);
      if (!pref) return null;

      const pos = pref.position || {};
      const scale = pref.scale || {};

      const snapshot: Live2DPreferencesSnapshot = {
        modelUri,
        position: isFiniteNumber(pos.x) && isFiniteNumber(pos.y) ? { x: pos.x, y: pos.y } : undefined,
        scale: isFiniteNumber(scale.x) && isFiniteNumber(scale.y) ? { x: scale.x, y: scale.y } : undefined,
        parameters: pref.parameters && typeof pref.parameters === 'object' ? pref.parameters : undefined,
      };
      return snapshot;
    },

    async save(snapshot: Live2DPreferencesSnapshot): Promise<void> {
      const position = snapshot.position;
      const scale = snapshot.scale;
      if (!position || !scale) return;

      // 验证数值有效性
      if (!isFiniteNumber(position.x) || !isFiniteNumber(position.y)) return;
      if (!isFiniteNumber(scale.x) || !isFiniteNumber(scale.y)) return;
      if (scale.x <= 0 || scale.y <= 0) return;

      const all = await fetchAll();
      const target = normalizePath(snapshot.modelUri);

      // 查找现有偏好设置
      const existingIndex = all.findIndex((p) => normalizePath(String(p?.model_path || '')) === target);

      const newPref: RawPref = {
        model_path: snapshot.modelUri,
        position: { x: position.x, y: position.y },
        scale: { x: scale.x, y: scale.y },
      };
      if (snapshot.parameters) newPref.parameters = snapshot.parameters;

      if (existingIndex >= 0) {
        // 更新现有偏好
        all[existingIndex] = newPref;
      } else {
        // 添加新偏好
        all.push(newPref);
      }

      await saveAll(all);
    },
  };
}

/**
 * useLive2DPreferences Hook
 * 
 * 提供 Live2D 偏好设置的加载和保存功能
 */
export function useLive2DPreferences() {
  const repository = useMemo(() => createLive2DPreferencesRepository(), []);

  const loadPreferences = useCallback(
    async (modelUri: string): Promise<Live2DPreferencesSnapshot | null> => {
      return repository.load(modelUri);
    },
    [repository]
  );

  const savePreferences = useCallback(
    async (snapshot: Live2DPreferencesSnapshot): Promise<void> => {
      return repository.save(snapshot);
    },
    [repository]
  );

  const clearPreferences = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(PREFERENCES_KEY);
    } catch (e) {
      console.error('Failed to clear preferences:', e);
      throw e;
    }
  }, []);

  return {
    loadPreferences,
    savePreferences,
    clearPreferences,
    repository,
  };
}
