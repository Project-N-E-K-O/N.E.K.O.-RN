import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { createRequestClient } from '@project_neko/request';
import type { TokenRefreshFn, TokenStorage } from '@project_neko/request';
import { useDevConnectionConfig } from '@/hooks/useDevConnectionConfig';
import { buildHttpBaseURL, DEFAULT_DEV_CONNECTION_CONFIG } from '@/utils/devConnectionConfig';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type StatusToastShow = (message: string, duration?: number) => void;

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

const safeJsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
};

const truncateForToast = (text: string, maxLen = 900) => {
  const s = String(text ?? '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen))}\n…(已截断，完整内容见下方“结果”)`;
};

const tryParseJson = (text: string): { ok: true; value: any } | { ok: false; error: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${String(e)}` };
  }
};

function useStatusToast(): { show: StatusToastShow; element: React.ReactNode } {
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show: StatusToastShow = (msg, duration = 2000) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const next = (msg || '').trim();
    if (!next) return;

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
        Animated.timing(translateY, { toValue: -10, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setVisible(false);
          setMessage('');
        }
      });
    }, Math.max(300, duration));
  };

  const element = visible ? (
    <Animated.View style={[styles.toastContainer, { opacity, transform: [{ translateY }] }]}>
      <ThemedText type="defaultSemiBold" style={styles.toastText}>
        {message}
      </ThemedText>
    </Animated.View>
  ) : null;

  return { show, element };
}

export default function RequestLabScreen() {
  const storageRef = useRef<MemoryTokenStorage>(new MemoryTokenStorage());
  const toast = useStatusToast();
  const { config } = useDevConnectionConfig();

  const defaultBaseURL = useMemo(() => buildHttpBaseURL(DEFAULT_DEV_CONNECTION_CONFIG), []);
  const suggestedBaseURL = useMemo(() => buildHttpBaseURL(config), [config.host, config.port]);
  const [baseURL, setBaseURL] = useState(() => defaultBaseURL);

  // 若用户还没手动改过 baseURL（保持默认），则跟随全局扫码配置自动更新
  useEffect(() => {
    setBaseURL((prev) => {
      const trimmed = (prev ?? '').trim();
      if (!trimmed || trimmed === defaultBaseURL) return suggestedBaseURL;
      return prev;
    });
  }, [defaultBaseURL, suggestedBaseURL]);

  const [path, setPath] = useState('/api/config/page_config');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  // 对齐 Web `App.tsx`：request.get("/api/config/page_config", { params: { lanlan_name: "test" } })
  const [paramsText, setParamsText] = useState('{\n  "lanlan_name": "test"\n}');
  const [bodyText, setBodyText] = useState('{\n  \n}');

  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const [refreshEndpointPath, setRefreshEndpointPath] = useState('/api/auth/refresh');

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const refreshApi: TokenRefreshFn = useMemo(() => {
    const fn: TokenRefreshFn = async (rt: string) => {
      const url = `${baseURL.replace(/\/+$/, '')}${refreshEndpointPath.startsWith('/') ? '' : '/'}${refreshEndpointPath}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      let data: any = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      if (!resp.ok) {
        const msg = (data && (data.message || data.error)) || `刷新 Token 失败：${resp.status} ${resp.statusText}`;
        throw new Error(msg);
      }

      const newAccessToken = data?.access_token ?? data?.accessToken;
      const newRefreshToken = data?.refresh_token ?? data?.refreshToken;
      if (!newAccessToken || !newRefreshToken) {
        throw new Error('刷新 Token 返回缺少 access_token/refresh_token（或 accessToken/refreshToken）');
      }

      return { accessToken: String(newAccessToken), refreshToken: String(newRefreshToken) };
    };
    return fn;
  }, [baseURL, refreshEndpointPath]);

  const client = useMemo(() => {
    const normalizedBaseURL = baseURL.trim().replace(/\/+$/, '');
    return createRequestClient({
      baseURL: normalizedBaseURL,
      storage: storageRef.current,
      refreshApi,
      returnDataOnly: false,
      // RN 环境默认不开日志；需要时可在 JS runtime 里设置：
      // globalThis.NEKO_REQUEST_LOG_ENABLED = true
    });
  }, [baseURL, refreshApi]);

  const readTokensFromStorage = async () => {
    const at = (await storageRef.current.getAccessToken()) || '';
    const rt = (await storageRef.current.getRefreshToken()) || '';
    setAccessToken(at);
    setRefreshToken(rt);
  };

  const handleSaveTokens = async () => {
    await storageRef.current.setAccessToken(accessToken.trim());
    await storageRef.current.setRefreshToken(refreshToken.trim());
    await readTokensFromStorage();
    Alert.alert('已保存', 'Token 已写入（MemoryTokenStorage，仅本次运行有效）');
  };

  const handleClearTokens = async () => {
    await storageRef.current.clearTokens();
    await readTokensFromStorage();
    Alert.alert('已清空', 'Token 已清空');
  };

  const handleSend = async () => {
    const parsedHeaders = tryParseJson(headersText);
    if (!parsedHeaders.ok) return Alert.alert('Headers 错误', parsedHeaders.error);
    const parsedParams = tryParseJson(paramsText);
    if (!parsedParams.ok) return Alert.alert('Params 错误', parsedParams.error);
    const parsedBody = tryParseJson(bodyText);
    if (!parsedBody.ok) return Alert.alert('Body 错误', parsedBody.error);

    const url = path.trim() || '/';

    setLoading(true);
    setLastResult('');
    try {
      const res = await client.request({
        url,
        method,
        headers: (parsedHeaders.value ?? undefined) as any,
        params: (parsedParams.value ?? undefined) as any,
        data: method === 'GET' || method === 'DELETE' ? undefined : (parsedBody.value ?? undefined),
      });

      const status = (res as any)?.status ?? 'OK';
      const dataJson = truncateForToast(safeJsonStringify((res as any)?.data), 900);
      toast.show(`请求成功（${status}）\n${dataJson}`, 3500);
      setLastResult(
        safeJsonStringify({
          ok: true,
          status: (res as any)?.status,
          statusText: (res as any)?.statusText,
          headers: (res as any)?.headers,
          data: (res as any)?.data,
          config: {
            baseURL: (res as any)?.config?.baseURL,
            url: (res as any)?.config?.url,
            method: (res as any)?.config?.method,
          },
        }),
      );
    } catch (e: any) {
      setLastResult(
        safeJsonStringify({
          ok: false,
          error: e,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {toast.element}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Request / 组件实验室</ThemedText>
        <ThemedText type="default">
          这里用来在 RN 侧快速验证：`@project_neko/request`（含 token 注入/401 刷新/队列）以及基础 UI 组件。
        </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Request 配置</ThemedText>

        <ThemedText type="defaultSemiBold">baseURL</ThemedText>
        <TextInput value={baseURL} onChangeText={setBaseURL} style={styles.input} autoCapitalize="none" />

        <ThemedText type="defaultSemiBold">path</ThemedText>
        <TextInput value={path} onChangeText={setPath} style={styles.input} autoCapitalize="none" />

        <ThemedText type="defaultSemiBold">method</ThemedText>
        <View style={styles.rowWrap}>
          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={({ pressed }) => [styles.chip, method === m && styles.chipActive, pressed && styles.chipPressed]}
            >
              <ThemedText type="defaultSemiBold" style={method === m ? styles.chipTextActive : undefined}>
                {m}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Collapsible title="Headers (JSON)">
          <TextInput
            value={headersText}
            onChangeText={setHeadersText}
            style={[styles.input, styles.monoArea]}
            multiline
            autoCapitalize="none"
          />
        </Collapsible>

        <Collapsible title="Params (JSON)">
          <TextInput
            value={paramsText}
            onChangeText={setParamsText}
            style={[styles.input, styles.monoArea]}
            multiline
            autoCapitalize="none"
          />
        </Collapsible>

        <Collapsible title="Body (JSON)">
          <TextInput
            value={bodyText}
            onChangeText={setBodyText}
            style={[styles.input, styles.monoArea]}
            multiline
            autoCapitalize="none"
          />
        </Collapsible>

        <Pressable
          onPress={handleSend}
          disabled={loading}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
        >
          <ThemedText type="defaultSemiBold" style={styles.primaryBtnText}>
            {loading ? '请求中…' : '发送请求'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Token（MemoryTokenStorage）</ThemedText>
        <ThemedText type="default">
          说明：`@project_neko/request` 的 RN Token 存储默认依赖 AsyncStorage（peer 可选）。为了保证此页面“开箱即用”，这里先用内存存储。
        </ThemedText>

        <ThemedText type="defaultSemiBold">accessToken</ThemedText>
        <TextInput value={accessToken} onChangeText={setAccessToken} style={styles.input} autoCapitalize="none" />

        <ThemedText type="defaultSemiBold">refreshToken</ThemedText>
        <TextInput value={refreshToken} onChangeText={setRefreshToken} style={styles.input} autoCapitalize="none" />

        <ThemedText type="defaultSemiBold">refresh endpoint path</ThemedText>
        <TextInput
          value={refreshEndpointPath}
          onChangeText={setRefreshEndpointPath}
          style={styles.input}
          autoCapitalize="none"
        />

        <View style={styles.row}>
          <Pressable onPress={handleSaveTokens} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <ThemedText type="defaultSemiBold">保存 Token</ThemedText>
          </Pressable>
          <Pressable onPress={handleClearTokens} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <ThemedText type="defaultSemiBold">清空 Token</ThemedText>
          </Pressable>
          <Pressable onPress={readTokensFromStorage} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <ThemedText type="defaultSemiBold">从存储读取</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">结果</ThemedText>
          <TextInput
            value={lastResult}
            editable={false}
            style={[styles.input, styles.monoArea, styles.resultArea]}
            multiline
          />
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  monoArea: {
    fontFamily: 'Menlo',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  resultArea: {
    minHeight: 220,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipTextActive: {
    color: '#1d4ed8',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  primaryBtnText: {
    color: '#fff',
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  toastContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 999,
    maxHeight: 240,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  toastText: {
    color: '#fff',
    textAlign: 'center',
  },
});


