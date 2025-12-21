import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal as RNModal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { createRequestClient } from '@project_neko/request';
import type { TokenStorage } from '@project_neko/request';

type Language = 'zh-CN' | 'en';

const trimTrailingSlash = (url?: string) => (url ? url.replace(/\/+$/, '') : '');

const API_BASE = trimTrailingSlash(
  // 兼容：宿主可能在 globalThis 上注入（对齐 web 端 window.API_BASE_URL 语义）
  ((globalThis as any)?.API_BASE_URL as string | undefined) ||
    // Expo/RN 环境变量（可选）
    ((typeof process !== 'undefined' ? (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL : undefined) as string | undefined) ||
    'http://localhost:48911',
);

const STATIC_BASE = trimTrailingSlash(
  ((globalThis as any)?.STATIC_SERVER_URL as string | undefined) ||
    ((typeof process !== 'undefined' ? (process as any)?.env?.EXPO_PUBLIC_STATIC_SERVER_URL : undefined) as string | undefined) ||
    API_BASE,
);

class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }
  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
  }
  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }
  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
  }
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

const interpolate = (template: string, params?: Record<string, unknown>) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const v = (params as any)[name];
    return v === undefined || v === null ? '' : String(v);
  });
};

const dict: Record<Language, Record<string, string>> = {
  'zh-CN': {
    'webapp.errors.requestFailed': '请求失败',
    'webapp.toast.apiSuccess': '接口调用成功（示例 toast）',
    'webapp.toast.confirmed': '确认已执行',
    'webapp.toast.hello': '你好，{name}!',
    'webapp.modal.alertMessage': '这是一条 Alert 弹窗',
    'webapp.modal.alertTitle': '提示',
    'webapp.modal.confirmMessage': '确认要执行该操作吗？',
    'webapp.modal.confirmTitle': '确认',
    'webapp.modal.okText': '好的',
    'webapp.modal.cancelText': '再想想',
    'webapp.modal.promptMessage': '请输入昵称：',
    'webapp.header.title': 'N.E.K.O 前端主页',
    'webapp.header.subtitle': '单页应用，无路由 / 无 SSR',
    'webapp.language.label': '语言',
    'webapp.language.zhCN': '中文',
    'webapp.language.en': 'English',
    'webapp.card.title': '开始使用',
    'webapp.card.step1': '在此处挂载你的组件或业务入口。',
    'webapp.card.step2Prefix': '如需调用接口，可在 ',
    'webapp.card.step2Suffix': ' 基础上封装请求。',
    'webapp.card.step3Prefix': '构建产物输出到 ',
    'webapp.card.step3Suffix': '（用于开发/调试），模板按需引用即可。',
    'webapp.actions.requestPageConfig': '请求 page_config',
    'webapp.actions.showToast': '显示 StatusToast',
    'webapp.actions.modalAlert': 'Modal Alert',
    'webapp.actions.modalConfirm': 'Modal Confirm',
    'webapp.actions.modalPrompt': 'Modal Prompt',
    'common.alert': '提示',
    'common.confirm': '确认',
    'common.input': '输入',
  },
  en: {
    'webapp.errors.requestFailed': 'Request failed',
    'webapp.toast.apiSuccess': 'API call succeeded (toast demo)',
    'webapp.toast.confirmed': 'Confirmed',
    'webapp.toast.hello': 'Hello, {name}!',
    'webapp.modal.alertMessage': 'This is an Alert dialog',
    'webapp.modal.alertTitle': 'Notice',
    'webapp.modal.confirmMessage': 'Are you sure you want to proceed?',
    'webapp.modal.confirmTitle': 'Confirm',
    'webapp.modal.okText': 'OK',
    'webapp.modal.cancelText': 'Cancel',
    'webapp.modal.promptMessage': 'Enter your nickname:',
    'webapp.header.title': 'N.E.K.O Web Home',
    'webapp.header.subtitle': 'Single-page app (no router / no SSR)',
    'webapp.language.label': 'Language',
    'webapp.language.zhCN': '中文',
    'webapp.language.en': 'English',
    'webapp.card.title': 'Get started',
    'webapp.card.step1': 'Mount your components or business entry here.',
    'webapp.card.step2Prefix': 'To call APIs, you can wrap requests on top of ',
    'webapp.card.step2Suffix': '.',
    'webapp.card.step3Prefix': 'Build output goes to ',
    'webapp.card.step3Suffix': ' (for dev/debug). Templates can reference it as needed.',
    'webapp.actions.requestPageConfig': 'Request page_config',
    'webapp.actions.showToast': 'Show StatusToast',
    'webapp.actions.modalAlert': 'Modal Alert',
    'webapp.actions.modalConfirm': 'Modal Confirm',
    'webapp.actions.modalPrompt': 'Modal Prompt',
    'common.alert': 'Alert',
    'common.confirm': 'Confirm',
    'common.input': 'Input',
  },
};

function useT(language: Language): TranslateFn {
  return useCallback(
    (key: string, params?: Record<string, unknown>) => {
      const raw = dict[language]?.[key];
      return raw ? interpolate(raw, params) : key;
    },
    [language],
  );
}

function tOrDefault(t: TranslateFn, key: string, fallback: string, params?: Record<string, unknown>) {
  try {
    const s = t(key, params);
    if (s && s !== key) return s;
  } catch {
    // ignore
  }
  return interpolate(fallback, params);
}

export interface StatusToastHandle {
  show: (message: string, duration?: number) => void;
}

const StatusToast = forwardRef<StatusToastHandle | null, { staticBaseUrl?: string }>(function StatusToastRN(
  _props,
  ref,
) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string, duration = 2500) => {
      const next = (msg || '').trim();
      if (!next) return;

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      setMessage(next);
      setVisible(true);
      opacity.stopAnimation();
      translateY.stopAnimation();
      opacity.setValue(0);
      translateY.setValue(-10);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();

      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(translateY, {
            toValue: -10,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (!finished) return;
          setVisible(false);
          setMessage('');
        });
      }, Math.max(300, duration));
    },
    [opacity, translateY],
  );

  useImperativeHandle(ref, () => ({ show }), [show]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.toastContainer, { opacity, transform: [{ translateY }] }]}>
      <ThemedText type="defaultSemiBold" style={styles.toastText}>
        {message}
      </ThemedText>
    </Animated.View>
  );
});

type DialogType = 'alert' | 'confirm' | 'prompt';
type AlertConfig = { type: 'alert'; message: string; title?: string | null; okText?: string };
type ConfirmConfig = {
  type: 'confirm';
  message: string;
  title?: string | null;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};
type PromptConfig = {
  type: 'prompt';
  message: string;
  title?: string | null;
  defaultValue?: string;
  placeholder?: string;
  okText?: string;
  cancelText?: string;
};
type DialogConfig = AlertConfig | ConfirmConfig | PromptConfig;

export interface ModalHandle {
  alert: (message: string, title?: string | null) => Promise<boolean>;
  confirm: (
    message: string,
    title?: string | null,
    options?: { okText?: string; cancelText?: string; danger?: boolean },
  ) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string | null) => Promise<string | null>;
}

const Modal = forwardRef<
  ModalHandle | null,
  {
    t: TranslateFn;
  }
>(function ModalRN({ t }, ref) {
  const [state, setState] = useState<{ isOpen: boolean; config: DialogConfig | null; resolve: ((v: any) => void) | null }>(
    { isOpen: false, config: null, resolve: null },
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getDefaultTitle = useCallback(
    (type: DialogType) => {
      switch (type) {
        case 'alert':
          return t('common.alert') || '提示';
        case 'confirm':
          return t('common.confirm') || '确认';
        case 'prompt':
          return t('common.input') || '输入';
        default:
          return '提示';
      }
    },
    [t],
  );

  const createDialog = useCallback((config: DialogConfig) => {
    return new Promise<any>((resolve) => {
      setState({ isOpen: true, config, resolve });
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState((prev) => {
      if (prev.resolve && prev.config) {
        if (prev.config.type === 'prompt') prev.resolve(null);
        else if (prev.config.type === 'confirm') prev.resolve(false);
        else prev.resolve(true);
      }
      return { isOpen: false, config: null, resolve: null };
    });
  }, []);

  const handleConfirm = useCallback((value?: any) => {
    setState((prev) => {
      if (prev.resolve) {
        if (prev.config?.type === 'prompt') prev.resolve(value ?? '');
        else prev.resolve(true);
      }
      return { isOpen: false, config: null, resolve: null };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      if (prev.resolve) {
        if (prev.config?.type === 'prompt') prev.resolve(null);
        else prev.resolve(false);
      }
      return { isOpen: false, config: null, resolve: null };
    });
  }, []);

  const showAlert = useCallback(
    (message: string, title: string | null = null) => {
      return createDialog({ type: 'alert', message, title: title !== null ? title : getDefaultTitle('alert') });
    },
    [createDialog, getDefaultTitle],
  );

  const showConfirm = useCallback(
    (message: string, title: string | null = null, options: { okText?: string; cancelText?: string; danger?: boolean } = {}) => {
      return createDialog({
        type: 'confirm',
        message,
        title: title !== null ? title : getDefaultTitle('confirm'),
        okText: options.okText,
        cancelText: options.cancelText,
        danger: !!options.danger,
      });
    },
    [createDialog, getDefaultTitle],
  );

  const showPrompt = useCallback(
    (message: string, defaultValue = '', title: string | null = null) => {
      return createDialog({
        type: 'prompt',
        message,
        defaultValue,
        title: title !== null ? title : getDefaultTitle('prompt'),
      });
    },
    [createDialog, getDefaultTitle],
  );

  useImperativeHandle(ref, () => ({ alert: showAlert, confirm: showConfirm, prompt: showPrompt }), [showAlert, showConfirm, showPrompt]);

  useEffect(() => {
    return () => {
      if (!stateRef.current.isOpen) return;
      const { resolve, config } = stateRef.current;
      if (resolve && config) {
        if (config.type === 'prompt') resolve(null);
        else if (config.type === 'confirm') resolve(false);
        else resolve(true);
      }
      stateRef.current = { isOpen: false, config: null, resolve: null };
    };
  }, []);

  const config = state.config;
  const isOpen = state.isOpen && !!config;

  // Prompt 输入状态（仅 prompt 时使用）
  const [promptValue, setPromptValue] = useState('');
  useEffect(() => {
    if (config?.type === 'prompt' && isOpen) {
      setPromptValue(String(config.defaultValue ?? ''));
    }
  }, [config, isOpen]);

  return (
    <RNModal transparent visible={isOpen} animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.modalOverlay} onPress={closeDialog}>
        <Pressable style={styles.modalDialog} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {config?.title ?? ''}
          </ThemedText>
          <ThemedText type="default" style={styles.modalMessage}>
            {config?.message ?? ''}
          </ThemedText>

          {config?.type === 'prompt' && (
            <TextInput
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder={config.placeholder}
              style={styles.modalInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <View style={styles.modalActions}>
            {(config?.type === 'confirm' || config?.type === 'prompt') && (
              <Pressable style={({ pressed }) => [styles.modalBtn, styles.modalBtnSecondary, pressed && styles.btnPressed]} onPress={handleCancel}>
                <ThemedText type="defaultSemiBold">
                  {(config as ConfirmConfig | PromptConfig | null)?.cancelText || t('webapp.modal.cancelText') || '取消'}
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                (config?.type === 'confirm' && (config as ConfirmConfig).danger ? styles.modalBtnDanger : styles.modalBtnPrimary),
                pressed && styles.btnPressed,
              ]}
              onPress={() => {
                if (config?.type === 'prompt') handleConfirm(promptValue);
                else handleConfirm(true);
              }}
            >
              <ThemedText type="defaultSemiBold" style={styles.modalBtnTextOnPrimary}>
                {(config as AlertConfig | ConfirmConfig | PromptConfig | null)?.okText || t('webapp.modal.okText') || '确定'}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
});

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

function AppButton({
  variant = 'primary',
  onPress,
  children,
}: {
  variant?: ButtonVariant;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'success' && styles.btnSuccess,
        variant === 'danger' && styles.btnDanger,
        pressed && styles.btnPressed,
      ]}
    >
      <ThemedText type="defaultSemiBold" style={variant === 'secondary' ? styles.btnTextSecondary : styles.btnTextOnPrimary}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export default function WebAppLikeScreen() {
  const [language, setLanguage] = useState<Language>('zh-CN');
  const t = useT(language);

  const toastRef = useRef<StatusToastHandle | null>(null);
  const modalRef = useRef<ModalHandle | null>(null);

  const storageRef = useRef<MemoryTokenStorage>(new MemoryTokenStorage());
  const request = useMemo(() => {
    return createRequestClient({
      baseURL: API_BASE,
      storage: storageRef.current,
      refreshApi: async () => {
        throw new Error('refreshApi not implemented');
      },
      returnDataOnly: true,
    });
  }, []);

  // 对齐 web 端：监听 localechange（仅 web 环境存在 window）
  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined;
    if (!w?.addEventListener) return;

    const getLang = () => {
      try {
        return w?.i18n?.language || (typeof navigator !== 'undefined' ? navigator.language : null) || 'unknown';
      } catch {
        return 'unknown';
      }
    };

    console.log('[rn-webapp] 当前 i18n 语言:', getLang());
    const onLocaleChange = () => console.log('[rn-webapp] i18n 语言已更新:', getLang());
    w.addEventListener('localechange', onLocaleChange);
    return () => w.removeEventListener('localechange', onLocaleChange);
  }, []);

  const handleClick = useCallback(async () => {
    try {
      const data = await (request as any).get('/api/config/page_config', { params: { lanlan_name: 'test' } });
      console.log('page_config:', data);
    } catch (err: any) {
      console.error(tOrDefault(t, 'webapp.errors.requestFailed', '请求失败'), err);
    }
  }, [request, t]);

  const handleToast = useCallback(() => {
    toastRef.current?.show(tOrDefault(t, 'webapp.toast.apiSuccess', '接口调用成功（示例 toast）'), 2500);
  }, [t]);

  const handleAlert = useCallback(async () => {
    await modalRef.current?.alert(
      tOrDefault(t, 'webapp.modal.alertMessage', '这是一条 Alert 弹窗'),
      tOrDefault(t, 'webapp.modal.alertTitle', '提示'),
    );
  }, [t]);

  const handleConfirm = useCallback(async () => {
    const ok =
      (await modalRef.current?.confirm(
        tOrDefault(t, 'webapp.modal.confirmMessage', '确认要执行该操作吗？'),
        tOrDefault(t, 'webapp.modal.confirmTitle', '确认'),
        {
          okText: tOrDefault(t, 'webapp.modal.okText', '好的'),
          cancelText: tOrDefault(t, 'webapp.modal.cancelText', '再想想'),
          danger: false,
        },
      )) ?? false;
    if (ok) toastRef.current?.show(tOrDefault(t, 'webapp.toast.confirmed', '确认已执行'), 2000);
  }, [t]);

  const handlePrompt = useCallback(async () => {
    const name = await modalRef.current?.prompt(tOrDefault(t, 'webapp.modal.promptMessage', '请输入昵称：'), 'Neko');
    if (name) {
      toastRef.current?.show(tOrDefault(t, 'webapp.toast.hello', '你好，{name}!', { name }), 2500);
    }
  }, [t]);

  return (
    <View style={styles.root}>
      <StatusToast ref={toastRef} staticBaseUrl={STATIC_BASE} />
      <Modal ref={modalRef} t={t} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText type="title">{tOrDefault(t, 'webapp.header.title', 'N.E.K.O 前端主页')}</ThemedText>
              <ThemedText type="default">{tOrDefault(t, 'webapp.header.subtitle', '单页应用，无路由 / 无 SSR')}</ThemedText>
            </View>

            <View style={styles.langSwitch}>
              <ThemedText type="defaultSemiBold" style={styles.langLabel}>
                {tOrDefault(t, 'webapp.language.label', '语言')}
              </ThemedText>
              <View style={styles.langSeg}>
                <Pressable
                  onPress={() => setLanguage('zh-CN')}
                  style={({ pressed }) => [
                    styles.langSegBtn,
                    language === 'zh-CN' && styles.langSegBtnActive,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={language === 'zh-CN' ? styles.langSegTextActive : undefined}>
                    {tOrDefault(t, 'webapp.language.zhCN', '中文')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setLanguage('en')}
                  style={({ pressed }) => [
                    styles.langSegBtn,
                    language === 'en' && styles.langSegBtnActive,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={language === 'en' ? styles.langSegTextActive : undefined}>
                    {tOrDefault(t, 'webapp.language.en', 'English')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{tOrDefault(t, 'webapp.card.title', '开始使用')}</ThemedText>

          <View style={styles.ol}>
            <View style={styles.li}>
              <ThemedText type="default">{`1. ${tOrDefault(t, 'webapp.card.step1', '在此处挂载你的组件或业务入口。')}`}</ThemedText>
            </View>
            <View style={styles.li}>
              <ThemedText type="default">{`2. ${tOrDefault(t, 'webapp.card.step2Prefix', '如需调用接口，可在 ')}`}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.code}>
                @project_neko/request
              </ThemedText>
              <ThemedText type="default">{tOrDefault(t, 'webapp.card.step2Suffix', ' 基础上封装请求。')}</ThemedText>
            </View>
            <View style={styles.li}>
              <ThemedText type="default">{`3. ${tOrDefault(t, 'webapp.card.step3Prefix', '构建产物输出到 ')}`}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.code}>
                frontend/dist/webapp
              </ThemedText>
              <ThemedText type="default">{tOrDefault(t, 'webapp.card.step3Suffix', '（用于开发/调试），模板按需引用即可。')}</ThemedText>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton onPress={handleClick}>{tOrDefault(t, 'webapp.actions.requestPageConfig', '请求 page_config')}</AppButton>
            <AppButton variant="secondary" onPress={handleToast}>
              {tOrDefault(t, 'webapp.actions.showToast', '显示 StatusToast')}
            </AppButton>
            <AppButton variant="primary" onPress={handleAlert}>
              {tOrDefault(t, 'webapp.actions.modalAlert', 'Modal Alert')}
            </AppButton>
            <AppButton variant="success" onPress={handleConfirm}>
              {tOrDefault(t, 'webapp.actions.modalConfirm', 'Modal Confirm')}
            </AppButton>
            <AppButton variant="danger" onPress={handlePrompt}>
              {tOrDefault(t, 'webapp.actions.modalPrompt', 'Modal Prompt')}
            </AppButton>
          </View>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },

  header: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { flex: 1, gap: 4 },

  langSwitch: { alignItems: 'flex-end', gap: 6 },
  langLabel: { opacity: 0.8 },
  langSeg: { flexDirection: 'row', gap: 8 },
  langSegBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    backgroundColor: '#fff',
  },
  langSegBtnActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  langSegTextActive: { color: '#1d4ed8' },

  card: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  ol: { gap: 8 },
  li: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  code: {
    fontFamily: 'Menlo',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 4,
  },

  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#111827' },
  btnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  btnSuccess: { backgroundColor: '#16a34a' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnPressed: { opacity: 0.7 },
  btnTextOnPrimary: { color: '#fff' },
  btnTextSecondary: { color: '#111827' },

  toastContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 999,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  toastText: { color: '#fff', textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
    justifyContent: 'center',
  },
  modalDialog: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fff',
    gap: 10,
  },
  modalTitle: { color: '#111827' },
  modalMessage: { color: '#374151' },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: { backgroundColor: '#111827' },
  modalBtnDanger: { backgroundColor: '#dc2626' },
  modalBtnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  modalBtnTextOnPrimary: { color: '#fff' },
});


