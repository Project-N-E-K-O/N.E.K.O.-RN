import { LipSyncService } from '@/services/LipSyncService';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useLipSync Hook - 口型同步钩子
 * 
 * 简化 LipSyncService 的使用，提供自动生命周期管理
 * 
 * 策略：与 Web 版本一致，无平滑立即响应
 * 
 * @param options 配置选项
 * @returns 口型同步服务控制对象
 */
export const useLipSync = (options?: {
  minAmplitude?: number;
  maxAmplitude?: number;
  amplitudeScale?: number;
  autoStart?: boolean; // 是否自动启动
}) => {
  const serviceRef = useRef<LipSyncService | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // 初始化服务
  useEffect(() => {
    console.log('🎤 useLipSync 初始化中 (无平滑模式)...');
    
    // 创建 LipSyncService 实例
    serviceRef.current = new LipSyncService({
      minAmplitude: options?.minAmplitude,
      maxAmplitude: options?.maxAmplitude,
      amplitudeScale: options?.amplitudeScale,
    });

    // 如果设置了自动启动，则启动服务
    if (options?.autoStart) {
      serviceRef.current.start();
      setIsActive(true);
    }

    // 更新配置状态
    setConfig(serviceRef.current.getConfig());

    // 清理函数
    return () => {
      console.log('🧹 useLipSync 清理中...');
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
      setIsActive(false);
    };
  }, []); // 仅在组件挂载时执行一次

  /**
   * 启动口型同步
   */
  const start = useCallback(() => {
    if (serviceRef.current && !serviceRef.current.isRunning()) {
      serviceRef.current.start();
      setIsActive(true);
      setConfig(serviceRef.current.getConfig());
    }
  }, []);

  /**
   * 停止口型同步
   */
  const stop = useCallback(() => {
    if (serviceRef.current && serviceRef.current.isRunning()) {
      serviceRef.current.stop();
      setIsActive(false);
      setConfig(serviceRef.current.getConfig());
    }
  }, []);

  /**
   * 切换口型同步状态
   */
  const toggle = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }, [isActive, stop, start]);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((newOptions: {
    minAmplitude?: number;
    maxAmplitude?: number;
    amplitudeScale?: number;
  }) => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(newOptions);
      setConfig(serviceRef.current.getConfig());
    }
  }, []);

  /**
   * 获取当前配置
   */
  const getConfig = useCallback(() => {
    return serviceRef.current?.getConfig() || null;
  }, []);

  return {
    // 状态
    isActive,
    config,
    
    // 方法
    start,
    stop,
    toggle,
    updateConfig,
    getConfig,
    
    // 原始服务引用（供高级用户使用）
    service: serviceRef.current,
  };
};

export default useLipSync;

