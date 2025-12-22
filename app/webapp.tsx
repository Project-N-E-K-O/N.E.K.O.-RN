import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Modal as RNModal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

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
  props,
  ref,
) {
  const { width } = useWindowDimensions();
  const isNarrow = width <= 600;
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

  const bgUri = useMemo(() => {
    const base = trimTrailingSlash(props.staticBaseUrl || STATIC_BASE);
    return base ? `${base}/static/icons/toast_background.png` : '';
  }, [props.staticBaseUrl]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[
        styles.toastContainer,
        isNarrow ? styles.toastContainerNarrow : null,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <ImageBackground
        source={bgUri ? { uri: bgUri } : undefined}
        resizeMode="stretch"
        style={styles.toastBg}
        imageStyle={styles.toastBgImage}
      >
        <View style={styles.toastOverlay} />
        <ThemedText style={styles.toastPaw} pointerEvents="none">
          🐾
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.toastText} pointerEvents="none">
          {message}
        </ThemedText>
      </ImageBackground>
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
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {config?.title ?? ''}
            </ThemedText>
          </View>

          <View style={styles.modalBody}>
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
          </View>

          <View style={styles.modalFooter}>
            {(config?.type === 'confirm' || config?.type === 'prompt') && (
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnSecondary, pressed ? styles.modalBtnPressed : null]}
                onPress={handleCancel}
              >
                <ThemedText type="defaultSemiBold" style={styles.modalBtnTextOnSecondary}>
                  {(config as ConfirmConfig | PromptConfig | null)?.cancelText || t('webapp.modal.cancelText') || '取消'}
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                config?.type === 'confirm' && (config as ConfirmConfig).danger ? styles.modalBtnDanger : styles.modalBtnPrimary,
                pressed ? styles.modalBtnPressed : null,
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
        pressed ? styles.btnPressed : null,
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

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.app}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText type="title" style={styles.h1}>
                  {tOrDefault(t, 'webapp.header.title', 'N.E.K.O 前端主页')}
                </ThemedText>
                <ThemedText type="default" style={styles.subtitle}>
                  {tOrDefault(t, 'webapp.header.subtitle', '单页应用，无路由 / 无 SSR')}
                </ThemedText>
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
                      language === 'zh-CN' ? styles.langSegBtnActive : null,
                      pressed ? styles.langSegBtnPressed : null,
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" style={language === 'zh-CN' ? styles.langSegTextActive : styles.langSegText}>
                      {tOrDefault(t, 'webapp.language.zhCN', '中文')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setLanguage('en')}
                    style={({ pressed }) => [
                      styles.langSegBtn,
                      language === 'en' ? styles.langSegBtnActive : null,
                      pressed ? styles.langSegBtnPressed : null,
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" style={language === 'en' ? styles.langSegTextActive : styles.langSegText}>
                      {tOrDefault(t, 'webapp.language.en', 'English')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {tOrDefault(t, 'webapp.card.title', '开始使用')}
            </ThemedText>

            <View style={styles.ol}>
              <View style={styles.li}>
                <ThemedText type="default" style={styles.listText}>
                  {`1. ${tOrDefault(t, 'webapp.card.step1', '在此处挂载你的组件或业务入口。')}`}
                </ThemedText>
              </View>
              <View style={styles.li}>
                <ThemedText type="default" style={styles.listText}>
                  {`2. ${tOrDefault(t, 'webapp.card.step2Prefix', '如需调用接口，可在 ')}`}
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.code}>
                  @project_neko/request
                </ThemedText>
                <ThemedText type="default" style={styles.listText}>
                  {tOrDefault(t, 'webapp.card.step2Suffix', ' 基础上封装请求。')}
                </ThemedText>
              </View>
              <View style={styles.li}>
                <ThemedText type="default" style={styles.listText}>
                  {`3. ${tOrDefault(t, 'webapp.card.step3Prefix', '构建产物输出到 ')}`}
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.code}>
                  frontend/dist/webapp
                </ThemedText>
                <ThemedText type="default" style={styles.listText}>
                  {tOrDefault(t, 'webapp.card.step3Suffix', '（用于开发/调试），模板按需引用即可。')}
                </ThemedText>
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ===== WebApp (frontend/src/web/styles.css) 对齐：页面背景 / maxWidth / padding =====
  root: { flex: 1, backgroundColor: '#f8fafc' },
  page: { paddingTop: 48, paddingBottom: 96, paddingHorizontal: 24 },
  app: { width: '100%', maxWidth: 960, alignSelf: 'center' },

  header: {},
  headerRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { flex: 1, gap: 4 },
  h1: { fontSize: 28, marginBottom: 8, color: '#0f172a' },
  subtitle: { color: '#475569' },

  langSwitch: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  langLabel: { fontSize: 14, color: '#475569' },
  langSeg: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  langSegBtn: {
    height: 32,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  langSegBtnActive: { borderColor: '#44b7fe', backgroundColor: '#d5f1ff' },
  langSegBtnPressed: { opacity: 0.9 },
  langSegText: { color: '#0f172a' },
  langSegTextActive: { color: '#0f172a' },

  // ===== Card (frontend/src/web/styles.css) 对齐 =====
  card: {
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 12,
  },
  cardTitle: { color: '#0f172a' },
  ol: { gap: 8 },
  li: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  listText: { color: '#334155' },
  code: {
    fontFamily: 'Menlo',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 4,
    color: '#0f172a',
  },

  actions: { marginTop: 16, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  // ===== Button (packages/components/src/Button.css) 对齐 =====
  btn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#44b7fe' },
  btnSecondary: { backgroundColor: '#d5f1ff' },
  btnSuccess: { backgroundColor: '#44b7fe' },
  btnDanger: { backgroundColor: '#ff6b6b' },
  btnPressed: { opacity: 0.85 },
  btnTextOnPrimary: { color: '#fff' },
  btnTextSecondary: { color: '#333' },

  // ===== StatusToast (packages/components/src/StatusToast.css) 对齐（近似实现）=====
  toastContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 999,
    minWidth: 280,
    maxWidth: 500,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toastContainerNarrow: {
    top: 10,
    left: 10,
    right: 10,
    minWidth: 0,
    maxWidth: undefined,
  },
  toastBg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    paddingLeft: 50,
    paddingRight: 50,
    justifyContent: 'center',
  },
  toastBgImage: { borderRadius: 12 },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  toastPaw: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -25 }],
    fontSize: 50,
    color: '#fff',
  },
  toastText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '500', lineHeight: 18 * 1.6 },

  // ===== Modal (packages/components/src/Modal/Modal.css) 对齐 =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDialog: {
    width: '100%',
    minWidth: 320,
    maxWidth: 500,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modalHeader: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: { color: '#222', fontWeight: '600' },
  modalBody: { paddingVertical: 20, paddingHorizontal: 24 },
  modalMessage: { color: '#444', lineHeight: 16 * 1.6 },
  modalInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 6,
    fontSize: 16,
    marginTop: 12,
    backgroundColor: '#fff',
  },
  modalFooter: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPressed: { opacity: 0.85 },
  modalBtnPrimary: { backgroundColor: '#4f8cff' },
  modalBtnSecondary: { backgroundColor: '#e0e0e0' },
  modalBtnDanger: { backgroundColor: '#e74c3c' },
  modalBtnTextOnPrimary: { color: '#fff' },
  modalBtnTextOnSecondary: { color: '#444' },
});


