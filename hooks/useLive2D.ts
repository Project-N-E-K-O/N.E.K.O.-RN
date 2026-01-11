import { AnimationState, Live2DService, ModelState, TransformState } from '@/services/Live2DService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseLive2DConfig {
  backendScheme?: 'http' | 'https';
  backendHost: string;
  backendPort: number;
  live2dPath?: string;
  modelName: string;
  autoLoad?: boolean; // 是否自动加载模型
}

export const useLive2D = (config: UseLive2DConfig) => {
  const {
    backendScheme = 'http',
    backendHost,
    backendPort,
    live2dPath = 'live2d',
    modelName,
    autoLoad = false,
  } = config;

  // 从 Live2DService 同步过来的状态（只读）
  const [modelState, setModelState] = useState<ModelState>({
    path: undefined,
    isReady: false,
    isLoading: false,
  });

  const [transformState, setTransformState] = useState<TransformState>({
    scale: 0.8,
    position: { x: 0, y: 0 },
  });

  const [animationState, setAnimationState] = useState<AnimationState>({
    currentMotion: 'Idle',
    currentExpression: 'exp_exp_01',
    autoBreath: true,
    autoBlink: true,
  });

  /**
   * 原生侧是否已完成“模型加载并可渲染”（由 ReactNativeLive2dView 的 onModelLoaded 事件驱动）
   *
   * 与 modelState.isReady 的区别：
   * - modelState.isReady：模型文件已下载/校验完成（JS 资源层 ready）
   * - isNativeModelLoaded：原生 GL/Cubism 已完成加载并发出回调（渲染层 ready）
   */
  const [isNativeModelLoaded, setIsNativeModelLoaded] = useState(false);

  // Service 引用
  const live2dServiceRef = useRef<Live2DService | null>(null);

  // 加载模型
  const loadModel = useCallback(async () => {
    console.log('📥 [useLive2D] loadModel 被调用');

    // JS 资源层已经 ready 时直接跳过，避免重复触发 native initialize 与 Service.loadModel()
    const svc = live2dServiceRef.current;
    if (svc?.isReady() && svc.getModelState().path) {
      console.log('✅ [useLive2D] Service 已 ready，跳过重复 loadModel');
      return;
    }

    console.log('🚀 [useLive2D] 开始调用 Service.loadModel()');
    await live2dServiceRef.current?.loadModel();
  }, []);

  // 卸载模型
  const unloadModel = useCallback(() => {
    live2dServiceRef.current?.unloadModel();
    setIsNativeModelLoaded(false);
  }, []);

  // 清理模型缓存
  const clearModelCache = useCallback(async () => {
    await live2dServiceRef.current?.clearModelCache();
  }, []);

  // 播放动作（直接委托给 Service）
  const playMotion = useCallback((motionGroup: string) => {
    live2dServiceRef.current?.playMotion(motionGroup);
  }, []);

  // 设置表情（直接委托给 Service）
  const setExpression = useCallback((expression: string) => {
    live2dServiceRef.current?.setExpression(expression);
  }, []);

  // 设置缩放（直接委托给 Service）
  const setModelScale = useCallback((newScale: number) => {
    live2dServiceRef.current?.setScale(newScale);
  }, []);

  // 设置位置（直接委托给 Service）
  const setModelPosition = useCallback((x: number, y: number) => {
    live2dServiceRef.current?.setPosition(x, y);
  }, []);

  // 重置位置和缩放（直接委托给 Service）
  const resetTransform = useCallback(() => {
    live2dServiceRef.current?.resetTransform();
  }, []);

  // 模型加载完成回调
  const handleModelLoaded = useCallback(() => {
    console.log('✅ Live2D 模型渲染完成');
    setIsNativeModelLoaded(true);
  }, []);

  // 模型错误回调
  const handleModelError = useCallback((error: any) => {
    console.log(error)
    // console.error('❌ Live2D 错误:', error);
  }, []);

  // 点击回调
  const handleTap = useCallback(() => {
    console.log('👆 模型被点击');
  }, []);

  // 组件初始化
  useEffect(() => {
    console.log('🎨 useLive2D 初始化中...');

    // 创建 Live2DService
    live2dServiceRef.current = new Live2DService({
      modelName,
      backendHost,
      backendPort,
      backendScheme,
      live2dPath,
      onModelLoaded: () => {
        console.log('✅ 模型加载完成');
      },
      onModelError: (error) => {
        console.error('❌ 模型错误:', error);
      },
      onLoadingStateChange: (isLoading) => {
        setModelState(prev => ({ ...prev, isLoading }));
      },
      onModelStateChange: (state) => {
        setModelState(state);
      },
      onTransformStateChange: (state) => {
        setTransformState(state);
      },
      onAnimationStateChange: (state) => {
        setAnimationState(state);
      },
    });

    // 初始化服务并同步初始状态
    live2dServiceRef.current.init().then(() => {
      // 同步初始状态
      if (live2dServiceRef.current) {
        setTransformState(live2dServiceRef.current.getTransformState());
        setAnimationState(live2dServiceRef.current.getAnimationState());
      }

      // 如果需要自动加载
      if (autoLoad) {
        console.log('🎯 自动加载模型');
        // 使用 void 避免未处理的 Promise 警告；重复加载由 Service 内部去重（isLoading guard）
        void loadModel();
      }
    });

    // 清理函数
    return () => {
      console.log('🧹 useLive2D 清理中...');
      live2dServiceRef.current?.destroy();
      live2dServiceRef.current = null;
    };
  }, [modelName, backendHost, backendPort, backendScheme, live2dPath, autoLoad, loadModel]);

  // 使用 useMemo 缓存 live2dProps，避免每次渲染都创建新对象
  const live2dProps = useMemo(() => ({
    modelPath: modelState.isReady ? modelState.path : undefined,
    motionGroup: animationState.currentMotion,
    expression: animationState.currentExpression,
    scale: transformState.scale,
    position: transformState.position,
    autoBreath: animationState.autoBreath,
    autoBlink: animationState.autoBlink,
    onModelLoaded: handleModelLoaded,
    onError: handleModelError,
    onTap: handleTap,
  }), [
    modelState.isReady,
    modelState.path,
    animationState.currentMotion,
    animationState.currentExpression,
    transformState.scale,
    transformState.position,
    animationState.autoBreath,
    animationState.autoBlink,
    handleModelLoaded,
    handleModelError,
    handleTap,
  ]);

  /**
   * LipSync 模式专用 props：
   * - 不传 motionGroup，避免动作系统干扰口型同步观感/稳定性
   */
  const live2dPropsForLipSync = useMemo(() => ({
    ...live2dProps,
    motionGroup: undefined,
  }), [live2dProps]);

  // 当 JS 侧模型路径切换时，重置原生“已加载”标记，等待新一轮 onModelLoaded
  useEffect(() => {
    setIsNativeModelLoaded(false);
  }, [modelState.path]);

  return {
    // 状态（从 Service 同步）
    modelState,
    isNativeModelLoaded,
    currentMotion: animationState.currentMotion,
    currentExpression: animationState.currentExpression,
    scale: transformState.scale,
    position: transformState.position,
    
    // 模型管理方法
    loadModel,
    unloadModel,
    clearModelCache,
    
    // 动画控制方法
    playMotion,
    setExpression,
    setModelScale,
    setModelPosition,
    resetTransform,
    
    // 事件回调
    handleModelLoaded,
    handleModelError,
    handleTap,
    
    // Live2D 视图属性（可直接传给 ReactNativeLive2dView）
    live2dProps,
    live2dPropsForLipSync,
    
    // 原始 Service 引用（供高级用户使用）
    live2dService: live2dServiceRef.current,
  };
};
