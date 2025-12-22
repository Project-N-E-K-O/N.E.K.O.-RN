import { Alert } from 'react-native';
import { AndroidPCMStreamService } from './android.pcmstream';
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
  private pcmStreamService: AndroidPCMStreamService | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private isInitialized: boolean = false;
  private statsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private isSessionActive: boolean = false;

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
      
      // 2. 初始化音频服务
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
      // 创建 PCM 流服务
      this.pcmStreamService = new AndroidPCMStreamService(this.wsService);
      this.pcmStreamService.init();
      
      // 配置录音会话
      await this.pcmStreamService.configureRecordingAudioSession();

      // Android 平台播放器将在第一次播放时自动初始化（enqueueAndroidPCM）
      // 不在启动时初始化，避免不必要地暂停录音
      console.log('✅ 音频服务初始化完成（播放器将在需要时自动初始化）');
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

    if (!this.pcmStreamService) {
      throw new Error('音频服务未初始化');
    }

    if (this.pcmStreamService.getIsRecording()) {
      console.warn('⚠️ 已经在录音中');
      return;
    }

    try {
      // 开始会话
      this.startSession();
      
      // 开始录音
      await this.pcmStreamService.toggleRecording();
      
      console.log('🎤 开始录音');
      this.config.onRecordingStateChange?.(true);
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
    if (!this.pcmStreamService) {
      throw new Error('音频服务未初始化');
    }

    if (!this.pcmStreamService.getIsRecording()) {
      console.warn('⚠️ 当前没有在录音');
      return;
    }

    try {
      // 停止录音
      await this.pcmStreamService.toggleRecording();
      
      // 结束会话
      this.endSession();
      
      console.log('⏸️ 停止录音');
      this.config.onRecordingStateChange?.(false);
    } catch (error) {
      console.error('❌ 停止录音失败:', error);
      throw error;
    }
  }

  /**
   * 切换录音状态
   */
  async toggleRecording(): Promise<void> {
    if (!this.pcmStreamService) {
      throw new Error('音频服务未初始化');
    }

    const isCurrentlyRecording = this.pcmStreamService.getIsRecording();
    
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
    if (!this.wsService) {
      console.warn('⚠️ WebSocket 未初始化，无法开始会话');
      return;
    }

    const sessionMessage = {
      action: 'start_session',
      input_type: 'audio'
    };

    this.wsService.send(JSON.stringify(sessionMessage));
    this.isSessionActive = true;
    console.log('📤 已发送 start_session');
  }

  /**
   * 结束会话
   */
  private endSession(): void {
    if (!this.wsService) {
      console.warn('⚠️ WebSocket 未初始化，无法结束会话');
      return;
    }

    const sessionMessage = {
      action: 'end_session'
    };

    this.wsService.send(JSON.stringify(sessionMessage));
    this.isSessionActive = false;
    console.log('📤 已发送 end_session');
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
    // 直接播放 PCM 数据
    this.playPCMData(arrayBuffer);
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
    if (!this.pcmStreamService) {
      console.warn('⚠️ 音频服务未初始化，无法播放音频');
      return;
    }

    await this.pcmStreamService.playPCMData(arrayBuffer);
  }

  /**
   * 清空音频队列
   */
  clearAudioQueue(): void {
    if (!this.pcmStreamService) {
      console.warn('⚠️ 音频服务未初始化');
      return;
    }

    this.pcmStreamService.clearAudioQueue();
    console.log('🧹 音频队列已清空');
  }

  /**
   * 处理用户语音检测（打断）
   */
  handleUserSpeechDetection(): void {
    if (!this.pcmStreamService) {
      console.warn('⚠️ 音频服务未初始化');
      return;
    }

    this.pcmStreamService.handleUserSpeechDetection();
    console.log('🎤 处理用户语音打断');
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
    if (!this.pcmStreamService) {
      return null;
    }

    return this.pcmStreamService.getStats();
  }

  /**
   * 获取录音状态
   */
  getIsRecording(): boolean {
    return this.pcmStreamService?.getIsRecording() || false;
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

    // 停止录音
    if (this.pcmStreamService?.getIsRecording()) {
      this.pcmStreamService.toggleRecording().catch(err => {
        console.error('停止录音失败:', err);
      });
    }

    // 清理音频资源
    this.pcmStreamService?.uninitializeAudio();

    // 关闭 WebSocket
    if (this.wsService) {
      this.wsService.close();
    }

    // 重置状态
    this.pcmStreamService = null;
    this.wsService = null;
    this.isInitialized = false;
    this.connectionStatus = ConnectionStatus.DISCONNECTED;

    console.log('✅ AudioService 已销毁');
  }

  /**
   * 获取底层服务实例（供高级用户使用）
   */
  getUnderlyingServices() {
    return {
      wsService: this.wsService,
      pcmStreamService: this.pcmStreamService,
    };
  }
}

