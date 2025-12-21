import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/main.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/qr-scanner">
          <ThemedText type="subtitle">扫码配置（Dev）</ThemedText>
        </Link>
        <ThemedText>
          扫码配置（Dev）
        </ThemedText>

        <Link href={'/request-lab' as any}>
          <ThemedText type="subtitle">🧪 Request/组件实验室</ThemedText>
        </Link>
        <ThemedText>
          测试 `@project_neko/request`（token/刷新/队列）以及基础 UI 组件。
        </ThemedText>

        <Link href="/webapp">
          <ThemedText type="subtitle">🧩 WebApp 页面（对齐 frontend/src/web/App.tsx）</ThemedText>
        </Link>
        <ThemedText>
          复刻 Web 端 App.tsx：语言切换、请求 page_config、StatusToast、Modal（Alert/Confirm/Prompt）。
        </ThemedText>

        <Link href="/rnlive2d">
          <ThemedText type="subtitle"> Live2D测试页面 (react-native-live2d)</ThemedText>
        </Link>
        <ThemedText>
          测试 Live2D 角色渲染、动画控制和表情切换功能（基于 Cubism SDK + mao_pro 模型）。
        </ThemedText>

        <Link href="/audio-test">
          <ThemedText type="subtitle">🎤 音频测试页面 (react-native-pcm-stream)</ThemedText>
        </Link>
        <ThemedText>
          测试 PCM 音频播放、音频数据处理和格式转换功能（16kHz/16bit）。
        </ThemedText>
        
        <Link href="/pcmstream-test">
          <ThemedText type="subtitle" style={{ color: '#FF9800' }}>🚀 PCMStream音频测试 (推荐)</ThemedText>
        </Link>
        <ThemedText>
          测试 WebSocket 实时音频流播放和唇形同步功能（推荐使用此页面测试完整功能）。
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
