/**
 * Live2D 通用工具类
 * 封装了 Live2D 模型的通用设置和管理逻辑，避免在多个地方重复代码
 * 重构版本：移除重复逻辑，使用统一配置管理
 */


export class Live2DCommon {
    constructor() {
        this.currentModel = null;
        this.pixiApp = null;
        this.isInitialized = false;
        this.configManager = null;
    }

    /**
     * 应用模型设置 - 重构版本，使用统一配置管理
     * @param {Object} model - Live2D 模型对象
     * @param {Object} renderer - PIXI 渲染器
     * @param {Object} configManager - 配置管理器实例
     * @param {Object} overrides - 覆盖配置
     */
    static applyModelSettings(model, renderer, configManager = null, overrides = {}) {
        // 获取配置管理器
        const manager = configManager || (typeof window !== 'undefined' && window.live2dConfigManager);
        
        if (!manager || !manager.getConfig()) {
            console.warn('⚠️ 配置管理器不可用，使用默认设置');
            return Live2DCommon.applyLegacyModelSettings(model, renderer, overrides);
        }

        const config = manager.getConfig();
        const modelSettings = manager.getModelSettings();
        
        if (!modelSettings) {
            console.warn('⚠️ 无法获取模型设置，使用默认设置');
            return Live2DCommon.applyLegacyModelSettings(model, renderer, overrides);
        }

        console.log('🔧 使用统一配置管理器应用模型设置:', {
            deviceInfo: config.deviceInfo,
            modelSettings,
            overrides
        });

        // 计算实际尺寸
        const screenSize = config.deviceInfo.screenSize || { width: window.innerWidth, height: window.innerHeight };
        const { scale: scaleConfig, position: posConfig, isDebugMode, isMobile } = modelSettings;

        // 计算缩放比例
        let scale;
        if (typeof scaleConfig === 'number') {
            scale = scaleConfig;
        } else {
            const baseScale = isMobile 
                ? Math.min(screenSize.height / 1000, screenSize.width / 800)
                : Math.min(screenSize.height / 800, screenSize.width / 1200);
            
            scale = Math.max(scaleConfig.min, Math.min(scaleConfig.max, baseScale));
        }

        // 应用覆盖配置中的缩放
        if (overrides.scale !== undefined) {
            scale = overrides.scale;
        }

        // 计算位置
        let x = renderer.width * (posConfig.x || 0.5) * scale;
        let y = renderer.height * (posConfig.y || 0.5) * scale;
        const offsetX = posConfig.offsetX || 0;
        const offsetY = posConfig.offsetY || 0;

        // 应用覆盖配置中的位置
        if (overrides.position) {
            if (overrides.position.x !== undefined) x = renderer.width * overrides.position.x;
            if (overrides.position.y !== undefined) y = renderer.height * overrides.position.y;
        }

        // 设置模型属性
        model.scale.set(scale);
        model.x = x + offsetX;
        model.y = y + offsetY;
        model.anchor.set(0.5, 0.5);
        model.visible = true;
        model.alpha = 1.0;

        const finalSettings = {
            visible: model.visible,
            alpha: model.alpha,
            scale: model.scale.x,
            position: { x: model.x, y: model.y },
            isDebugMode,
            isMobile
        };

        console.log('✅ 模型设置应用完成:', model.x, model.y, model.scale.x, model.anchor.x, model.anchor.y);

        // 发送消息（如果在WebView环境）
        Live2DCommon.sendToReactNative({
            type: 'model_settings_applied',
            status: 'success',
            settings: finalSettings,
            config: config.deviceInfo
        });

        return { scale, x: model.x, y: model.y };
    }

    /**
     * 兼容性方法：使用传统方式应用模型设置（当配置管理器不可用时）
     */
    static applyLegacyModelSettings(model, renderer, options = {}) {
        console.log('⚠️ 使用传统模型设置方法');
        
        const isMobile = options.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);
        const scale = isMobile ? 0.5 : 0.7;
        const x = renderer.width * (isMobile ? 0.8 : 0.8);
        const y = renderer.height * (isMobile ? 0.7 : 0.7);

        model.scale.set(scale);
        model.x = x;
        model.y = y;
        model.anchor.set(0.5, 0.5);
        model.visible = true;
        model.alpha = 1.0;

        return { scale, x, y };
    }

    /**
     * 创建 PIXI 应用的通用配置 - 重构版本，使用统一配置管理
     * @param {HTMLCanvasElement} canvas - Canvas 元素
     * @param {Object} configManager - 配置管理器实例
     * @param {Object} options - 额外配置选项
     */
    static createPIXIConfig(canvas, configManager = null, options = {}) {
        // 确保 canvas 具有正确的 WebGL 上下文设置
        if (canvas) {
            // 清理可能存在的旧上下文
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl && gl.isContextLost()) {
                console.warn('WebGL 上下文已丢失，等待恢复...');
            }
        }

        // 获取配置管理器
        const manager = configManager || (typeof window !== 'undefined' && window.live2dConfigManager);
        
        let webglConfig = {
            antialias: true,
            powerPreference: 'high-performance',
            resolution: (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
        };

        // 如果有配置管理器，使用其WebGL配置
        if (manager && manager.getConfig()) {
            const config = manager.getConfig();
            webglConfig = { ...webglConfig, ...config.webglConfig };
            
            console.log('🔧 使用配置管理器的WebGL设置:', {
                deviceInfo: config.deviceInfo,
                webglConfig: config.webglConfig
            });
        }

        const defaultConfig = {
            view: canvas,
            width: (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 800),
            height: (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 600),
            transparent: true,
            backgroundAlpha: 0,
            autoStart: true,
            autoDensity: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            forceCanvas: false,
            forceFXAA: false,
            ...webglConfig
        };

        const finalConfig = { ...defaultConfig, ...options };
        
        console.log('🎯 PIXI 配置已创建:', finalConfig);
        
        return finalConfig;
    }

    /**
     * 创建和配置 Live2D 容器
     * @param {string} containerId - 容器 ID
     * @param {string} canvasId - Canvas ID
     */
    static createLive2DContainer(containerId = 'live2d-container', canvasId = 'live2d-canvas') {
        // 移除可能存在的旧容器
        const existingContainer = document.getElementById(containerId);
        if (existingContainer) {
            existingContainer.remove();
        }

        // 创建新的容器
        const container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = `
            position: fixed;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            pointer-events: none;
            background: none;
            opacity: 1;
            overflow: hidden;
            visibility: visible;
        `;

        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.style.cssText = `
            right: 0;
            bottom: 0;
            pointer-events: none;
            display: block;
            opacity: 1;
            visibility: visible;
            background: transparent;
            width: 100%;
            height: 100%;
        `;

        container.appendChild(canvas);
        document.body.appendChild(container);
        
        return { container, canvas };
    }

    /**
     * 加载模型的通用逻辑 - 重构版本，使用统一配置管理
     * @param {string} modelPath - 模型路径
     * @param {Object} pixiApp - PIXI 应用实例
     * @param {Object} configManager - 配置管理器实例
     * @param {Object} options - 额外配置选项
     */
    static async loadModel(modelPath, pixiApp, configManager = null, options = {}) {
        try {
            console.log('🚀 开始加载模型:', modelPath);
            
            // 检查 WebGL 上下文是否有效
            if (pixiApp.renderer && pixiApp.renderer.gl) {
                const gl = pixiApp.renderer.gl;
                if (gl.isContextLost()) {
                    throw new Error('WebGL 上下文已丢失，无法加载模型');
                }
            }
            
            // 获取配置管理器
            const manager = configManager || (typeof window !== 'undefined' && window.live2dConfigManager);
            
            // 合并模型配置
            let modelConfig = { autoInteract: false };
            if (manager && manager.getConfig()) {
                modelConfig = { ...modelConfig, ...manager.getConfig().modelConfig };
            }
            modelConfig = { ...modelConfig, ...options.modelConfig };
            
            console.log('🔧 模型配置:', modelConfig);
            
            const model = await window.PIXI.live2d.Live2DModel.from(modelPath, modelConfig);
            
            // 设置 WebGL 上下文处理器
            Live2DCommon.setupWebGLContextHandlers(pixiApp, model);
            
            // 应用设置（使用配置管理器）
            Live2DCommon.applyModelSettings(model, pixiApp.renderer, manager, options);
            
            // 添加到舞台
            pixiApp.stage.addChild(model);
            
            console.log('✅ Live2D 模型加载成功');
            
            // 发送成功消息
            Live2DCommon.sendToReactNative({
                type: 'model_loaded',
                status: 'success',
                modelPath,
                modelConfig
            });
            
            return model;
        } catch (error) {
            console.error('❌ 模型加载失败:', error);
            
            // 发送失败消息
            Live2DCommon.sendToReactNative({
                type: 'model_loaded',
                status: 'error',
                error: error.message,
                modelPath
            });
            
            throw error;
        }
    }

    /**
     * 脚本加载器 - 按顺序加载多个脚本
     * @param {Array} scriptSources - 脚本路径数组
     * @param {Function} callback - 加载完成回调
     */
    static loadScriptsSequentially(scriptSources, callback) {
        let loadedCount = 0;
        
        const loadNextScript = () => {
            if (loadedCount >= scriptSources.length) {
                console.log('所有脚本加载完成');
                if (callback) callback();
                return;
            }

            const script = document.createElement('script');
            script.src = scriptSources[loadedCount];
            script.async = false;
            
            script.onload = () => {
                console.log(`脚本加载成功: ${scriptSources[loadedCount]}`);
                loadedCount++;
                loadNextScript();
            };
            
            script.onerror = () => {
                console.error(`脚本加载失败: ${scriptSources[loadedCount]}`);
                loadedCount++;
                loadNextScript();
            };
            
            document.head.appendChild(script);
        };

        loadNextScript();
    }

    /**
     * 检查 Live2D 依赖是否已加载
     */
    static checkDependencies() {
        return {
            PIXI: typeof window.PIXI !== 'undefined',
            Live2DModel: typeof window.PIXI?.live2d?.Live2DModel !== 'undefined',
            allLoaded: typeof window.PIXI !== 'undefined' && typeof window.PIXI?.live2d?.Live2DModel !== 'undefined'
        };
    }

    /**
     * 等待依赖加载完成 - 改进版本
     * @param {Function} callback - 回调函数
     * @param {number} maxWait - 最大等待时间（毫秒）
     */
    static waitForDependencies(callback, maxWait = 30000) {
        const startTime = Date.now();
        const checkInterval = 500; // 减少检查频率
        
        const checkAndWait = () => {
            const deps = Live2DCommon.checkDependencies();
            const elapsedTime = Date.now() - startTime;
            
            console.log('🔍 依赖检查状态:', {
                PIXI: deps.PIXI,
                Live2DModel: deps.Live2DModel,
                allLoaded: deps.allLoaded,
                elapsedTime: elapsedTime + 'ms',
                maxWait: maxWait + 'ms'
            });
            
            if (deps.allLoaded) {
                console.log('✅ Live2D 依赖加载完成');
                callback(null);
                return;
            }
            
            if (elapsedTime > maxWait) {
                const timeoutError = new Error(`Dependencies loading timeout after ${(elapsedTime/1000).toFixed(1)}s`);
                console.error('❌ Live2D 依赖加载超时:', {
                    elapsedTime: elapsedTime + 'ms',
                    deps: deps,
                    maxWait: maxWait + 'ms'
                });
                callback(timeoutError);
                return;
            }
            
            // 继续等待
            setTimeout(checkAndWait, checkInterval);
        };
        
        // 立即开始第一次检查
        checkAndWait();
    }

    /**
     * 设置 WebGL 上下文丢失和恢复处理器
     * @param {Object} pixiApp - PIXI 应用
     * @param {Object} model - Live2D 模型
     */
    static setupWebGLContextHandlers(pixiApp, model) {
        if (!pixiApp || !pixiApp.view) return;
        
        const canvas = pixiApp.view;
        
        // WebGL 上下文丢失处理
        canvas.addEventListener('webglcontextlost', (event) => {
            console.warn('⚠️ WebGL 上下文丢失事件触发');
            event.preventDefault(); // 阻止默认行为，允许恢复
            
            // 通知应用层
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'webgl_context_lost',
                    message: 'WebGL 上下文已丢失'
                }));
            }
        });
        
        // WebGL 上下文恢复处理  
        canvas.addEventListener('webglcontextrestored', (event) => {
            console.log('✅ WebGL 上下文已恢复，重新初始化...');
            
            try {
                // 重新初始化渲染器
                if (pixiApp.renderer) {
                    pixiApp.renderer.reset();
                }
                
                // 重新应用模型设置
                if (model && pixiApp.renderer) {
                    const globalConfig = (typeof window !== 'undefined' && window.Live2DConfig) || {};
                    Live2DCommon.applyModelSettings(model, pixiApp.renderer, globalConfig);
                }
                
                console.log('✅ WebGL 上下文恢复完成');
                
                // 通知应用层
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'webgl_context_restored',
                        message: 'WebGL 上下文已恢复'
                    }));
                }
            } catch (error) {
                console.error('❌ WebGL 上下文恢复失败:', error);
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'webgl_context_restore_failed',
                        error: error.message
                    }));
                }
            }
        });
        
        console.log('✅ WebGL 上下文处理器已设置');
    }

    /**
     * 创建响应式处理器 - 重构版本，使用统一配置管理
     * @param {Object} model - Live2D 模型
     * @param {Object} pixiApp - PIXI 应用
     * @param {Object} configManager - 配置管理器实例
     * @param {Object} options - 额外配置选项
     */
    static createResizeHandler(model, pixiApp, configManager = null, options = {}) {
        const manager = configManager || (typeof window !== 'undefined' && window.live2dConfigManager);
        
        return () => {
            if (pixiApp && pixiApp.renderer) {
                // 检查 WebGL 上下文是否有效
                if (pixiApp.renderer.gl && pixiApp.renderer.gl.isContextLost()) {
                    console.warn('⚠️ WebGL 上下文丢失，跳过 resize 操作');
                    return;
                }
                
                pixiApp.renderer.resize(
                    (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 800),
                    (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 600)
                );
            }
            
            if (model) {
                // 如果有配置管理器，先更新其配置
                if (manager && typeof window !== 'undefined') {
                    const deviceAdapter = Live2DConfigManager.createDeviceAdapter();
                    const newScreenSize = deviceAdapter.getScreenSize();
                    const newIsMobile = deviceAdapter.isMobile();
                    const newPerformanceLevel = deviceAdapter.getPerformanceLevel();
                    
                    manager.updateConfig({
                        deviceInfo: {
                            ...manager.getConfig().deviceInfo,
                            screenSize: newScreenSize,
                            isMobile: newIsMobile,
                            performanceLevel: newPerformanceLevel
                        }
                    });
                }
                
                // 重新应用模型设置
                Live2DCommon.applyModelSettings(model, pixiApp.renderer, manager, options);
                
                console.log('📱 响应式处理器已执行，模型设置已更新');
            }
        };
    }

    /**
     * 清理 Live2D 资源
     * @param {Object} model - Live2D 模型
     * @param {Object} pixiApp - PIXI 应用
     * @param {string} containerId - 容器 ID
     */
    static cleanup(model, pixiApp, containerId = 'live2d-container') {
        console.log('🧹 开始清理 Live2D 资源...');
        
        // 🎯 全局错误处理和状态检查
        try {
            // 检查 WebGL 上下文状态
            if (pixiApp && pixiApp.renderer && pixiApp.renderer.gl) {
                const gl = pixiApp.renderer.gl;
                if (gl.isContextLost()) {
                    console.log('⚠️ WebGL 上下文已丢失，跳过部分清理操作');
                    // 如果上下文已丢失，直接清理容器
                    this.cleanupContainerOnly(containerId);
                    return;
                }
            }
        } catch (checkError) {
            console.warn('⚠️ 状态检查时出错，继续清理:', checkError);
        }
        
        // 清理模型
        if (model) {
            try {
                if (pixiApp && pixiApp.stage && pixiApp.stage.children.includes(model)) {
                    pixiApp.stage.removeChild(model);
                    console.log('✅ 模型已从舞台移除');
                }
                
                // 清理模型资源
                if (typeof model.destroy === 'function') {
                    model.destroy({ children: true, texture: true, baseTexture: true });
                    console.log('✅ 模型资源已销毁');
                }
            } catch (e) {
                console.warn('⚠️ 清理模型时出错:', e);
            }
        }

        // 清理 PIXI 应用和 WebGL 上下文
        if (pixiApp) {
            try {
                // 🎯 获取 WebGL 上下文引用（在销毁前）
                let gl = null;
                let loseContextExtension = null;
                
                if (pixiApp.renderer && pixiApp.renderer.gl) {
                    gl = pixiApp.renderer.gl;
                    loseContextExtension = gl.getExtension('WEBGL_lose_context');
                }
                
                // 先清理所有子元素
                if (pixiApp.stage) {
                    try {
                        pixiApp.stage.removeChildren();
                        console.log('✅ 舞台子元素已清理');
                    } catch (stageError) {
                        console.warn('⚠️ 清理舞台子元素时出错:', stageError);
                    }
                }
                
                // 停止渲染器
                if (pixiApp.ticker) {
                    try {
                        pixiApp.ticker.stop();
                        pixiApp.ticker.destroy();
                        console.log('✅ 渲染器已停止');
                    } catch (tickerError) {
                        console.warn('⚠️ 停止渲染器时出错:', tickerError);
                    }
                }
                
                // 清理渲染器纹理
                if (pixiApp.renderer && pixiApp.renderer.textureManager) {
                    try {
                        pixiApp.renderer.textureManager.destroyUnmanagedTextures();
                        console.log('✅ 纹理管理器已清理');
                    } catch (textureError) {
                        console.warn('⚠️ 清理纹理时出错:', textureError);
                    }
                }
                
                // 🎯 更安全的 PIXI 应用销毁方法
                try {
                    // 先尝试温和的销毁
                    if (typeof pixiApp.destroy === 'function') {
                        pixiApp.destroy(true, { 
                            children: true, 
                            texture: true, 
                            baseTexture: true 
                        });
                        console.log('✅ PIXI 应用已销毁');
                    } else {
                        console.warn('⚠️ PIXI 应用没有 destroy 方法');
                    }
                } catch (destroyError) {
                    console.warn('⚠️ 销毁 PIXI 应用时出错，尝试强制清理:', destroyError);
                    // 如果正常销毁失败，尝试手动清理关键组件
                    try {
                        if (pixiApp.stage) {
                            pixiApp.stage.destroy({ children: true });
                        }
                        if (pixiApp.renderer) {
                            pixiApp.renderer.destroy();
                        }
                        console.log('✅ PIXI 应用强制清理完成');
                    } catch (forceError) {
                        console.warn('⚠️ 强制清理也失败:', forceError);
                    }
                }
                
                // 🎯 在 PIXI 应用销毁后再强制丢失 WebGL 上下文
                if (gl && loseContextExtension && !gl.isContextLost()) {
                    try {
                        console.log('🔄 强制丢失 WebGL 上下文以确保清理');
                        loseContextExtension.loseContext();
                    } catch (contextError) {
                        console.warn('⚠️ 强制丢失 WebGL 上下文时出错:', contextError);
                    }
                }
                
            } catch (e) {
                console.warn('⚠️ 清理 PIXI 应用时出错:', e);
            }
        }

        // 清理容器和 Canvas
        const container = document.getElementById(containerId);
        if (container) {
            // 🎯 更安全地清理所有 canvas 元素
            const canvases = container.querySelectorAll('canvas');
            canvases.forEach((canvas, index) => {
                try {
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (gl && !gl.isContextLost()) {
                        const loseContext = gl.getExtension('WEBGL_lose_context');
                        if (loseContext) {
                            loseContext.loseContext();
                            console.log(`🔄 Canvas ${index} WebGL 上下文已强制丢失`);
                        }
                    }
                } catch (canvasError) {
                    console.warn(`⚠️ 清理 Canvas ${index} 时出错:`, canvasError);
                }
            });
            
            container.remove();
            console.log('✅ 容器已移除');
        }
        
        // 清理全局引用
        if (typeof window !== 'undefined') {
            window.currentModel = null;
            window.pixiApp = null;
            console.log('✅ 全局引用已清理');
        }
        
        console.log('🎉 Live2D 资源清理完成');
    }

    /**
     * 🎯 仅清理容器（当 WebGL 上下文已丢失时使用）
     * @param {string} containerId - 容器 ID
     */
    static cleanupContainerOnly(containerId = 'live2d-container') {
        try {
            const container = document.getElementById(containerId);
            if (container) {
                // 强制移除容器及其所有子元素
                container.innerHTML = '';
                container.remove();
                console.log('✅ 容器已清理（WebGL 上下文丢失模式）');
            }
            
            // 清理全局变量
            if (typeof window !== 'undefined') {
                window.currentModel = null;
                window.pixiApp = null;
                console.log('✅ 全局变量已重置');
            }
        } catch (error) {
            console.warn('⚠️ 容器清理时出错:', error);
        }
    }

    /**
     * 发送消息到 React Native WebView
     * @param {Object} message - 消息对象
     */
    static sendToReactNative(message) {
        // 同时在控制台输出，方便调试
        console.log('📤 发送消息到 React Native:', message);
        
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else {
            console.warn('⚠️ ReactNativeWebView 不可用，消息未发送:', message);
        }
    }

    /**
     * 常用的脚本路径配置
     */
    static get DEFAULT_SCRIPTS() {
        // Expo Web 的静态资源路径：public 目录下的文件直接可访问
        return [
            '/live2d/libs/live2dcubismcore.min.js',
            '/live2d/libs/live2d.min.js', 
            '/live2d/libs/pixi.min.js',
            '/live2d/libs/index.min.js',
        ];
    }

    /**
     * 常用的模型路径配置
     */
    static get DEFAULT_MODEL_PATH() {
        return '/live2d/mao_pro/mao_pro.model3.json';
    }
}

// 导出为全局变量（用于 HTML 环境）
if (typeof window !== 'undefined') {
    window.Live2DCommon = Live2DCommon;
}
