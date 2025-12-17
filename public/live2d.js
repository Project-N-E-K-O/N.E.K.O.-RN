console.log('live2d.js 开始执行');

// 辅助函数：构建完整的 URL
function buildUrl(path) {
    const baseUrl = window.BASE_URL || '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path; // 已经是完整 URL
    }
    if (path.startsWith('/')) {
        return baseUrl + path; // 绝对路径
    }
    return baseUrl + '/' + path; // 相对路径
}

window.PIXI = PIXI;
const {Live2DModel} = PIXI.live2d;


// Live2D 管理器类
class Live2DManager {
    constructor() {
        this.currentModel = null;
        this.emotionMapping = null; // { motions: {emotion: [string]}, expressions: {emotion: [string]} }
        this.fileReferences = null; // 保存原始 FileReferences（含 Motions/Expressions）
        this.currentEmotion = 'neutral';
        this.pixi_app = null;
        this.isInitialized = false;
        this.motionTimer = null;
        this.isEmotionChanging = false;
        this.dragEnabled = false;
        this.isFocusing = false;
        this.isLocked = true;
        this.onModelLoaded = null;
        this.onStatusUpdate = null;
        this.modelName = null; // 记录当前模型目录名
        this.modelRootPath = null; // 记录当前模型根路径，如 /static/<modelName>
        
        // 常驻表情：使用官方 expression 播放并在清理后自动重放
        this.persistentExpressionNames = [];

        // UI/Ticker 资源句柄（便于在切换模型时清理）
        this._lockIconTicker = null;
        this._lockIconElement = null;

        // 口型同步控制
        this.mouthValue = 0; // 0~1
        this.mouthParameterId = null; // 例如 'ParamMouthOpenY' 或 'ParamO'
        this._mouthOverrideInstalled = false;
        this._origUpdateParameters = null;
        this._origExpressionUpdateParameters = null;
        this._mouthTicker = null;
    }

    // 从 FileReferences 推导 EmotionMapping（用于兼容历史数据）
    deriveEmotionMappingFromFileRefs(fileRefs) {
        const result = { motions: {}, expressions: {} };

        try {
            // 推导 motions
            const motions = (fileRefs && fileRefs.Motions) || {};
            Object.keys(motions).forEach(group => {
                const items = motions[group] || [];
                const files = items
                    .map(item => (item && item.File) ? String(item.File) : null)
                    .filter(Boolean);
                result.motions[group] = files;
            });

            // 推导 expressions（按 Name 前缀分组）
            const expressions = (fileRefs && Array.isArray(fileRefs.Expressions)) ? fileRefs.Expressions : [];
            expressions.forEach(item => {
                if (!item || typeof item !== 'object') return;
                const name = String(item.Name || '');
                const file = String(item.File || '');
                if (!file) return;
                const group = name.includes('_') ? name.split('_', 1)[0] : 'neutral';
                if (!result.expressions[group]) result.expressions[group] = [];
                result.expressions[group].push(file);
            });
        } catch (e) {
            console.warn('从 FileReferences 推导 EmotionMapping 失败:', e);
        }

        return result;
    }

    // 初始化 PIXI 应用
    async initPIXI(canvasId, containerId, options = {}) {
        if (this.isInitialized) {
            console.warn('Live2D 管理器已经初始化');
            return this.pixi_app;
        }

        const defaultOptions = {
            autoStart: true,
            transparent: true,
            backgroundAlpha: 0
        };

        this.pixi_app = new PIXI.Application({
            view: document.getElementById(canvasId),
            resizeTo: document.getElementById(containerId),
            ...defaultOptions,
            ...options
        });

        this.isInitialized = true;
        return this.pixi_app;
    }

    // 加载用户偏好
    async loadUserPreferences() {
        try {
            const response = await fetch(buildUrl('/api/preferences'));
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('加载用户偏好失败:', error);
        }
        return [];
    }

    // 保存用户偏好
    async saveUserPreferences(modelPath, position, scale) {
        try {
            const preferences = {
                model_path: modelPath,
                position: position,
                scale: scale
            };
            const response = await fetch(buildUrl('/api/preferences'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences)
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error("保存偏好失败:", error);
            return false;
        }
    }



    // 随机选择数组中的一个元素
    getRandomElement(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    // 清除expression到默认状态（使用官方API）
    clearExpression() {
        if (this.currentModel && this.currentModel.internalModel && this.currentModel.internalModel.motionManager && this.currentModel.internalModel.motionManager.expressionManager) {
            try {
                this.currentModel.internalModel.motionManager.expressionManager.resetExpression();
                console.log('expression已使用官方API清除到默认状态');
            } catch (resetError) {
                console.warn('使用官方API清除expression失败:', resetError);
            }
        } else {
            console.warn('无法访问expressionManager，expression清除失败');
        }

        // 如存在常驻表情，清除后立即重放常驻，保证不被清掉
        this.applyPersistentExpressionsNative();
    }

    // 播放表情（优先使用 EmotionMapping.expressions）
    async playExpression(emotion) {
        if (!this.currentModel || !this.emotionMapping) {
            console.warn('无法播放表情：模型或映射配置未加载');
            return;
        }

        // EmotionMapping.expressions 规范：{ emotion: ["expressions/xxx.exp3.json", ...] }
        let expressionFiles = (this.emotionMapping.expressions && this.emotionMapping.expressions[emotion]) || [];

        // 兼容旧结构：从 FileReferences.Expressions 里按前缀分组
        if ((!expressionFiles || expressionFiles.length === 0) && this.fileReferences && Array.isArray(this.fileReferences.Expressions)) {
            const candidates = this.fileReferences.Expressions.filter(e => (e.Name || '').startsWith(emotion));
            expressionFiles = candidates.map(e => e.File).filter(Boolean);
        }

        if (!expressionFiles || expressionFiles.length === 0) {
            console.log(`未找到情感 ${emotion} 对应的表情，将跳过表情播放`);
            return;
        }

        const choiceFile = this.getRandomElement(expressionFiles);
        if (!choiceFile) return;
        
        try {
            // 计算表达文件路径（相对模型根目录）
            const expressionPath = this.resolveAssetPath(choiceFile);
            const response = await fetch(buildUrl(expressionPath));
            if (!response.ok) {
                throw new Error(`Failed to load expression: ${response.statusText}`);
            }
            
            const expressionData = await response.json();
            console.log(`加载表情文件: ${choiceFile}`, expressionData);
            
            // 方法1: 尝试使用原生expression API
            if (this.currentModel.expression) {
                try {
                    // 使用文件名作为候选名称（如果 FileReferences 中存在同名 Name 会成功）
                    const base = String(choiceFile).split('/').pop() || '';
                    const expressionName = base.replace('.exp3.json', '');
                    console.log(`尝试使用原生API播放expression: ${expressionName}`);
                    
                    const expression = await this.currentModel.expression(expressionName);
                    if (expression) {
                        console.log(`成功使用原生API播放expression: ${expressionName}`);
                        return; // 成功播放，直接返回
                    } else {
                        console.warn('原生expression API失败，回退到手动参数设置');
                    }
                } catch (error) {
                    console.warn('原生expression API出错:', error);
                }
            }
            
            // 方法2: 回退到手动参数设置
            console.log('使用手动参数设置播放expression');
            if (expressionData.Parameters) {
                for (const param of expressionData.Parameters) {
                    try {
                        this.currentModel.internalModel.coreModel.setParameterValueById(param.Id, param.Value);
                    } catch (paramError) {
                        console.warn(`设置参数 ${param.Id} 失败:`, paramError);
                    }
                }
            }
            
            console.log(`手动设置表情: ${choiceFile}`);
        } catch (error) {
            console.error('播放表情失败:', error);
        }

        // 重放常驻表情，确保不被覆盖
        try { await this.applyPersistentExpressionsNative(); } catch (e) {}
    }

    // 播放动作
    async playMotion(emotion) {
        if (!this.currentModel) {
            console.warn('无法播放动作：模型未加载');
            return;
        }

        // 优先使用 Cubism 原生 Motion Group（FileReferences.Motions）
        let motions = null;
        if (this.fileReferences && this.fileReferences.Motions && this.fileReferences.Motions[emotion]) {
            motions = this.fileReferences.Motions[emotion]; // 形如 [{ File: "motions/xxx.motion3.json" }, ...]
        } else if (this.emotionMapping && this.emotionMapping.motions && this.emotionMapping.motions[emotion]) {
            // 兼容 EmotionMapping.motions: ["motions/xxx.motion3.json", ...]
            motions = this.emotionMapping.motions[emotion].map(f => ({ File: f }));
        }
        if (!motions || motions.length === 0) {
            console.warn(`未找到情感 ${emotion} 对应的动作，但将保持表情`);
            // 如果没有找到对应的motion，设置一个短定时器以确保expression能够显示
            // 并且不设置回调来清除效果，让表情一直持续
            this.motionTimer = setTimeout(() => {
                this.motionTimer = null;
            }, 500); // 500ms应该足够让expression稳定显示
            return;
        }
        
        const choice = this.getRandomElement(motions);
        if (!choice || !choice.File) return;
        
        try {
            // 清除之前的动作定时器
            if (this.motionTimer) {
                console.log('检测到前一个motion正在播放，正在停止...');
                
                if (this.motionTimer.type === 'animation') {
                    cancelAnimationFrame(this.motionTimer.id);
                } else if (this.motionTimer.type === 'timeout') {
                    clearTimeout(this.motionTimer.id);
                } else if (this.motionTimer.type === 'motion') {
                    // 停止motion播放
                    try {
                        if (this.motionTimer.id && this.motionTimer.id.stop) {
                            this.motionTimer.id.stop();
                        }
                    } catch (motionError) {
                        console.warn('停止motion失败:', motionError);
                    }
                } else {
                    clearTimeout(this.motionTimer);
                }
                this.motionTimer = null;
                console.log('前一个motion已停止');
            }
            
            // 尝试使用Live2D模型的原生motion播放功能
            try {
                // 构建完整的motion路径（相对模型根目录）
                const motionPath = this.resolveAssetPath(choice.File);
                console.log(`尝试播放motion: ${motionPath}`);
                
                // 方法1: 直接使用模型的motion播放功能
                if (this.currentModel.motion) {
                    try {
                        console.log(`尝试播放motion: ${choice.File}`);
                        
                        // 使用情感名称作为motion组名，这样可以确保播放正确的motion
                        console.log(`尝试使用情感组播放motion: ${emotion}`);
                        
                const motion = await this.currentModel.motion(emotion);
                        
                        if (motion) {
                    console.log(`成功开始播放motion（情感组: ${emotion}，预期文件: ${choice.File}）`);
                            
                            // 获取motion的实际持续时间
                            let motionDuration = 5000; // 默认5秒
                            
                            // 尝试从motion文件获取持续时间
                            try {
                                const response = await fetch(buildUrl(motionPath));
                                if (response.ok) {
                                    const motionData = await response.json();
                                    if (motionData.Meta && motionData.Meta.Duration) {
                                        motionDuration = motionData.Meta.Duration * 1000;
                                    }
                                }
                            } catch (error) {
                                console.warn('无法获取motion持续时间，使用默认值');
                            }
                            
                            console.log(`预期motion持续时间: ${motionDuration}ms`);
                            
                            // 设置定时器在motion结束后清理
                            this.motionTimer = setTimeout(() => {
                            console.log(`motion播放完成（预期文件: ${choice.File}）`);
                                this.motionTimer = null;
                                this.clearEmotionEffects();
                            }, motionDuration);
                            
                            return; // 成功播放，直接返回
                        } else {
                            console.warn('motion播放失败');
                        }
                    } catch (error) {
                        console.warn('模型motion方法失败:', error);
                    }
                }
                
                // 方法2: 备用方案 - 如果方法1失败，尝试其他方法
                if (!this.motionTimer) {
                    console.log('方法1失败，尝试备用方案');
                    
                    // 这里可以添加其他备用方案，但目前方法1已经工作
                    console.warn('所有motion播放方法都失败，回退到简单动作');
                    this.playSimpleMotion(emotion);
                }
                
                // 如果所有方法都失败，回退到简单动作
                console.warn(`无法播放motion: ${choice.File}，回退到简单动作`);
                this.playSimpleMotion(emotion);
                
            } catch (error) {
                console.error('motion播放过程中出错:', error);
                this.playSimpleMotion(emotion);
            }
            
        } catch (error) {
            console.error('播放动作失败:', error);
            // 回退到简单动作
            this.playSimpleMotion(emotion);
        }
    }

    // 播放简单动作（回退方案）
    playSimpleMotion(emotion) {
        try {
            switch (emotion) {
                case 'happy':
                    // 轻微点头
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 8);
                    const happyTimer = setTimeout(() => {
                        this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 0);
                        this.motionTimer = null;
                        this.clearEmotionEffects();
                    }, 1000);
                    this.motionTimer = { type: 'timeout', id: happyTimer };
                    break;
                case 'sad':
                    // 轻微低头
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', -5);
                    const sadTimer = setTimeout(() => {
                        this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 0);
                        this.motionTimer = null;
                        this.clearEmotionEffects();
                    }, 1200);
                    this.motionTimer = { type: 'timeout', id: sadTimer };
                    break;
                case 'angry':
                    // 轻微摇头
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleX', 5);
                    setTimeout(() => {
                        this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleX', -5);
                    }, 400);
                    const angryTimer = setTimeout(() => {
                        this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleX', 0);
                        this.motionTimer = null;
                        this.clearEmotionEffects();
                    }, 800);
                    this.motionTimer = { type: 'timeout', id: angryTimer };
                    break;
                case 'surprised':
                    // 轻微后仰
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', -8);
                    const surprisedTimer = setTimeout(() => {
                        this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 0);
                        this.motionTimer = null;
                        this.clearEmotionEffects();
                    }, 800);
                    this.motionTimer = { type: 'timeout', id: surprisedTimer };
                    break;
                default:
                    // 中性状态，重置角度
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleX', 0);
                    this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 0);
                    break;
            }
            console.log(`播放简单动作: ${emotion}`);
        } catch (paramError) {
            console.warn('设置简单动作参数失败:', paramError);
        }
    }

    // 清理当前情感效果
    clearEmotionEffects() {
        let hasCleared = false;
        
        console.log('开始清理情感效果...');
        
        // 清除动作定时器
        if (this.motionTimer) {
            console.log(`清除motion定时器，类型: ${this.motionTimer.type || 'unknown'}`);
            
            if (this.motionTimer.type === 'animation') {
                // 取消动画帧
                cancelAnimationFrame(this.motionTimer.id);
            } else if (this.motionTimer.type === 'timeout') {
                // 清除普通定时器
                clearTimeout(this.motionTimer.id);
            } else if (this.motionTimer.type === 'motion') {
                // 停止motion播放
                try {
                    if (this.motionTimer.id && this.motionTimer.id.stop) {
                        this.motionTimer.id.stop();
                    }
                } catch (motionError) {
                    console.warn('停止motion失败:', motionError);
                }
            } else {
                // 兼容旧的定时器格式
                clearTimeout(this.motionTimer);
            }
            this.motionTimer = null;
            hasCleared = true;
        }
        
        // 重置角度参数
        if (this.currentModel && this.currentModel.internalModel && this.currentModel.internalModel.coreModel) {
            try {
                this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleX', 0);
                this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleY', 0);
                this.currentModel.internalModel.coreModel.setParameterValueById('ParamAngleZ', 0);
                console.log('已重置角度参数');
            } catch (paramError) {
                console.warn('重置角度参数失败:', paramError);
            }
        }
        
        // 恢复idle动画
        if (this.currentModel && this.currentModel.internalModel && this.currentModel.internalModel.motionManager) {
            try {
                // 尝试重新启动idle动画
                if (this.currentModel.internalModel.motionManager.startMotion) {
                    // 这里可以尝试重新启动idle动画，但需要知道具体的idle动画文件
                    if (hasCleared) {
                        console.log('情感效果已清理，模型将恢复默认状态');
                    }
                }
            } catch (motionError) {
                console.warn('恢复idle动画失败:', motionError);
            }
        }
        
        console.log('情感效果清理完成');
    }

    // 设置情感并播放对应的表情和动作
    async setEmotion(emotion) {
        // 如果情感相同，有一定概率随机播放motion
        if (this.currentEmotion === emotion) {
            // 30% 的概率随机播放motion
            if (Math.random() < 0.5) {
                console.log(`情感相同 (${emotion})，随机播放motion`);
                await this.playMotion(emotion);
            } else {
                console.log(`情感相同 (${emotion})，跳过播放`);
                return;
            }
        }
        
        // 防止快速连续点击
        if (this.isEmotionChanging) {
            console.log('情感切换中，忽略新的情感请求');
            return;
        }
        
        console.log(`新情感触发: ${emotion}，当前情感: ${this.currentEmotion}`);
        
        // 设置标志，防止快速连续点击
        this.isEmotionChanging = true;
        
        try {
            console.log(`开始设置新情感: ${emotion}`);
            
            // 清理之前的情感效果（包括定时器等）
            this.clearEmotionEffects();
            
            // 使用官方API清除expression到默认状态
            this.clearExpression();
            
            this.currentEmotion = emotion;
            console.log(`情感已更新为: ${emotion}`);
            
            // 暂停idle动画，防止覆盖我们的动作
            if (this.currentModel && this.currentModel.internalModel && this.currentModel.internalModel.motionManager) {
                try {
                    // 尝试停止所有正在播放的动作
                    if (this.currentModel.internalModel.motionManager.stopAllMotions) {
                        this.currentModel.internalModel.motionManager.stopAllMotions();
                        console.log('已停止idle动画');
                    }
                } catch (motionError) {
                    console.warn('停止idle动画失败:', motionError);
                }
            }
            
            // 播放表情
            await this.playExpression(emotion);
            
            // 播放动作
            await this.playMotion(emotion);
            
            console.log(`情感 ${emotion} 设置完成`);
        } catch (error) {
            console.error(`设置情感 ${emotion} 失败:`, error);
        } finally {
            // 重置标志
            this.isEmotionChanging = false;
        }
    }

    // 加载模型
    async loadModel(modelPath, options = {}) {
        if (!this.pixi_app) {
            throw new Error('PIXI 应用未初始化，请先调用 initPIXI()');
        }

        // 移除当前模型
        if (this.currentModel) {
            // 先清空常驻表情记录
            this.teardownPersistentExpressions();

            // 尝试还原之前覆盖的 updateParameters，避免旧引用在新模型上报错
            try {
                const mm = this.currentModel.internalModel && this.currentModel.internalModel.motionManager;
                if (mm) {
                    if (this._mouthOverrideInstalled && typeof this._origUpdateParameters === 'function') {
                        try { mm.updateParameters = this._origUpdateParameters; } catch (_) {}
                    }
                    if (mm && mm.expressionManager && this._mouthOverrideInstalled && typeof this._origExpressionUpdateParameters === 'function') {
                        try { mm.expressionManager.updateParameters = this._origExpressionUpdateParameters; } catch (_) {}
                    }
                }
            } catch (_) {}
            this._mouthOverrideInstalled = false;
            this._origUpdateParameters = null;
            this._origExpressionUpdateParameters = null;
            // 同时移除 mouthTicker（若曾启用过 ticker 模式）
            if (this._mouthTicker && this.pixi_app && this.pixi_app.ticker) {
                try { this.pixi_app.ticker.remove(this._mouthTicker); } catch (_) {}
                this._mouthTicker = null;
            }

            // 移除由 HTML 锁图标或交互注册的监听，避免访问已销毁的显示对象
            try {
                // 先移除锁图标的 ticker 回调
                if (this._lockIconTicker && this.pixi_app && this.pixi_app.ticker) {
                    this.pixi_app.ticker.remove(this._lockIconTicker);
                }
                this._lockIconTicker = null;
                // 移除锁图标元素
                if (this._lockIconElement && this._lockIconElement.parentNode) {
                    this._lockIconElement.parentNode.removeChild(this._lockIconElement);
                }
                this._lockIconElement = null;
                // 暂停 ticker，期间做销毁，随后恢复
                this.pixi_app.ticker && this.pixi_app.ticker.stop();
            } catch (_) {}
            try {
                this.pixi_app.stage.removeAllListeners && this.pixi_app.stage.removeAllListeners();
            } catch (_) {}
            try {
                this.currentModel.removeAllListeners && this.currentModel.removeAllListeners();
            } catch (_) {}

            // 从舞台移除并销毁旧模型
            try { this.pixi_app.stage.removeChild(this.currentModel); } catch (_) {}
            try { this.currentModel.destroy({ children: true }); } catch (_) {}
            try { this.pixi_app.ticker && this.pixi_app.ticker.start(); } catch (_) {}
        }

        try {
            const model = await Live2DModel.from(modelPath, { autoInteract: false });

            this.currentModel = model;

            // 解析模型目录名与根路径，供资源解析使用
            try {
                let urlString = null;
                if (typeof modelPath === 'string') {
                    urlString = modelPath;
                } else if (modelPath && typeof modelPath === 'object' && typeof modelPath.url === 'string') {
                    urlString = modelPath.url;
                }

                if (typeof urlString !== 'string') throw new TypeError('modelPath/url is not a string');

                const cleanPath = urlString.split('#')[0].split('?')[0];
                const lastSlash = cleanPath.lastIndexOf('/');
                const rootDir = lastSlash >= 0 ? cleanPath.substring(0, lastSlash) : '/static';
                this.modelRootPath = rootDir; // e.g. /static/mao_pro or /static/some/deeper/dir
                const parts = rootDir.split('/').filter(Boolean);
                this.modelName = parts.length > 0 ? parts[parts.length - 1] : null;
                console.log('模型根路径解析:', { modelUrl: urlString, modelName: this.modelName, modelRootPath: this.modelRootPath });
            } catch (e) {
                console.warn('解析模型根路径失败，将使用默认值', e);
                this.modelRootPath = '/static';
                this.modelName = null;
            }

            // 配置渲染纹理数量以支持更多蒙版
            if (model.internalModel && model.internalModel.renderer && model.internalModel.renderer._clippingManager) {
                model.internalModel.renderer._clippingManager._renderTextureCount = 3;
                if (typeof model.internalModel.renderer._clippingManager.initialize === 'function') {
                    model.internalModel.renderer._clippingManager.initialize(
                        model.internalModel.coreModel,
                        model.internalModel.coreModel.getDrawableCount(),
                        model.internalModel.coreModel.getDrawableMasks(),
                        model.internalModel.coreModel.getDrawableMaskCounts(),
                        3
                    );
                }
                console.log('渲染纹理数量已设置为3');
            }

            // 应用位置和缩放设置
            this.applyModelSettings(model, options);

            // 添加到舞台
            this.pixi_app.stage.addChild(model);

            // 设置交互性
            if (options.dragEnabled !== false) {
                this.setupDragAndDrop(model);
            }

            // 设置滚轮缩放
            if (options.wheelEnabled !== false) {
                this.setupWheelZoom(model);
            }

            // 启用鼠标跟踪
            if (options.mouseTracking !== false) {
                this.enableMouseTracking(model);
            }

            // 设置 HTML 锁定图标（在模型完全就绪后再绑定ticker回调）
            this.setupHTMLLockIcon(model);

            // 安装口型覆盖逻辑（屏蔽 motion 对嘴巴的控制）
            try {
                this.installMouthOverride();
                console.log('已安装口型覆盖');
            } catch (e) {
                console.warn('安装口型覆盖失败:', e);
            }

            // 加载 FileReferences 与 EmotionMapping
            if (options.loadEmotionMapping !== false) {
                const settings = model.internalModel && model.internalModel.settings && model.internalModel.settings.json;
                if (settings) {
                    // 保存原始 FileReferences
                    this.fileReferences = settings.FileReferences || null;

                    // 优先使用顶层 EmotionMapping，否则从 FileReferences 推导
                    if (settings.EmotionMapping && (settings.EmotionMapping.expressions || settings.EmotionMapping.motions)) {
                        this.emotionMapping = settings.EmotionMapping;
                    } else {
                        this.emotionMapping = this.deriveEmotionMappingFromFileRefs(this.fileReferences || {});
                    }
                    console.log('已加载情绪映射:', this.emotionMapping);
                } else {
                    console.warn('模型配置中未找到 settings.json，无法加载情绪映射');
                }
            }

            // 先从服务器同步映射（覆盖“常驻”），再设置常驻表情
            try { await this.syncEmotionMappingWithServer({ replacePersistentOnly: true }); } catch(_) {}
            // 设置常驻表情（根据 EmotionMapping.expressions.常驻 或 FileReferences 前缀推导）
            await this.setupPersistentExpressions();

            // 调用回调函数
            if (this.onModelLoaded) {
                this.onModelLoaded(model, modelPath);
            }

            return model;
        } catch (error) {
            console.error('加载模型失败:', error);
            throw error;
        }
    }

    // 不再需要预解析嘴巴参数ID，保留占位以兼容旧代码调用
    resolveMouthParameterId() { return null; }

    // 安装覆盖：在 motion 参数更新后强制写入口型参数
    installMouthOverride() {
        if (!this.currentModel || !this.currentModel.internalModel || !this.currentModel.internalModel.motionManager) {
            throw new Error('模型未就绪，无法安装口型覆盖');
        }

        const mm = this.currentModel.internalModel.motionManager;

        // 如果之前装过在其他模型上，先尝试还原
        try {
            if (this._mouthOverrideInstalled) {
                if (typeof this._origUpdateParameters === 'function') {
                    try { mm.updateParameters = this._origUpdateParameters; } catch (_) {}
                }
                if (mm.expressionManager && typeof this._origExpressionUpdateParameters === 'function') {
                    try { mm.expressionManager.updateParameters = this._origExpressionUpdateParameters; } catch (_) {}
                }
                this._mouthOverrideInstalled = false;
                this._origUpdateParameters = null;
                this._origExpressionUpdateParameters = null;
            }
        } catch (_) {}

        if (typeof mm.updateParameters !== 'function') {
            throw new Error('motionManager.updateParameters 不可用');
        }

        // 绑定原函数并覆盖
        const orig = mm.updateParameters.bind(mm);
        mm.updateParameters = (coreModel, now) => {
            const updated = orig(coreModel, now);
            try {
                const mouthIds = ['ParamMouthOpenY', 'ParamO'];
                for (const id of mouthIds) {
                    try {
                        if (coreModel.getParameterIndex(id) !== -1) {
                            coreModel.setParameterValueById(id, this.mouthValue, 1);
                        }
                    } catch (_) {}
                }
            } catch (_) {}
            return updated;
        };
        this._origUpdateParameters = orig; // 保存可还原的实现（已绑定）

        // 也覆盖 expressionManager.updateParameters，防止表情参数覆盖嘴巴
        if (mm.expressionManager && typeof mm.expressionManager.updateParameters === 'function') {
            const origExp = mm.expressionManager.updateParameters.bind(mm.expressionManager);
            mm.expressionManager.updateParameters = (coreModel, now) => {
                const updated = origExp(coreModel, now);
                try {
                    const mouthIds = ['ParamMouthOpenY', 'ParamO'];
                    for (const id of mouthIds) {
                        try {
                            if (coreModel.getParameterIndex(id) !== -1) {
                                coreModel.setParameterValueById(id, this.mouthValue, 1);
                            }
                        } catch (_) {}
                    }
                } catch (_) {}
                return updated;
            };
            this._origExpressionUpdateParameters = origExp;
        } else {
            this._origExpressionUpdateParameters = null;
        }

        // 若此前使用了 ticker 覆盖，确保移除
        if (this._mouthTicker && this.pixi_app && this.pixi_app.ticker) {
            try { this.pixi_app.ticker.remove(this._mouthTicker); } catch (_) {}
            this._mouthTicker = null;
        }

        this._mouthOverrideInstalled = true;
    }

    // 设置嘴巴开合值（0~1）
    setMouth(value) {
        const v = Math.max(0, Math.min(1, Number(value) || 0));
        this.mouthValue = v;
        // 即时写入一次，best-effort 同步
        try {
            if (this.currentModel && this.currentModel.internalModel) {
                const coreModel = this.currentModel.internalModel.coreModel;
                const mouthIds = ['ParamMouthOpenY', 'ParamO'];
                for (const id of mouthIds) {
                    try {
                        if (coreModel.getParameterIndex(id) !== -1) {
                            coreModel.setParameterValueById(id, this.mouthValue, 1);
                        }
                    } catch (_) {}
                }
            }
        } catch (_) {}
    }

    // 解析资源相对路径（基于当前模型根目录）
    resolveAssetPath(relativePath) {
        if (!relativePath) return '';
        let rel = String(relativePath).replace(/^[\\/]+/, '');
        if (rel.startsWith('static/')) {
            return `/${rel}`;
        }
        if (rel.startsWith('/static/')) {
            return rel;
        }
        return `${this.modelRootPath}/${rel}`;
    }

    // 应用模型设置
    applyModelSettings(model, options) {
        const { preferences, isMobile = false } = options;

        if (isMobile) {
            // 移动端设置
            const scale = Math.min(
                0.5,
                window.innerHeight * 1.3 / 4000,
                window.innerWidth * 1.2 / 2000
            );
            model.scale.set(scale);
            model.x = this.pixi_app.renderer.width * 0.5;
            model.y = this.pixi_app.renderer.height * 0.28;
            model.anchor.set(0.5, 0.1);
        } else {
            // 桌面端设置
            if (preferences && preferences.scale && preferences.position) {
                // 使用保存的偏好设置
                model.scale.set(preferences.scale.x, preferences.scale.y);
                model.x = preferences.position.x;
                model.y = preferences.position.y;
            } else {
                // 使用默认设置
                const scale = Math.min(
                    0.5,
                    (window.innerHeight * 0.75) / 7000,
                    (window.innerWidth * 0.6) / 7000
                );
                model.scale.set(scale);
                model.x = this.pixi_app.renderer.width;
                model.y = this.pixi_app.renderer.height;
            }
            model.anchor.set(0.65, 0.75);
        }
    }

    // 设置拖拽功能
    setupDragAndDrop(model) {
        model.interactive = true;
        this.pixi_app.stage.interactive = true;
        this.pixi_app.stage.hitArea = this.pixi_app.screen;

        let isDragging = false;
        let dragStartPos = new PIXI.Point();

        model.on('pointerdown', (event) => {
            if (this.isLocked) return;
            isDragging = true;
            this.isFocusing = false; // 拖拽时禁用聚焦
            const globalPos = event.data.global;
            dragStartPos.x = globalPos.x - model.x;
            dragStartPos.y = globalPos.y - model.y;
            document.getElementById('live2d-canvas').style.cursor = 'grabbing';
        });

        const onDragEnd = () => {
            if (isDragging) {
                isDragging = false;
                document.getElementById('live2d-canvas').style.cursor = 'grab';
            }
        };

        this.pixi_app.stage.on('pointerup', onDragEnd);
        this.pixi_app.stage.on('pointerupoutside', onDragEnd);

        this.pixi_app.stage.on('pointermove', (event) => {
            if (isDragging) {
                const newPosition = event.data.global;
                model.x = newPosition.x - dragStartPos.x;
                model.y = newPosition.y - dragStartPos.y;
            }
        });
    }

    // 设置滚轮缩放
    setupWheelZoom(model) {
        const onWheelScroll = (event) => {
            if (this.isLocked || !this.currentModel) return;
            event.preventDefault();
            const scaleFactor = 1.1;
            const oldScale = this.currentModel.scale.x;
            let newScale = event.deltaY < 0 ? oldScale * scaleFactor : oldScale / scaleFactor;
            this.currentModel.scale.set(newScale);
        };

        const view = this.pixi_app.view;
        if (view.lastWheelListener) {
            view.removeEventListener('wheel', view.lastWheelListener);
        }
        view.addEventListener('wheel', onWheelScroll, { passive: false });
        view.lastWheelListener = onWheelScroll;
    }
    
    // 设置 HTML 锁形图标
    setupHTMLLockIcon(model) {
        const container = document.getElementById('live2d-canvas');
        
        // 在 l2d_manager 等页面，默认解锁并可交互
        if (!document.getElementById('chat-container')) {
            this.isLocked = false;
            container.style.pointerEvents = 'auto';
            return;
        }

        const lockIcon = document.createElement('div');
        lockIcon.id = 'live2d-lock-icon';
        lockIcon.innerText = this.isLocked ? '🔒' : '🔓';
        Object.assign(lockIcon.style, {
            position: 'fixed',
            zIndex: '30',
            fontSize: '24px',
            cursor: 'pointer',
            userSelect: 'none',
            textShadow: '0 0 4px black',
            pointerEvents: 'auto',
            display: 'none' // 默认隐藏
        });

        document.body.appendChild(lockIcon);
        this._lockIconElement = lockIcon;

        lockIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isLocked = !this.isLocked;
            lockIcon.innerText = this.isLocked ? '🔒' : '🔓';

            if (this.isLocked) {
                container.style.pointerEvents = 'none';
            } else {
                container.style.pointerEvents = 'auto';
            }
        });

        // 初始状态
        container.style.pointerEvents = this.isLocked ? 'none' : 'auto';

        // 持续更新图标位置（保存回调用于移除）
        const tick = () => {
            try {
                if (!model || !model.parent) {
                    // 模型可能已被销毁或从舞台移除
                    if (lockIcon) lockIcon.style.display = 'none';
                    return;
                }
                const bounds = model.getBounds();
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                const targetX = bounds.right * 0.75 + bounds.left * 0.25;
                const targetY = (bounds.top + bounds.bottom) / 2;

                lockIcon.style.left = `${Math.min(targetX, screenWidth - 40)}px`;
                lockIcon.style.top = `${Math.min(targetY, screenHeight - 40)}px`;
            } catch (_) {
                // 忽略单帧异常
            }
        };
        this._lockIconTicker = tick;
        this.pixi_app.ticker.add(tick);
    }

    // 启用鼠标跟踪以检测与模型的接近度
    enableMouseTracking(model, options = {}) {
        const { threshold = 70 } = options;

        this.pixi_app.stage.on('pointermove', (event) => {
            const lockIcon = document.getElementById('live2d-lock-icon');
            const pointer = event.data.global;
            
            // 在拖拽期间不执行任何操作
            if (model.interactive && model.dragging) {
                this.isFocusing = false;
                if (lockIcon) lockIcon.style.display = 'none';
                return;
            }

            const bounds = model.getBounds();
            const dx = Math.max(bounds.left - pointer.x, 0, pointer.x - bounds.right);
            const dy = Math.max(bounds.top - pointer.y, 0, pointer.y - bounds.bottom);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
                this.isFocusing = true;
                if (lockIcon) lockIcon.style.display = 'block';
            } else {
                this.isFocusing = false;
                if (lockIcon) lockIcon.style.display = 'none';
            }

            if (this.isFocusing) {
                model.focus(pointer.x, pointer.y);
            }
        });
    }

    // 获取当前模型
    getCurrentModel() {
        return this.currentModel;
    }

    // 获取当前情感映射
    getEmotionMapping() {
        return this.emotionMapping;
    }

    // 获取 PIXI 应用
    getPIXIApp() {
        return this.pixi_app;
    }
}

// 同步服务器端的情绪映射（可仅替换“常驻”表情组）
Live2DManager.prototype.syncEmotionMappingWithServer = async function(options = {}) {
    const { replacePersistentOnly = true } = options;
    try {
        if (!this.modelName) return;
        const resp = await fetch(buildUrl(`/api/live2d/emotion_mapping/${encodeURIComponent(this.modelName)}`));
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data || !data.success || !data.config) return;

        const serverMapping = data.config || { motions: {}, expressions: {} };
        if (!this.emotionMapping) this.emotionMapping = { motions: {}, expressions: {} };
        if (!this.emotionMapping.expressions) this.emotionMapping.expressions = {};

        if (replacePersistentOnly) {
            if (serverMapping.expressions && Array.isArray(serverMapping.expressions['常驻'])) {
                this.emotionMapping.expressions['常驻'] = [...serverMapping.expressions['常驻']];
            }
        } else {
            this.emotionMapping = serverMapping;
        }
    } catch (_) {
        // 静默失败，保持现有映射
    }
};

// ========== 常驻表情：实现 ==========
Live2DManager.prototype.collectPersistentExpressionFiles = function() {
    // 1) EmotionMapping.expressions.常驻
    const filesFromMapping = (this.emotionMapping && this.emotionMapping.expressions && this.emotionMapping.expressions['常驻']) || [];

    // 2) 兼容：从 FileReferences.Expressions 里按前缀 "常驻_" 推导
    let filesFromRefs = [];
    if ((!filesFromMapping || filesFromMapping.length === 0) && this.fileReferences && Array.isArray(this.fileReferences.Expressions)) {
        filesFromRefs = this.fileReferences.Expressions
            .filter(e => (e.Name || '').startsWith('常驻_'))
            .map(e => e.File)
            .filter(Boolean);
    }

    const all = [...filesFromMapping, ...filesFromRefs];
    // 去重
    return Array.from(new Set(all));
};

Live2DManager.prototype.setupPersistentExpressions = async function() {
    try {
        this.persistentExpressionNames = [];
        this.persistentExpressionParamsByName = {};
        const files = this.collectPersistentExpressionFiles();
        if (!files || files.length === 0) {
            this.teardownPersistentExpressions();
            console.log('未配置常驻表情');
            return;
        }

        for (const file of files) {
            try {
                const url = this.resolveAssetPath(file);
                const resp = await fetch(buildUrl(url));
                if (!resp.ok) continue;
                const data = await resp.json();
                const params = Array.isArray(data.Parameters) ? data.Parameters : [];
                const base = String(file).split('/').pop() || '';
                const name = base.replace('.exp3.json', '');
                // 只有包含参数的表达才加入播放队列
                if (params.length > 0) {
                    this.persistentExpressionNames.push(name);
                    this.persistentExpressionParamsByName[name] = params;
                }
            } catch (e) {
                console.warn('加载常驻表情失败:', file, e);
            }
        }

        // 使用官方 expression API 依次播放一次（若支持），并记录名称
        await this.applyPersistentExpressionsNative();
        console.log('常驻表情已启用，数量:', this.persistentExpressionNames.length);
    } catch (e) {
        console.warn('设置常驻表情失败:', e);
    }
};

Live2DManager.prototype.teardownPersistentExpressions = function() {
    this.persistentExpressionNames = [];
    this.persistentExpressionParamsByName = {};
};

Live2DManager.prototype.applyPersistentExpressionsNative = async function() {
    if (!this.currentModel) return;
    if (typeof this.currentModel.expression !== 'function') return;
    for (const name of this.persistentExpressionNames || []) {
        try {
            const maybe = await this.currentModel.expression(name);
            if (!maybe && this.persistentExpressionParamsByName && Array.isArray(this.persistentExpressionParamsByName[name])) {
                // 回退：手动设置参数
                try {
                    const params = this.persistentExpressionParamsByName[name];
                    const core = this.currentModel.internalModel && this.currentModel.internalModel.coreModel;
                    if (core) {
                        for (const p of params) {
                            try { core.setParameterValueById(p.Id, p.Value); } catch (_) {}
                        }
                    }
                } catch (_) {}
            }
        } catch (e) {
            // 名称可能未注册，尝试回退到手动设置
            try {
                if (this.persistentExpressionParamsByName && Array.isArray(this.persistentExpressionParamsByName[name])) {
                    const params = this.persistentExpressionParamsByName[name];
                    const core = this.currentModel.internalModel && this.currentModel.internalModel.coreModel;
                    if (core) {
                        for (const p of params) {
                            try { core.setParameterValueById(p.Id, p.Value); } catch (_) {}
                        }
                    }
                }
            } catch (_) {}
        }
    }
};

// 创建全局 Live2D 管理器实例
window.Live2DManager = Live2DManager;
window.live2dManager = new Live2DManager();

// 兼容性：保持原有的全局变量和函数
window.LanLan1 = window.LanLan1 || {};
window.LanLan1.setEmotion = (emotion) => window.live2dManager.setEmotion(emotion);
window.LanLan1.playExpression = (emotion) => window.live2dManager.playExpression(emotion);
window.LanLan1.playMotion = (emotion) => window.live2dManager.playMotion(emotion);
window.LanLan1.clearEmotionEffects = () => window.live2dManager.clearEmotionEffects();
window.LanLan1.clearExpression = () => window.live2dManager.clearExpression();
window.LanLan1.setMouth = (value) => window.live2dManager.setMouth(value);

// 自动初始化（如果存在 cubism4Model 变量）
if (typeof cubism4Model !== 'undefined' && cubism4Model) {
    (async function() {
        try {
            // 初始化 PIXI 应用
            await window.live2dManager.initPIXI('live2d-canvas', 'live2d-container');
            
            // 加载用户偏好
            const preferences = await window.live2dManager.loadUserPreferences();
            
            // 根据模型路径找到对应的偏好设置
            let modelPreferences = null;
            if (preferences && preferences.length > 0) {
                modelPreferences = preferences.find(p => p && p.model_path === cubism4Model);
                if (modelPreferences) {
                    console.log('找到模型偏好设置:', modelPreferences);
                } else {
                    console.log('未找到模型偏好设置，将使用默认设置');
                }
            }
            
            // 加载模型
            await window.live2dManager.loadModel(cubism4Model, {
                preferences: modelPreferences,
                isMobile: window.innerWidth <= 768
            });

            // 设置全局引用（兼容性）
            window.LanLan1.live2dModel = window.live2dManager.getCurrentModel();
            window.LanLan1.currentModel = window.live2dManager.getCurrentModel();
            window.LanLan1.emotionMapping = window.live2dManager.getEmotionMapping();

            console.log('Live2D 管理器自动初始化完成');
        } catch (error) {
            console.error('Live2D 管理器自动初始化失败:', error);
        }
    })();
}
