import { Alert, Platform } from 'react-native';
import { createNativeAudioService } from '@project_neko/audio-service';
import { createWebAudioService } from '@project_neko/audio-service/web';
import type { AudioService as CrossPlatformAudioService } from '@project_neko/audio-service';
import type { RealtimeClientLike } from '@project_neko/audio-service';
import { WSService } from './wsService';

/**
 * AudioService 配置接口
 */
export interface AudioServiceConfig {
  host: string;
  port: number;
  characterName: string;
  onConnectionChange?: (isConnected: boolean) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: any) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onAudioStatsUpdate?: (stats: AudioStats) => void;
}

/**
 * 音频统计信息
 */
export interface AudioStats {
  audioChunksCount: number;
  sendCount: number;
  tempBufferLength: number;
  isStreaming: boolean;
  isPlaying: boolean;
  feedbackControlStatus: string;
  isSpeechDetected: boolean;
}

/**
 * 连接状态枚举
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * AudioService - 音频服务高级封装
 * 
 * 职责：
 * - 管理 WebSocket 和音频服务的生命周期
 * - 提供简化的 API
 * - 处理会话管理
 * - 通过事件回调通知状态变化
 */
export class AudioService {
  private config: AudioServiceConfig;
  private wsService: WSService | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private isInitialized: boolean = false;
  private statsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private isSessionActive: boolean = false;

  // 新版跨平台 audio-service（Native/Web 都走这一套）
  private audioService: (CrossPlatformAudioService & { detach?: () => void }) | null = null;
  private isRecording: boolean = false;
  private lastSpeechDetectedAt: number = 0;
  private lastKnownOutputAmp: number = 0;

  constructor(config: AudioServiceConfig) {
    this.config = config;
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ AudioService 已经初始化过了');
      return;
    }

    try {
      console.log('🎧 AudioService 初始化中...');
      
      // 1. 初始化 WebSocket
      await this.initWebSocket();
      
      // 2. 初始化音频服务（跨平台：@project_neko/audio-service）
      await this.initAudioService();
      
      // 3. 开始统计信息更新
      this.startStatsUpdate();
      
      this.isInitialized = true;
      console.log('✅ AudioService 初始化完成');
    } catch (error) {
      console.error('❌ AudioService 初始化失败:', error);
      this.config.onError?.(error);
      throw error;
    }
  }

  /**
   * 初始化 WebSocket
   */
  private async initWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsService = new WSService({
          host: this.config.host,
          port: this.config.port,
          characterName: this.config.characterName,
          onOpen: () => {
            console.log('✅ WebSocket 已连接');
            this.connectionStatus = ConnectionStatus.CONNECTED;
            this.config.onConnectionChange?.(true);
            resolve();
          },
          onMessage: (event) => {
            this.config.onMessage?.(event);
          },
          onError: (error) => {
            console.error('❌ WebSocket 错误:', error);
            this.connectionStatus = ConnectionStatus.ERROR;
            this.config.onError?.(error);
            reject(error);
          },
          onClose: () => {
            console.log('🔌 WebSocket 已断开');
            this.connectionStatus = ConnectionStatus.DISCONNECTED;
            this.config.onConnectionChange?.(false);
          }
        });

        this.connectionStatus = ConnectionStatus.CONNECTING;
        this.wsService.init();
      } catch (error) {
        console.error('❌ WebSocket 初始化失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 初始化音频服务
   */
  private async initAudioService(): Promise<void> {
    if (!this.wsService) {
      throw new Error('WebSocket 未初始化');
    }

    try {
      const client = this.wsService.getRealtimeClient() as unknown as RealtimeClientLike | null;
      if (!client) {
        throw new Error('RealtimeClient 未就绪（WebSocket 尚未连接或已关闭）');
      }

      // Native / Web 分流（Expo Web 走 WebAudio + getUserMedia）
      if (Platform.OS === 'web') {
        const svc = createWebAudioService({
          client,
          isMobile: true,
          // focusMode：播放时尽量不回传麦克风（避免“边听边说”的回声/打断）
          focusModeEnabled: true,
        }) as any;
        this.audioService = svc;
      } else {
        const svc = createNativeAudioService({
          client,
          // 与当前 RN 侧约定保持一致：
          // - recordTargetRate 16k（上行）
          // - playbackSampleRate 48k（下行 PCM）
          recordTargetRate: 16000,
          playbackSampleRate: 48000,
        }) as any;
        this.audioService = svc;
      }

      // 订阅状态：用于兼容旧的 getIsRecording/isPlaying 等
      if ((this.audioService as any)?.on) {
        (this.audioService as any).on('state', ({ state }: any) => {
          const isRec = state === 'recording';
          this.isRecording = isRec;
          this.config.onRecordingStateChange?.(isRec);
        });

        (this.audioService as any).on('inputAmplitude', ({ amplitude }: any) => {
          // amplitude > 0 仅用于粗略 UI/调试，不作为严格判定
          const hasVoice = typeof amplitude === 'number' && amplitude > 0.02;
          if (hasVoice) this.lastSpeechDetectedAt = Date.now();
        });

        (this.audioService as any).on('outputAmplitude', ({ amplitude }: any) => {
          this.lastKnownOutputAmp = typeof amplitude === 'number' ? amplitude : 0;
        });
      }

      // attach 后即可接管二进制播放（无需 main.tsx 手动 playPCMData）
      this.audioService!.attach();

      console.log('✅ 音频服务初始化完成（@project_neko/audio-service 已接管收发）');
    } catch (error) {
      console.error('❌ 音频服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 开始统计信息更新
   */
  private startStatsUpdate(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
    }

    this.statsUpdateInterval = setInterval(() => {
      const stats = this.getStats();
      if (stats) {
        this.config.onAudioStatsUpdate?.(stats);
      }
    }, 500);
  }

  /**
   * 停止统计信息更新
   */
  private stopStatsUpdate(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
  }

  /**
   * 开始录音
   */
  async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioService 未初始化');
    }

    if (!this.audioService) {
      throw new Error('音频服务未初始化');
    }

    if (this.isRecording) {
      console.warn('⚠️ 已经在录音中');
      return;
    }

    try {
      // 新版：startVoiceSession 内部会发送 start_session 并等待 session_started
      await this.audioService.startVoiceSession({
        targetSampleRate: 16000,
        timeoutMs: 10_000,
      });
      this.isSessionActive = true;

      console.log('🎤 开始录音');
    } catch (error) {
      console.error('❌ 开始录音失败:', error);
      Alert.alert('错误', '开始录音失败');
      throw error;
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<void> {
    if (!this.audioService) {
      throw new Error('音频服务未初始化');
    }

    if (!this.isRecording) {
      console.warn('⚠️ 当前没有在录音');
      return;
    }

    try {
      await this.audioService.stopVoiceSession();
      // 与旧版协议保持一致：停止录音时显式结束会话（服务端通常会清理上下文）
      try {
        this.wsService?.getRealtimeClient()?.sendJson({ action: 'end_session' });
      } catch (_e) {
        // ignore
      }
      this.isSessionActive = false;
      
      console.log('⏸️ 停止录音');
    } catch (error) {
      console.error('❌ 停止录音失败:', error);
      throw error;
    }
  }

  /**
   * 切换录音状态
   */
  async toggleRecording(): Promise<void> {
    if (!this.audioService) {
      throw new Error('音频服务未初始化');
    }

    const isCurrentlyRecording = this.isRecording;
    
    if (isCurrentlyRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * 开始会话
   */
  private startSession(): void {
    // 已被 @project_neko/audio-service 接管：请使用 startRecording()/startVoiceSession()
    console.warn('⚠️ startSession() 已弃用：请使用 startRecording()');
  }

  /**
   * 结束会话
   */
  private endSession(): void {
    // 已被 @project_neko/audio-service 接管：请使用 stopRecording()/stopVoiceSession()
    console.warn('⚠️ endSession() 已弃用：请使用 stopRecording()');
  }

  /**
   * 开始 AI 通话（外部调用接口）
   */
  async startAICall(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioService 未初始化');
    }

    if (this.isSessionActive) {
      console.warn('⚠️ 会话已经激活');
      return;
    }

    try {
      await this.startRecording();
      console.log('📞 AI 通话已开始');
    } catch (error) {
      console.error('❌ 开始 AI 通话失败:', error);
      throw error;
    }
  }

  /**
   * 结束 AI 通话（外部调用接口）
   */
  async endAICall(): Promise<void> {
    if (!this.isSessionActive) {
      console.warn('⚠️ 会话未激活');
      return;
    }

    try {
      await this.stopRecording();
      console.log('📞 AI 通话已结束');
    } catch (error) {
      console.error('❌ 结束 AI 通话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话是否激活
   */
  getIsSessionActive(): boolean {
    return this.isSessionActive;
  }

  /**
   * 处理 Base64 音频数据（Web 平台）
   * TODO: Web 平台实现
   */
  handleBase64Audio(audioData: string, isNewMessage: boolean = false): void {
    // TODO: Web 平台实现
    console.warn('⚠️ handleBase64Audio 暂未实现（预留 Web 平台）');
  }

  /**
   * 处理状态更新消息
   */
  handleStatusUpdate(data: any): void {
    // 处理状态更新逻辑
    console.log('📊 状态更新:', data);
  }

  /**
   * 处理 Blob 音频数据（Web 平台）
   * TODO: Web 平台实现
   */
  handleAudioBlob(blob: Blob): void {
    // TODO: Web 平台实现
    console.warn('⚠️ handleAudioBlob 暂未实现（预留 Web 平台）');
  }

  /**
   * 处理 ArrayBuffer 音频数据
   */
  handleAudioArrayBuffer(arrayBuffer: ArrayBuffer): void {
    // 新版已由 audio-service 通过 binary 事件自动处理
    console.warn('⚠️ handleAudioArrayBuffer 已不再需要：binary 播放由 @project_neko/audio-service 接管');
  }

  /**
   * 设置 WebSocket 实例（用于外部管理 WebSocket）
   * 注意：通常不建议使用，建议让 AudioService 自己管理 WebSocket
   */
  setWebSocket(ws: WebSocket): void {
    console.warn('⚠️ setWebSocket 已弃用，建议让 AudioService 自己管理 WebSocket');
    // 不做任何操作，保持向后兼容
  }

  /**
   * 播放 PCM 音频数据
   */
  async playPCMData(arrayBuffer: ArrayBuffer): Promise<void> {
    // 兼容旧调用：主链路不应再手动调用播放（避免双重播放）
    console.warn('⚠️ playPCMData 已弃用：请让 @project_neko/audio-service 通过 binary 事件自动播放');
  }

  /**
   * 清空音频队列
   */
  clearAudioQueue(): void {
    if (!this.audioService) {
      console.warn('⚠️ 音频服务未初始化');
      return;
    }
    this.audioService.stopPlayback();
    console.log('🧹 已停止播放并清空队列（audio-service）');
  }

  /**
   * 处理用户语音检测（打断）
   */
  handleUserSpeechDetection(): void {
    if (!this.audioService) {
      console.warn('⚠️ 音频服务未初始化');
      return;
    }

    // 精确打断由 audio-service 在收到 user_activity/audio_chunk 时自动执行；
    // 这里保留外部主动打断入口（UI/业务触发）
    this.audioService.stopPlayback();
    this.lastSpeechDetectedAt = Date.now();
    console.log('🎤 主动打断：stopPlayback()');
  }

  /**
   * 发送 WebSocket 消息
   */
  sendMessage(message: string | object): void {
    if (!this.wsService) {
      console.warn('⚠️ WebSocket 未连接，无法发送消息');
      return;
    }

    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.wsService.send(data);
  }

  /**
   * 获取音频统计信息
   */
  getStats(): AudioStats | null {
    // 新版 audio-service 不暴露旧版细粒度统计；这里提供“兼容字段 + 近似值”
    const now = Date.now();
    const recentlyDetected = now - this.lastSpeechDetectedAt < 1_500;
    return {
      audioChunksCount: 0,
      sendCount: 0,
      tempBufferLength: 0,
      isStreaming: this.isRecording,
      isPlaying: this.lastKnownOutputAmp > 0.01,
      feedbackControlStatus: Platform.OS === 'web' ? 'WebAudio' : 'PCMStream',
      isSpeechDetected: recentlyDetected,
    };
  }

  /**
   * 获取录音状态
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    console.log('🧹 AudioService 销毁中...');

    // 停止统计更新
    this.stopStatsUpdate();

    // 停止录音/播放并解绑监听
    if (this.isRecording) {
      this.audioService?.stopVoiceSession().catch((err: any) => {
        console.error('停止录音失败:', err);
      });
    }
    try {
      this.audioService?.stopPlayback();
    } catch (_e) {}
    try {
      this.audioService?.detach?.();
    } catch (_e) {}

    // 关闭 WebSocket
    if (this.wsService) {
      this.wsService.close();
    }

    // 重置状态
    this.wsService = null;
    this.audioService = null;
    this.isInitialized = false;
    this.connectionStatus = ConnectionStatus.DISCONNECTED;
    this.isSessionActive = false;
    this.isRecording = false;

    console.log('✅ AudioService 已销毁');
  }

  /**
   * 获取底层服务实例（供高级用户使用）
   */
  getUnderlyingServices() {
    return {
      wsService: this.wsService,
      audioService: this.audioService,
    };
  }
}

