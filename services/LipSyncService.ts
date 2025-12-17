import { ReactNativeLive2dModule } from 'react-native-live2d';
import PCMStream, { OnAmplitudeUpdateEventPayload } from 'react-native-pcm-stream';

/**
 * LipSyncService - 口型同步服务
 * 
 * 负责协调 PCMStream 音频振幅和 Live2D 模型的嘴巴参数
 * 实现实时口型同步效果
 * 
 * 策略（与 Web 版本一致）：
 * - 无平滑处理，立即响应音频振幅变化
 * - 每帧直接设置嘴巴值，确保每个音节都清晰可见
 */
export class LipSyncService {
  private amplitudeSubscription: any = null;
  private playbackStopSubscription: any = null;
  private isActive: boolean = false;
  private minAmplitude: number = 0.01; // 最小振幅阈值（低于此值认为静音）
  private maxAmplitude: number = 1.0; // 最大振幅值
  private amplitudeScale: number = 1.2; // 振幅缩放系数

  /**
   * 初始化口型同步服务
   * 
   * @param options 配置选项
   */
  constructor(options?: {
    minAmplitude?: number;
    maxAmplitude?: number;
    amplitudeScale?: number;
  }) {
    if (options) {
      this.minAmplitude = options.minAmplitude ?? this.minAmplitude;
      this.maxAmplitude = options.maxAmplitude ?? this.maxAmplitude;
      this.amplitudeScale = options.amplitudeScale ?? this.amplitudeScale;
    }
    
    console.log('👄 LipSyncService 已创建 (无平滑模式)', {
      minAmplitude: this.minAmplitude,
      amplitudeScale: this.amplitudeScale,
    });
  }

  /**
   * 启动口型同步
   * 开始监听音频振幅并更新 Live2D 模型
   */
  start(): void {
    if (this.isActive) {
      console.warn('⚠️ LipSyncService 已经启动');
      return;
    }

    console.log('▶️ LipSyncService 启动中...');

    // 监听音频振幅更新事件
    this.amplitudeSubscription = PCMStream.addListener(
      'onAmplitudeUpdate',
      (event: OnAmplitudeUpdateEventPayload) => {
        this.handleAmplitudeUpdate(event.amplitude);
      }
    );

    // 监听播放停止事件，自动闭合嘴巴
    this.playbackStopSubscription = PCMStream.addListener(
      'onPlaybackStop',
      () => {
        console.log('🔇 音频播放停止，闭合嘴巴');
        this.resetMouth();
      }
    );

    this.isActive = true;
    console.log('✅ LipSyncService 已启动');
  }

  /**
   * 停止口型同步
   * 停止监听并重置嘴巴状态
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('⏹️ LipSyncService 停止中...');

    // 移除事件监听
    if (this.amplitudeSubscription) {
      this.amplitudeSubscription.remove();
      this.amplitudeSubscription = null;
    }

    // 移除播放停止事件监听
    if (this.playbackStopSubscription) {
      this.playbackStopSubscription.remove();
      this.playbackStopSubscription = null;
    }

    // 重置嘴巴状态
    this.resetMouth();

    this.isActive = false;
    console.log('✅ LipSyncService 已停止');
  }

  /**
   * 处理音频振幅更新
   * 
   * 与 Web 版本策略一致：无平滑，立即响应
   * 
   * @param amplitude 原始振幅值 (0.0 ~ 1.0)
   */
  private handleAmplitudeUpdate(amplitude: number): void {
    try {
      // 1. 应用阈值过滤（去除静音）
      let mouthValue = amplitude < this.minAmplitude ? 0 : amplitude;

      // 2. 应用缩放系数
      mouthValue *= this.amplitudeScale;

      // 3. 限制在有效范围内 (0~1)
      mouthValue = Math.min(mouthValue, this.maxAmplitude);

      // 4. 直接设置，无平滑处理（与 Web 版本一致）
      ReactNativeLive2dModule.setMouthValue(mouthValue);

      // 降低日志频率（仅在值变化较大时输出）
      if (Math.random() < 0.01) {
        console.log(
          `👄 口型更新: 原始=${amplitude.toFixed(3)}, 最终=${mouthValue.toFixed(3)}`
        );
      }
    } catch (error) {
      console.error('❌ 处理振幅更新失败:', error);
    }
  }

  /**
   * 重置嘴巴状态到闭合
   */
  private resetMouth(): void {
    try {
      ReactNativeLive2dModule.setMouthValue(0);
      console.log('👄 嘴巴已重置');
    } catch (error) {
      console.error('❌ 重置嘴巴失败:', error);
    }
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * 更新配置参数
   * 
   * @param options 新的配置选项
   */
  updateConfig(options: {
    minAmplitude?: number;
    maxAmplitude?: number;
    amplitudeScale?: number;
  }): void {
    if (options.minAmplitude !== undefined) {
      this.minAmplitude = Math.max(0, options.minAmplitude);
    }
    if (options.maxAmplitude !== undefined) {
      this.maxAmplitude = Math.max(0, options.maxAmplitude);
    }
    if (options.amplitudeScale !== undefined) {
      this.amplitudeScale = Math.max(0, options.amplitudeScale);
    }

    console.log('🔧 LipSyncService 配置已更新', {
      minAmplitude: this.minAmplitude,
      maxAmplitude: this.maxAmplitude,
      amplitudeScale: this.amplitudeScale,
    });
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return {
      minAmplitude: this.minAmplitude,
      maxAmplitude: this.maxAmplitude,
      amplitudeScale: this.amplitudeScale,
      isActive: this.isActive,
    };
  }

  /**
   * 销毁服务
   * 清理所有资源
   */
  destroy(): void {
    console.log('🧹 LipSyncService 销毁中...');
    this.stop();
    console.log('✅ LipSyncService 已销毁');
  }
}

export default LipSyncService;

