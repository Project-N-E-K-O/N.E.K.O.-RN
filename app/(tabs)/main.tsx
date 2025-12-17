import { useAudio } from '@/hooks/useAudio';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useLipSync } from '@/hooks/useLipSync';
import { useLive2D } from '@/hooks/useLive2D';
import { mainManager } from '@/utils/MainManager';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReactNativeLive2dView } from 'react-native-live2d';


interface MainUIScreenProps { }


const MainUIScreen: React.FC<MainUIScreenProps> = () => {

  const [isPageFocused, setIsPageFocused] = useState(true);

  const chat = useChatMessages({
    maxMessages: 100,
  });

  const audio = useAudio({
    host: '192.168.88.38',
    // host: '192.168.50.66',
    port: 48911,
    characterName: 'test',
    onMessage: async (event) => {
      // 处理二进制音频数据
      if (event.data instanceof Blob) {
        try {
          const arrayBuffer = await event.data.arrayBuffer();
          console.log('收到 Blob 音频数据:', arrayBuffer.byteLength, '字节');
          await audio.playPCMData(arrayBuffer);
        } catch (e) {
          console.warn('处理 Blob 音频失败:', e);
        }
        return;
      } else if (event.data instanceof ArrayBuffer) {
        console.log('收到 ArrayBuffer 音频数据:', event.data.byteLength, '字节');
        await audio.playPCMData(event.data);
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
      }
    }
  });

  const live2d = useLive2D({
    modelName: 'mao_pro',
    backendHost: '192.168.88.38',
    // backendHost: '192.168.50.66',
    backendPort: 8081,
    autoLoad: false,
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

      return () => {
        console.log('Live2D页面失去焦点');
        // 停止口型同步
        if (lipSync.isActive) {
          lipSync.stop();
          console.log('👄 口型同步已停止（页面失焦）');
        }
        
        // 设置页面为失去焦点状态
        setIsPageFocused(false);
        // 页面失去焦点时，重置模型状态，避免在重新获得焦点时立即加载模型
        // 这样可以确保 CubismFramework 有足够时间初始化
        // 注意：原生视图会在 onDetachedFromWindow 中自动清理资源
        live2d.unloadModel();
      };
    }, [live2d.unloadModel])
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
    if (live2d.modelState.isReady && live2d.modelState.path) {
      console.log('✅ Live2D 模型已加载，启动口型同步');
      // 延迟启动以确保模型完全就绪
      setTimeout(() => {
        if (!lipSync.isActive) {
          lipSync.start();
          console.log('👄 口型同步已启动');
        }
      }, 500);
    } else if (!live2d.modelState.isReady && !live2d.modelState.path) {
      console.log('⏹️ Live2D 模型已卸载，停止口型同步');
      if (lipSync.isActive) {
        lipSync.stop();
        console.log('👄 口型同步已停止');
      }
    }
  }, [live2d.modelState]);

  const handleLoadModel = useCallback(() => {
    live2d.loadModel();
  }, [live2d.loadModel]);

  const handleRecordingToggle = useCallback(() => {
    mainManager.toggleRecording();
  }, []);

  const handleLive2DTap = useCallback(() => {
    mainManager.onLive2DTap();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.live2dContainer}>
        {/* 页面获得焦点时渲染 Live2D，使用优化过的 live2dProps 避免不必要的重新渲染 */}
        {isPageFocused && (
          <ReactNativeLive2dView
            style={styles.live2dView}
            {...live2d.live2dProps}
            motionGroup={undefined}  // 不设置动作，避免干扰口型同步
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
      <View style={styles.chatContainer}>
        <ScrollView style={styles.messagesScrollView} showsVerticalScrollIndicator={false}>
          {chat.messages.length === 0 ? (
            <Text style={styles.chatText}>Chat</Text>
          ) : (
            chat.messages.slice(-5).map((message) => (
              <View key={message.id}>
                <Text style={styles.chatText}>{message.text}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonIdle,
              pressed && styles.buttonPressed,
            ]} onPress={handleLoadModel}>
            <Text style={styles.buttonText}>Load Model</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              audio.isRecording ? styles.buttonRecording : styles.buttonIdle,
              pressed && styles.buttonPressed,
              !audio.isConnected && styles.buttonDisabled
            ]}
            onPress={handleRecordingToggle}
          >
            <Text style={styles.buttonText}>{audio.isRecording ? '🎤 停止录音' : '🎤 开始聊天'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    backgroundColor: '#f5f5f5',
  },
  live2dContainer: {
    height: 600,
    borderColor: 'red',
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    height: 400,
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  messagesScrollView: {
    maxHeight: 150,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chatText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIdle: {
    backgroundColor: '#333',
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
});

export default MainUIScreen;