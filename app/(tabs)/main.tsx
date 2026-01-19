import { useAudio } from '@/hooks/useAudio';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useDevConnectionConfig } from '@/hooks/useDevConnectionConfig';
import { useLipSync } from '@/hooks/useLipSync';
import { useLive2D } from '@/hooks/useLive2D';
import { useLive2DAgentBackend } from '@/hooks/useLive2DAgentBackend';
import { useLive2DPreferences } from '@/hooks/useLive2DPreferences';
import { mainManager } from '@/utils/MainManager';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { ReactNativeLive2dView } from 'react-native-live2d';
import {
  Live2DRightToolbar,
  ChatContainer,
  type Live2DRightToolbarPanel,
  type Live2DSettingsToggleId,
  type Live2DSettingsState,
  type Live2DAgentToggleId,
  type ConnectionStatus,
} from '@project_neko/components';

type MainUIScreenProps = {}

// 生成消息 ID
function generateMessageId(counter: number): string {
  return `msg-${Date.now()}-${counter}`;
}

const MainUIScreen: React.FC<MainUIScreenProps> = () => {

  const [isPageFocused, setIsPageFocused] = useState(true);
  const { config } = useDevConnectionConfig();

  // 工具栏状态管理（与 Web 版本一致）
  const [isMobile, setIsMobile] = useState(true); // RN 默认为移动端
  const [toolbarGoodbyeMode, setToolbarGoodbyeMode] = useState(false);
  const [toolbarMicEnabled, setToolbarMicEnabled] = useState(false);
  const [toolbarScreenEnabled, setToolbarScreenEnabled] = useState(false);
  const [toolbarOpenPanel, setToolbarOpenPanel] = useState<Live2DRightToolbarPanel>(null);
  const [toolbarSettings, setToolbarSettings] = useState<Live2DSettingsState>({
    mergeMessages: true,
    allowInterrupt: true,
    proactiveChat: false,
    proactiveVision: false,
  });

  // 消息去重：跟踪已发送消息的 clientMessageId（使用 Map 存储时间戳，支持 TTL 清理）
  // 配置：TTL 5分钟，最大条目数 1000，清理间隔 1分钟
  const DEDUPE_TTL_MS = 5 * 60 * 1000;
  const DEDUPE_MAX_SIZE = 1000;
  const DEDUPE_CLEANUP_INTERVAL_MS = 60 * 1000;
  const sentClientMessageIds = useRef<Map<string, number>>(new Map());
  const messageCounterRef = useRef(0);

  // 定期清理过期的去重条目，防止内存无限增长
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const map = sentClientMessageIds.current;

      // 删除超过 TTL 的条目
      for (const [id, timestamp] of map) {
        if (now - timestamp > DEDUPE_TTL_MS) {
          map.delete(id);
        }
      }

      // 如果仍超过最大数量，按时间戳淘汰最旧的条目
      if (map.size > DEDUPE_MAX_SIZE) {
        const entries = Array.from(map.entries()).sort((a, b) => a[1] - b[1]);
        const toRemove = entries.slice(0, map.size - DEDUPE_MAX_SIZE);
        for (const [id] of toRemove) {
          map.delete(id);
        }
      }
    };

    const interval = setInterval(cleanup, DEDUPE_CLEANUP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Text session 管理（与 Web 端一致）
  const [isTextSessionActive, setIsTextSessionActive] = useState(false);
  const sessionStartedResolverRef = useRef<((value: boolean) => void) | null>(null);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSessionPromiseRef = useRef<Promise<boolean> | null>(null);

  // Agent Backend 管理（传入 openPanel 以支持动态刷新）
  const { agent, onAgentChange, refreshAgentState } = useLive2DAgentBackend({
    apiBase: `http://${config.host}:${config.port}`,
    showToast: (message, duration) => {
      Alert.alert('提示', message);
    },
    openPanel: toolbarOpenPanel === 'agent' ? 'agent' : null,
  });

  // Live2D Preferences 持久化
  const { repository: preferencesRepository } = useLive2DPreferences();

  const chat = useChatMessages({
    maxMessages: 100,
  });

  const audio = useAudio({
    host: config.host,
    port: config.port,
    characterName: config.characterName,
    onMessage: async (event) => {
      // 二进制音频数据已由 @project_neko/audio-service 自动播放（通过 Realtime binary 事件接管）
      // 这里仅保留文本消息处理逻辑
      if (typeof event.data !== 'string') return;

      // 检查 clientMessageId 用于去重
      let parsedMsg: any = null;
      try {
        parsedMsg = JSON.parse(event.data);
        const clientMessageId = parsedMsg?.clientMessageId as string | undefined;
        if (clientMessageId && sentClientMessageIds.current.has(clientMessageId)) {
          // 服务器回显，跳过处理
          sentClientMessageIds.current.delete(clientMessageId);
          return;
        }
      } catch {
        // 非 JSON 消息，继续处理
      }

      // 处理 session_started 事件（text session 管理）
      if (parsedMsg?.type === 'session_started') {
        const inputMode = parsedMsg.input_mode as string | undefined;
        console.log('✅ 收到 session_started，input_mode:', inputMode);
        // 只有 text 会话才设置 isTextSessionActive
        // audio 会话由 audio-service 管理，不影响 text session 状态
        if (inputMode === 'text') {
          setIsTextSessionActive(true);
        }
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        if (sessionStartedResolverRef.current) {
          sessionStartedResolverRef.current(true);
          sessionStartedResolverRef.current = null;
        }
        pendingSessionPromiseRef.current = null;
        return;
      }

      // 处理 session_failed 事件
      if (parsedMsg?.type === 'session_failed') {
        console.log('❌ 收到 session_failed，input_mode:', parsedMsg.input_mode);
        setIsTextSessionActive(false);
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        if (sessionStartedResolverRef.current) {
          sessionStartedResolverRef.current(false);
          sessionStartedResolverRef.current = null;
        }
        pendingSessionPromiseRef.current = null;
        return;
      }

      // 处理文本消息并通过 MainManager 协调
      const result = await chat.handleWebSocketMessage(event);

      // 根据消息类型，通过 MainManager 触发相应的行为
      if (result?.type === 'gemini_response') {
        mainManager.onGeminiResponse(result.isNewMessage);
      } else if (result?.type === 'user_activity') {
        mainManager.onUserSpeechDetected();
      } else if (result?.type === 'turn_end') {
        mainManager.onTurnEnd(result.fullText);
      }
    },
    onConnectionChange: (connected) => {
      if (connected) {
        chat.addMessage('已连接到服务器', 'system');
      } else {
        chat.addMessage('与服务器断开连接', 'system');
        // 连接断开时重置 text session 状态
        setIsTextSessionActive(false);
      }
    }
  });

  // 将 audio.connectionStatus 映射到 ConnectionStatus 类型
  const connectionStatus: ConnectionStatus = audio.isConnected ? 'open' : 'closed';

  const live2d = useLive2D({
    modelName: 'mao_pro',
    backendHost: config.host,
    backendPort: 8081,
    // 由页面 focus 生命周期触发加载；避免 autoLoad + focus 双重触发导致重复加载
    autoLoad: false,
    // TODO: 集成 preferences repository 到 useLive2D hook
    // 这需要修改 useLive2D 以支持持久化
  });

  // 口型同步 hook（无平滑模式，与 Web 版本一致）
  const lipSync = useLipSync({
    minAmplitude: 0.005,    // 最小振幅阈值（降低以更敏感）
    amplitudeScale: 1.0,    // 振幅缩放（调整嘴巴张开幅度）
    autoStart: false,       // 不自动启动，等待模型加载完成
  });

  useFocusEffect(
    useCallback(() => {
      console.log('Live2D页面获得焦点');

      // 设置页面为焦点状态
      setIsPageFocused(true);

      // 页面获得焦点时触发模型加载（若已在加载/已就绪，Service 内部会自动去重）
      // 这里放在 focus 生命周期里，确保从其它 Tab 返回时也能恢复模型显示
      live2d.loadModel();

      return () => {
        console.log('Live2D页面失去焦点');
        // 停止口型同步（stop 应为幂等；避免把 isActive 放进依赖导致 focus effect 重跑）
        lipSync.stop();
        console.log('👄 口型同步已停止（页面失焦）');
        
        // 设置页面为失去焦点状态
        setIsPageFocused(false);
        // 页面失去焦点时，重置模型状态，避免在重新获得焦点时立即加载模型
        // 这样可以确保 CubismFramework 有足够时间初始化
        // 注意：原生视图会在 onDetachedFromWindow 中自动清理资源
        live2d.unloadModel();
      };
    }, [live2d.loadModel, live2d.unloadModel, lipSync.stop])
  );

  // ===== 初始化 MainManager =====
  useEffect(() => {
    console.log('🚀 主界面初始化');

    mainManager.init();

    if (audio.audioService) {
      mainManager.registerAudioService(audio.audioService);
    }

    if (live2d.live2dService) {
      mainManager.registerLive2DService(live2d.live2dService);
    }

    return () => {
      console.log('🧹 主界面清理');
    };
  }, [audio.audioService, live2d.live2dService]);

  useEffect(() => {
    console.log('live2d.live2dProps', live2d.live2dProps);
  }, [live2d.live2dProps]);

  useEffect(() => {
    console.log('live2d.modelState', live2d.modelState);
  }, [live2d.modelState]);

  // 监听模型状态，自动启动/停止口型同步
  useEffect(() => {
    const jsReady = live2d.modelState.isReady && !!live2d.modelState.path;
    const nativeReady = live2d.isNativeModelLoaded;
    const shouldRun = isPageFocused && jsReady && nativeReady;

    if (shouldRun) {
      if (!lipSync.isActive) {
        console.log('✅ Live2D JS/Native 已就绪，启动口型同步');
        lipSync.start();
        console.log('👄 口型同步已启动');
      }
      return;
    }

    if (lipSync.isActive) {
      console.log('⏹️ Live2D 未就绪或页面失焦，停止口型同步');
      lipSync.stop();
      console.log('👄 口型同步已停止');
    }
  }, [
    isPageFocused,
    live2d.modelState.isReady,
    live2d.modelState.path,
    live2d.isNativeModelLoaded,
    lipSync.isActive,
    lipSync.start,
    lipSync.stop,
  ]);

  const handleLoadModel = useCallback(() => {
    live2d.loadModel();
  }, [live2d.loadModel]);

  const handleRecordingToggle = useCallback(() => {
    mainManager.toggleRecording();
  }, []);

  const handleLive2DTap = useCallback(() => {
    mainManager.onLive2DTap();
  }, []);

  // 工具栏事件处理（与 Web 版本一致）
  const handleToolbarSettingsChange = useCallback((id: Live2DSettingsToggleId, next: boolean) => {
    setToolbarSettings((prev) => ({ ...prev, [id]: next }));
  }, []);

  const handleToolbarAgentChange = useCallback((id: Live2DAgentToggleId, next: boolean) => {
    onAgentChange(id, next);
  }, [onAgentChange]);

  const handleToggleMic = useCallback((next: boolean) => {
    setToolbarMicEnabled(next);
    if (next) {
      mainManager.startRecording();
    } else {
      mainManager.stopRecording();
      // 语音会话停止后，重置 text session 状态
      // 这样下次发送文本消息时会重新发送 start_session
      setIsTextSessionActive(false);
    }
  }, [mainManager]);

  const handleToggleScreen = useCallback((next: boolean) => {
    setToolbarScreenEnabled(next);
    // TODO: 实现屏幕分享功能
  }, []);

  const handleGoodbye = useCallback(() => {
    // 如果麦克风正在录音，先停止
    if (toolbarMicEnabled) {
      mainManager.stopRecording();
      setToolbarMicEnabled(false);
      // 语音会话停止后，重置 text session 状态
      setIsTextSessionActive(false);
    }
    setToolbarGoodbyeMode(true);
    setToolbarOpenPanel(null);
  }, [mainManager, toolbarMicEnabled]);

  const handleReturn = useCallback(() => {
    setToolbarGoodbyeMode(false);
  }, []);

  const handleSettingsMenuClick = useCallback((id: string) => {
    // RN 中可以导航到对应页面
    Alert.alert('功能提示', `即将打开: ${id}`);
  }, []);

  // 确保 text session 已启动（与 Web 端一致的 Legacy 协议）
  const ensureTextSession = useCallback(async (): Promise<boolean> => {
    // 如果已经有活跃的 text session，直接返回
    if (isTextSessionActive) {
      return true;
    }

    if (!audio.isConnected) {
      return false;
    }

    // 如果已经有一个正在进行的 session 请求，复用该 Promise
    // 这样并发调用会共享同一个 Promise，避免 resolver 被覆盖导致早期 Promise 永不 resolve
    if (pendingSessionPromiseRef.current) {
      return pendingSessionPromiseRef.current;
    }

    const promise = new Promise<boolean>((resolve) => {
      // 清除任何现有的超时
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }

      // 设置 resolver
      sessionStartedResolverRef.current = resolve;

      // 发送 start_session（Legacy 协议）
      console.log('📤 发送 start_session(input_type: text)');
      audio.sendMessage({
        action: 'start_session',
        input_type: 'text',
        new_session: false,
      });

      // 15 秒超时
      sessionTimeoutRef.current = setTimeout(() => {
        if (sessionStartedResolverRef.current === resolve) {
          sessionStartedResolverRef.current = null;
          pendingSessionPromiseRef.current = null;
          console.log('⏰ start_session 超时');
          resolve(false);
        }
        sessionTimeoutRef.current = null;
      }, 15000);
    });

    pendingSessionPromiseRef.current = promise;
    return promise;
  }, [isTextSessionActive, audio.isConnected, audio.sendMessage]);

  // 处理用户发送消息（文本 + 可选图片）
  // 使用 stream_data action 和 clientMessageId 与 N.E.K.O 协议一致
  const handleSendMessage = useCallback(async (text: string, images?: string[]) => {
    if (!audio.isConnected) {
      Alert.alert('提示', '未连接到服务器');
      return;
    }

    // 确保 text session 已启动（与 Web 端一致）
    const sessionOk = await ensureTextSession();
    if (!sessionOk) {
      Alert.alert('提示', '会话初始化失败，请重试');
      return;
    }

    // 先发送图片（每张单独发送）
    if (images && images.length > 0) {
      for (const imgBase64 of images) {
        messageCounterRef.current += 1;
        const clientMessageId = generateMessageId(messageCounterRef.current);
        sentClientMessageIds.current.set(clientMessageId, Date.now());

        audio.sendMessage({
          action: 'stream_data',
          data: imgBase64,
          input_type: 'camera', // RN 使用 camera（拍照）
          clientMessageId,
        });
      }
      chat.addMessage(`📸 [已发送${images.length}张照片]`, 'user');
    }

    // 再发送文本
    if (text.trim()) {
      messageCounterRef.current += 1;
      const clientMessageId = generateMessageId(messageCounterRef.current);
      sentClientMessageIds.current.set(clientMessageId, Date.now());

      // 添加用户消息到 UI
      chat.addMessage(text, 'user');

      // 通过 WS 发送到后端（使用 stream_data action，与 N.E.K.O 协议一致）
      audio.sendMessage({
        action: 'stream_data',
        data: text.trim(),
        input_type: 'text',
        clientMessageId,
      });

      console.log('📤 发送文本消息:', text.substring(0, 50));
    }
  }, [audio.isConnected, audio.sendMessage, chat.addMessage, ensureTextSession]);

  // 检测屏幕尺寸变化
  useEffect(() => {
    const updateIsMobile = () => {
      const { width } = Dimensions.get('window');
      setIsMobile(width <= 768);
    };

    updateIsMobile();
    const subscription = Dimensions.addEventListener('change', updateIsMobile);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // 显示 Agent 状态（调试用）
  useEffect(() => {
    console.log('🤖 Agent 状态:', agent.statusText, {
      master: agent.master,
      keyboard: agent.keyboard,
      mcp: agent.mcp,
      userPlugin: agent.userPlugin,
    });
  }, [agent]);

  return (
    <View style={styles.container}>
      {/* Live2D 舞台区域 */}
      <View style={styles.live2dContainer}>
        {/* 页面获得焦点时渲染 Live2D */}
        {isPageFocused && (
          <ReactNativeLive2dView
            style={styles.live2dView}
            {...live2d.live2dPropsForLipSync}
            onTap={handleLive2DTap}
          />
        )}
        
        {/* 失去焦点时的显示 */}
        {!isPageFocused && (
          <View style={styles.pausedContainer}>
            <Text style={styles.pausedText}>
              {live2d.live2dProps.modelPath ? 'Live2D 已暂停' : '页面未激活'}
            </Text>
          </View>
        )}
      </View>

      {/* 
        【跨平台组件】Live2DRightToolbar 右侧工具栏
        
        策略更新（2026-01-11）：
        - 已实现 RN 原生版本（Live2DRightToolbar.native.tsx）
        - 使用共享的类型和业务逻辑（types.ts + hooks.ts）
        - Metro Bundler 自动根据平台选择：
          * Web: Live2DRightToolbar.tsx（HTML/CSS 完整版）
          * Android/iOS: Live2DRightToolbar.native.tsx（Modal 简化版）
        - 详见：docs/strategy/cross-platform-components.md
        
        功能包括：
        - 麦克风/屏幕共享切换
        - Agent 设置面板
        - Settings 面板
        - 设置菜单（Live2D设置、API密钥、角色管理等）
      */}
      <View style={styles.toolbarContainer}>
        <Live2DRightToolbar
          visible
          isMobile={isMobile}
          right={isMobile ? 12 : 24}
          top={isMobile ? 12 : 24}
          micEnabled={toolbarMicEnabled}
          screenEnabled={toolbarScreenEnabled}
          goodbyeMode={toolbarGoodbyeMode}
          openPanel={toolbarOpenPanel}
          onOpenPanelChange={setToolbarOpenPanel}
          settings={toolbarSettings}
          onSettingsChange={handleToolbarSettingsChange}
          agent={agent}
          onAgentChange={handleToolbarAgentChange}
          onToggleMic={handleToggleMic}
          onToggleScreen={handleToggleScreen}
          onGoodbye={handleGoodbye}
          onReturn={handleReturn}
          onSettingsMenuClick={handleSettingsMenuClick}
        />
      </View>

      {/*
        【跨平台组件】ChatContainer 聊天容器

        策略更新（2026-01-11）：
        - ✅ 已实现 RN 原生版本（ChatContainer.native.tsx）
        - ✅ 使用共享的类型和业务逻辑（types.ts + hooks.ts）
        - ✅ 已接入主界面 WS 文本消息数据流（P0-1 & P0-2）
        - Metro Bundler 自动根据平台选择：
          * Web: ChatContainer.tsx（HTML/CSS 完整版，支持截图）
          * Android/iOS: ChatContainer.native.tsx（Modal 简化版）
        - 详见：docs/strategy/cross-platform-components.md

        功能包括：
        - 浮动按钮（缩小态）
        - 聊天面板（展开态）
        - 消息列表（用户/系统/助手角色）- 实时显示 WS 消息
        - 文本输入 - 发送到后端
        - Web 平台支持截图功能
      */}
      <View style={styles.chatContainerWrapper}>
        <ChatContainer
          externalMessages={chat.messages}
          connectionStatus={connectionStatus}
          onSendMessage={handleSendMessage}
          disabled={!audio.isConnected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  live2dContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  live2dView: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  pausedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    color: '#666',
    fontSize: 16,
  },
  toolbarContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  chatContainerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

export default MainUIScreen;