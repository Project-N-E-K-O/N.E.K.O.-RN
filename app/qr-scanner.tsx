import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDevConnectionConfig } from '@/hooks/useDevConnectionConfig';

type ReturnToParam = string | undefined;
type AllowedReturnTo =
  | '/explore'
  | '/audio-test'
  | '/modal'
  | '/pcmstream-test'
  | '/rnlive2d'
  | '/(tabs)'
  | '/(tabs)/main'
  | '/main';

export default function QrScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo: ReturnToParam = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const devConfig = useDevConnectionConfig();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const titleText = useMemo(() => (__DEV__ ? '开发扫码配置' : '扫码'), []);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);

      const raw = (result?.data ?? '').trim();
      if (!raw) {
        Alert.alert('扫码失败', '未识别到有效内容');
        setScanned(false);
        return;
      }

      // 回传到上一页：同时写入“全局连接配置”（供整个项目读取）
      const target: AllowedReturnTo =
        returnTo === '/explore' ||
        returnTo === '/audio-test' ||
        returnTo === '/modal' ||
        returnTo === '/pcmstream-test' ||
        returnTo === '/rnlive2d' ||
        returnTo === '/(tabs)' ||
        returnTo === '/(tabs)/main' ||
        returnTo === '/main'
          ? returnTo
          : '/explore';

      (async () => {
        const applied = await devConfig.applyQrRaw(raw);
        if (!applied.ok) {
          Alert.alert('二维码内容不可用', `${applied.error}\n\n内容：${raw.slice(0, 256)}`);
          setScanned(false);
          return;
        }

        router.replace({
          pathname: target,
          // 兼容旧逻辑：仍传 qr 参数；但主逻辑已写入全局配置
          params: { qr: encodeURIComponent(raw) },
        });
      })();
    },
    [devConfig, router, returnTo, scanned]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.text}>正在检查相机权限…</Text>
        <Pressable style={styles.button} onPress={handleCancel}>
          <Text style={styles.buttonText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.text}>需要相机权限才能扫描二维码。</Text>
        <View style={{ height: 12 }} />
        <Pressable style={styles.button} onPress={() => requestPermission()}>
          <Text style={styles.buttonText}>授权相机权限</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleCancel}>
          <Text style={styles.buttonText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* 轻量遮罩与提示 */}
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.overlayTitle}>{titleText}</Text>
        <Text style={styles.overlayText}>对准二维码自动识别</Text>
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleCancel}>
          <Text style={styles.buttonText}>取消</Text>
        </Pressable>
        <View style={{ width: 12 }} />
        <Pressable style={styles.button} onPress={() => setScanned(false)}>
          <Text style={styles.buttonText}>{scanned ? '继续扫描' : '重新对焦'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0b',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#cfcfcf',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  overlayText: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2f6fed',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});


