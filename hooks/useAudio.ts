import { AudioService, AudioStats } from '@/services/AudioService';
import { useEffect, useRef, useState } from 'react';

interface UseAudioConfig {
  host: string;
  port: number;
  characterName: string;
  onMessage?: (event: MessageEvent) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const useAudio = (config: UseAudioConfig) => {
  // 状态管理
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const [audioStats, setAudioStats] = useState<AudioStats>({
    audioChunksCount: 0,
    sendCount: 0,
    tempBufferLength: 0,
    isStreaming: false,
    isPlaying: false,
    feedbackControlStatus: '正常',
    isSpeechDetected: false,
  });

  // Service 引用
  const audioServiceRef = useRef<AudioService | null>(null);

  // 切换录音状态
  const toggleRecording = async () => {
    if (!audioServiceRef.current) {
      console.warn('⚠️ 音频服务未初始化');
      return;
    }

    await audioServiceRef.current.toggleRecording();
  };

  // 播放 PCM 音频数据
  const playPCMData = async (arrayBuffer: ArrayBuffer) => {
    await audioServiceRef.current?.playPCMData(arrayBuffer);
  };

  // 清空音频队列
  const clearAudioQueue = () => {
    audioServiceRef.current?.clearAudioQueue();
  };

  // 处理用户语音检测（打断）
  const handleUserSpeechDetection = () => {
    audioServiceRef.current?.handleUserSpeechDetection();
  };

  // 发送消息
  const sendMessage = (message: string | object) => {
    audioServiceRef.current?.sendMessage(message);
  };

  // 组件初始化
  useEffect(() => {
    console.log('🎧 useAudio 初始化中...');
    
    // 创建 AudioService
    audioServiceRef.current = new AudioService({
      host: config.host,
      port: config.port,
      characterName: config.characterName,
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        setConnectionStatus(connected ? '已连接' : '未连接');
        config.onConnectionChange?.(connected);
      },
      onMessage: (event) => {
        config.onMessage?.(event);
      },
      onError: (error) => {
        console.error('❌ 音频服务错误:', error);
        setConnectionStatus('连接错误');
      },
      onRecordingStateChange: (recording) => {
        setIsRecording(recording);
      },
      onAudioStatsUpdate: (stats) => {
        setAudioStats(stats);
      },
    });

    // 初始化服务
    audioServiceRef.current.init().catch(error => {
      console.error('❌ AudioService 初始化失败:', error);
      setConnectionStatus('初始化失败');
    });

    // 清理函数
    return () => {
      console.log('🧹 useAudio 清理中...');
      audioServiceRef.current?.destroy();
      audioServiceRef.current = null;
      setIsRecording(false);
      setIsConnected(false);
    };
  }, [config.host, config.port, config.characterName]);

  return {
    // 状态
    isConnected,
    isRecording,
    connectionStatus,
    audioStats,
    
    // 方法
    toggleRecording,
    playPCMData,
    clearAudioQueue,
    handleUserSpeechDetection,
    sendMessage,
    
    // 原始 Service 引用（供高级用户使用）
    audioService: audioServiceRef.current,
  };
};
