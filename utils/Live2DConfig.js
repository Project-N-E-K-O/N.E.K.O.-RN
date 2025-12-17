/**
 * Live2D 统一配置管理器
 * 负责管理所有与 Live2D 相关的配置，支持热重载和跨平台适配
 */

export class Live2DConfigManager {
    constructor() {
        this.config = null;
        this.listeners = new Set();
        this.platform = this.detectPlatform();
    }

    /**
     * 检测运行平台
     */
    detectPlatform() {
        if (typeof window !== 'undefined') {
            if (window.ReactNativeWebView) {
                return 'react-native-webview';
            }
            return 'web';
        }
        return 'react-native';
    }

    /**
     * 设备适配工具 - 跨平台兼容版本
     */
    static createDeviceAdapter() {
        const getScreenSize = () => {
            if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
                return { width: window.innerWidth, height: window.innerHeight };
            }
            // React Native 环境下的默认值
            return { width: 375, height: 667 };
        };

        const getDevicePixelRatio = () => {
            if (typeof window !== 'undefined' && window.devicePixelRatio) {
                return window.devicePixelRatio;
            }
            return 1;
        };

        const isMobile = () => {
            const screenSize = getScreenSize();
            return screenSize.width <= 768;
        };

        const getPerformanceLevel = () => {
            const screenSize = getScreenSize();
            const totalPixels = screenSize.width * screenSize.height;
            
            if (totalPixels > 2000000) return 'high';
            if (totalPixels > 1000000) return 'medium';
            return 'low';
        };

        return {
            getScreenSize,
            getDevicePixelRatio,
            isMobile,
            getPerformanceLevel
        };
    }

    /**
     * 创建默认配置
     */
    createDefaultConfig() {
        const deviceAdapter = Live2DConfigManager.createDeviceAdapter();
        const isMobile = deviceAdapter.isMobile();
        const screenSize = deviceAdapter.getScreenSize();
        const performanceLevel = deviceAdapter.getPerformanceLevel();

        return {
            // 设备信息
            deviceInfo: {
                isMobile,
                screenSize,
                performanceLevel,
                platform: this.platform,
                devicePixelRatio: deviceAdapter.getDevicePixelRatio()
            },

            // 缩放配置（基于性能等级）
            mobileScale: performanceLevel === 'low' 
                ? { min: 1, max: 1 }
                : { min: 0.2, max: 0.8 },
            desktopScale: performanceLevel === 'high'
                ? { min: 0.2, max: 1.2 }
                : { min: 0.15, max: 1.0 },

            // 位置配置（基于屏幕尺寸）
            mobilePosition: {
                x: 0,
                y: 0,
                offsetX: 0,
                offsetY: 0
            },
            desktopPosition: { 
                x: 0,
                y: 0,
                offsetX: 0,
                offsetY: 0
            },

            // 调试配置
            debugMode: false,
            // debugScale: { 
            //     mobile: performanceLevel === 'low' ? 0.15 : 0.15, 
            //     desktop: 0.2 
            // },
            // debugPosition: { 
            //     mobile: { x: 0.5, y: 0.5, offsetX: 0, offsetY: 0 },
            //     desktop: { x: 0.5, y: 0.5, offsetX: 0, offsetY: 0 }
            // },

            // 动画配置
            enableAnimation: performanceLevel !== 'low',
            autoInteract: false,

            // 响应式设置
            mobileBreakpoint: 768,

            // WebGL 配置
            webglConfig: {
                antialias: performanceLevel === 'high',
                powerPreference: performanceLevel === 'high' ? 'high-performance' : 'default',
                resolution: performanceLevel === 'low' ? 1 : deviceAdapter.getDevicePixelRatio()
            },

            // 模型配置
            modelConfig: {
                autoInteract: false,
                idleMotionGroup: 'Idle',
                // 可扩展的模型特定设置
            }
        };
    }

    /**
     * 初始化配置
     */
    init(customConfig = {}) {
        this.config = { 
            ...this.createDefaultConfig(), 
            ...customConfig 
        };
        
        // 设置响应式监听（仅在Web环境）
        if (this.platform === 'web') {
            this.setupResizeListener();
        } else {
            console.log('🎯 非Web环境，跳过resize监听器设置');
        }

        console.log('🎯 Live2D 配置管理器已初始化:', {
            // platform: this.platform,
            // config: this.config
            mobilePosition: this.config.mobilePosition,
            mobileScale: this.config.mobileScale
        });

        return this.config;
    }

    /**
     * 设置响应式监听（仅在Web环境）
     */
    setupResizeListener() {
        // 检查是否在Web环境且window对象可用
        if (typeof window === 'undefined' || !window.addEventListener) {
            console.log('⚠️ 非Web环境或window不可用，跳过resize监听器设置');
            return () => {}; // 返回空的清理函数
        }

        const handleResize = () => {
            const deviceAdapter = Live2DConfigManager.createDeviceAdapter();
            const newIsMobile = deviceAdapter.isMobile();
            const newScreenSize = deviceAdapter.getScreenSize();
            const newPerformanceLevel = deviceAdapter.getPerformanceLevel();

            this.updateConfig({
                deviceInfo: {
                    ...this.config.deviceInfo,
                    isMobile: newIsMobile,
                    screenSize: newScreenSize,
                    performanceLevel: newPerformanceLevel
                }
            });
        };

        window.addEventListener('resize', handleResize);
        console.log('✅ Web环境resize监听器已设置');
        
        // 返回清理函数
        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('resize', handleResize);
            }
        };
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        if (!this.config) {
            console.warn('配置管理器尚未初始化');
            return;
        }

        const oldConfig = { ...this.config };
        this.config = { 
            ...this.config, 
            ...newConfig 
        };

        console.log('🔄 Live2D 配置已更新:', {
            old: oldConfig,
            new: this.config,
            changes: newConfig
        });

        // 通知所有监听器
        this.notifyListeners(this.config, oldConfig);
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 添加配置变化监听器
     */
    addListener(listener) {
        this.listeners.add(listener);
        
        // 返回移除监听器的函数
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 通知所有监听器
     */
    notifyListeners(newConfig, oldConfig) {
        this.listeners.forEach(listener => {
            try {
                listener(newConfig, oldConfig);
            } catch (error) {
                console.error('配置监听器执行失败:', error);
            }
        });
    }

    /**
     * 获取适配后的模型设置参数
     */
    getModelSettings() {
        if (!this.config) return null;

        const { deviceInfo, debugMode } = this.config;
        const { isMobile } = deviceInfo;

        let scale, position;

        if (isMobile) {
            scale = this.config.mobileScale;
            position = this.config.mobilePosition;
        } else {
            scale = this.config.desktopScale;
            position = this.config.desktopPosition;
        }

        // 调试模式覆盖
        if (debugMode) {
            const debugScale = isMobile ? this.config.debugScale.mobile : this.config.debugScale.desktop;
            const debugPosition = isMobile ? this.config.debugPosition.mobile : this.config.debugPosition.desktop;
            
            return {
                scale: debugScale,
                position: debugPosition,
                isDebugMode: true,
                isMobile
            };
        }

        return {
            scale,
            position,
            isDebugMode: false,
            isMobile
        };
    }

    /**
     * 生成WebView通信用的简化配置
     */
    getWebViewConfig() {
        if (!this.config) return null;

        return {
            ...this.config,
            // 添加一些WebView特定的字段
            timestamp: Date.now(),
            platform: this.platform
        };
    }

    /**
     * 销毁配置管理器
     */
    destroy() {
        this.listeners.clear();
        this.config = null;
        console.log('🗑️ Live2D 配置管理器已销毁');
    }
}

// 导出单例实例
export const live2dConfigManager = new Live2DConfigManager();

// 导出为全局变量（用于HTML环境）
if (typeof window !== 'undefined') {
    window.Live2DConfigManager = Live2DConfigManager;
    window.live2dConfigManager = live2dConfigManager;
}
