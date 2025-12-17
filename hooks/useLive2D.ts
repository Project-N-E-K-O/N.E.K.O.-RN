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

  // Service 引用
  const live2dServiceRef = useRef<Live2DService | null>(null);

  // 加载模型
  const loadModel = useCallback(async () => {
    console.log('📥 [useLive2D] loadModel 被调用');
    
    // 添加延迟，确保原生层和 CubismFramework 已完全初始化
    // 这对于页面首次加载特别重要
    console.log('⏳ [useLive2D] 等待 1 秒，确保 GL 和 CubismFramework 初始化完成...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🚀 [useLive2D] 开始调用 Service.loadModel()');
    await live2dServiceRef.current?.loadModel();
  }, []);

  // 卸载模型
  const unloadModel = useCallback(() => {
    live2dServiceRef.current?.unloadModel();
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
        // loadModel();
      }
    });

    // 清理函数
    return () => {
      console.log('🧹 useLive2D 清理中...');
      live2dServiceRef.current?.destroy();
      live2dServiceRef.current = null;
    };
  }, [modelName, backendHost, backendPort, backendScheme, live2dPath, autoLoad]);

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

  return {
    // 状态（从 Service 同步）
    modelState,
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
    
    // 原始 Service 引用（供高级用户使用）
    live2dService: live2dServiceRef.current,
  };
};
