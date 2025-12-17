import { Directory, File, Paths } from 'expo-file-system';
import { downloadDependenciesFromLocalModel, removeDownloadedModel } from '../utils/live2dDownloader';

/**
 * Live2D 服务配置接口
 */
export interface Live2DServiceConfig {
  modelName: string;
  backendHost: string;
  backendPort: number;
  backendScheme?: 'http' | 'https';
  live2dPath?: string;
  onModelLoaded?: () => void;
  onModelError?: (error: string) => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onModelStateChange?: (state: ModelState) => void;
  onTransformStateChange?: (state: TransformState) => void;
  onAnimationStateChange?: (state: AnimationState) => void;
}

/**
 * 模型状态接口
 */
export interface ModelState {
  path: string | undefined;
  isReady: boolean;
  isLoading: boolean;
}

/**
 * 模型变换状态
 */
export interface TransformState {
  scale: number;
  position: { x: number; y: number };
}

/**
 * 动画状态
 */
export interface AnimationState {
  currentMotion: string;
  currentExpression: string;
  autoBreath: boolean;
  autoBlink: boolean;
}

/**
 * Live2D 视图属性（可直接传递给 ReactNativeLive2dView）
 */
export interface Live2DViewProps {
  modelPath: string | undefined;
  motionGroup: string;
  expression: string;
  scale: number;
  position: { x: number; y: number };
  autoBreath: boolean;
  autoBlink: boolean;
}

/**
 * Live2DService - Live2D 模型服务
 * 
 * 职责：
 * - 管理 Live2D 模型的加载和卸载
 * - 控制动作和表情
 * - 处理模型文件的下载和验证
 * - 管理模型的变换（缩放、位置）
 */
export class Live2DService {
  private config: Live2DServiceConfig;
  private modelState: ModelState;
  private transformState: TransformState;
  private animationState: AnimationState;
  private isInitialized: boolean = false;
  private modelBaseUrl: string;

  constructor(config: Live2DServiceConfig) {
    this.config = {
      backendScheme: 'http',
      live2dPath: 'live2d',
      ...config,
    };

    this.modelBaseUrl = `${this.config.backendScheme}://${this.config.backendHost}:${this.config.backendPort}/${this.config.live2dPath}/${this.config.modelName}`;

    // 初始化状态
    this.modelState = {
      path: undefined,
      isReady: false,
      isLoading: false,
    };

    this.transformState = {
      scale: 0.8,
      position: { x: 0, y: 0 },
    };

    this.animationState = {
      currentMotion: 'Idle',
      currentExpression: 'exp_exp_01',
      autoBreath: true,
      autoBlink: true,
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ Live2DService 已经初始化过了');
      return;
    }

    console.log('🎨 Live2DService 初始化中...');
    this.isInitialized = true;
    console.log('✅ Live2DService 初始化完成');
  }

  /**
   * 验证模型文件是否存在
   */
  private validateModelFiles(): boolean {
    try {
      const modelFile = new File(
        Paths.cache,
        `live2d/${this.config.modelName}/${this.config.modelName}.model3.json`
      );
      const mocFile = new File(
        Paths.cache,
        `live2d/${this.config.modelName}/${this.config.modelName}.moc3`
      );

      const isValid = modelFile.exists && mocFile.exists;

      if (isValid) {
        console.log('✅ 模型文件验证通过');
      } else {
        console.log('❌ 模型文件验证失败');
      }

      return isValid;
    } catch (error) {
      console.error('验证模型文件失败:', error);
      return false;
    }
  }

  /**
   * 加载模型
   */
  async loadModel(): Promise<void> {
    if (this.modelState.isLoading) {
      console.log('⚠️ 模型正在加载中，跳过重复加载');
      return;
    }

    try {
      console.log('🚀 开始加载模型:', this.config.modelName);
      
      this.modelState.isLoading = true;
      this.config.onLoadingStateChange?.(true);
      this.notifyModelStateChange();

      const modelUrl = `${this.modelBaseUrl}/${this.config.modelName}.model3.json`;

      // 创建目录结构
      const cacheDir = new Directory(Paths.cache, 'live2d');
      if (!cacheDir.exists) {
        cacheDir.create();
        console.log('📁 创建缓存目录:', cacheDir.uri);
      }

      const modelDir = new Directory(cacheDir, this.config.modelName);
      if (!modelDir.exists) {
        modelDir.create();
        console.log('📁 创建模型目录:', modelDir.uri);
      }

      // 构建本地路径
      const localPath = `${modelDir.uri}${this.config.modelName}.model3.json`;
      console.log('📍 本地模型路径:', localPath);

      // 检查模型文件是否存在
      const modelFile = new File(modelDir, `${this.config.modelName}.model3.json`);

      if (!modelFile.exists) {
        console.log('📥 模型文件不存在，开始下载...');
        try {
          await File.downloadFileAsync(modelUrl, modelDir);
          console.log('✅ 模型文件下载完成');
        } catch (error) {
          console.error('❌ 模型文件下载失败:', error);
          throw error;
        }
      } else {
        console.log('✅ 模型文件已存在');
      }

      // 检查依赖文件是否完整
      if (!this.validateModelFiles()) {
        console.log('📥 依赖文件缺失，下载依赖文件...');
        await downloadDependenciesFromLocalModel(localPath, modelUrl);
        console.log('✅ 依赖文件下载完成');
      } else {
        console.log('✅ 所有文件都存在，跳过下载');
      }

      // 最终验证所有文件
      if (this.validateModelFiles()) {
        this.modelState.path = localPath;
        this.modelState.isReady = true;
        this.modelState.isLoading = false;
        
        this.config.onLoadingStateChange?.(false);
        this.config.onModelLoaded?.();
        this.notifyModelStateChange();
        
        console.log('🎉 模型加载成功');
      } else {
        throw new Error('模型文件验证失败');
      }
    } catch (error) {
      console.error('❌ 模型加载失败:', error);
      
      this.modelState.path = undefined;
      this.modelState.isReady = false;
      this.modelState.isLoading = false;
      
      this.config.onLoadingStateChange?.(false);
      this.config.onModelError?.(`模型加载失败: ${error}`);
      this.notifyModelStateChange();
      
      throw error;
    }
  }

  /**
   * 卸载模型
   */
  unloadModel(): void {
    console.log('🔄 卸载模型');
    
    this.modelState.path = undefined;
    this.modelState.isReady = false;
    this.modelState.isLoading = false;
    
    this.notifyModelStateChange();
  }

  /**
   * 清理模型缓存
   */
  async clearModelCache(): Promise<void> {
    console.log('🧹 清理模型缓存');

    // 先卸载模型
    if (this.modelState.isReady) {
      this.unloadModel();
    }

    // 删除文件
    try {
      await removeDownloadedModel(`live2d/${this.config.modelName}/`);
      console.log('✅ 模型缓存已清理');
    } catch (error) {
      console.error('❌ 清理模型缓存失败:', error);
      throw error;
    }
  }

  /**
   * 播放动作
   */
  playMotion(motionGroup: string): void {
    console.log('🎬 播放动作:', motionGroup);
    this.animationState.currentMotion = motionGroup;
    this.notifyAnimationStateChange();
  }

  /**
   * 设置表情
   */
  setExpression(expression: string): void {
    console.log('😊 设置表情:', expression);
    this.animationState.currentExpression = expression;
    this.notifyAnimationStateChange();
  }

  /**
   * 设置缩放
   */
  setScale(scale: number): void {
    console.log('🔍 设置缩放:', scale);
    this.transformState.scale = scale;
    this.notifyTransformStateChange();
  }

  /**
   * 设置位置
   */
  setPosition(x: number, y: number): void {
    console.log('📍 设置位置:', x, y);
    this.transformState.position = { x, y };
    this.notifyTransformStateChange();
  }

  /**
   * 重置变换
   */
  resetTransform(): void {
    console.log('🔄 重置变换');
    this.transformState.scale = 0.8;
    this.transformState.position = { x: 0, y: 0 };
    this.notifyTransformStateChange();
  }

  /**
   * 设置自动呼吸
   */
  setAutoBreath(enabled: boolean): void {
    console.log('💨 设置自动呼吸:', enabled);
    this.animationState.autoBreath = enabled;
    this.notifyAnimationStateChange();
  }

  /**
   * 设置自动眨眼
   */
  setAutoBlink(enabled: boolean): void {
    console.log('👁️ 设置自动眨眼:', enabled);
    this.animationState.autoBlink = enabled;
    this.notifyAnimationStateChange();
  }

  /**
   * 获取模型状态
   */
  getModelState(): ModelState {
    return { ...this.modelState };
  }

  /**
   * 获取变换状态
   */
  getTransformState(): TransformState {
    return {
      scale: this.transformState.scale,
      position: { ...this.transformState.position },
    };
  }

  /**
   * 获取动画状态
   */
  getAnimationState(): AnimationState {
    return { ...this.animationState };
  }

  /**
   * 获取 Live2D 视图属性
   */
  getViewProps(): Live2DViewProps {
    return {
      modelPath: this.modelState.isReady ? this.modelState.path : undefined,
      motionGroup: this.animationState.currentMotion,
      expression: this.animationState.currentExpression,
      scale: this.transformState.scale,
      position: this.transformState.position,
      autoBreath: this.animationState.autoBreath,
      autoBlink: this.animationState.autoBlink,
    };
  }

  /**
   * 是否已准备好
   */
  isReady(): boolean {
    return this.modelState.isReady;
  }

  /**
   * 是否正在加载
   */
  isLoading(): boolean {
    return this.modelState.isLoading;
  }

  /**
   * 通知模型状态变化
   */
  private notifyModelStateChange(): void {
    this.config.onModelStateChange?.({ ...this.modelState });
  }

  /**
   * 通知变换状态变化
   */
  private notifyTransformStateChange(): void {
    this.config.onTransformStateChange?.({
      scale: this.transformState.scale,
      position: { ...this.transformState.position },
    });
  }

  /**
   * 通知动画状态变化
   */
  private notifyAnimationStateChange(): void {
    this.config.onAnimationStateChange?.({ ...this.animationState });
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    console.log('🧹 Live2DService 销毁中...');

    // 卸载模型
    if (this.modelState.isReady) {
      this.unloadModel();
    }

    // 重置状态
    this.isInitialized = false;

    console.log('✅ Live2DService 已销毁');
  }
}

