console.log('app.js 开始执行 - 版本:', new Date().toISOString());

let audioContextInstance = null;

const getAudioContext = () => {
    if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextInstance;
};


// 应用状态变量
// let audioContext;
// let workletNode;
// let stream;
// let isRecording = false;
// let socket;
// let currentGeminiMessage = null;
let audioPlayerContext = null;
// let videoTrack, videoSenderInterval;
// let audioBufferQueue = [];
// let isPlaying = false;
// let audioStartTime = 0;
// let scheduledSources = [];
// let animationFrameId;
// let seqCounter = 0;
// let globalAnalyser = null;
// let lipSyncActive = false;
// let screenCaptureStream = null; // 暂存屏幕共享stream，不再需要每次都弹窗选择共享区域，方便自动重连
// let statusElement = null;
// let micButton = null;
// let muteButton = null;
// let screenButton = null;
// let stopButton = null;
// let resetSessionButton = null;
// let chatContainer = null;

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

// 等待 DOM 加载完成后再获取元素
function init_app() {
    try {
        console.log('app.js 开始初始化');

        // 配置对象
        const lanlan_config = {
            lanlan_name: 'test'
        };

        // 获取DOM元素并进行安全检查
        micButton = document.getElementById('micButton');
        muteButton = document.getElementById('muteButton');
        screenButton = document.getElementById('screenButton');
        stopButton = document.getElementById('stopButton');
        resetSessionButton = document.getElementById('resetSessionButton');
        statusElement = document.getElementById('status');
        chatContainer = document.getElementById('chatContainer');

        // 验证必需的DOM元素
        if (!micButton) {
            console.warn('app.js: micButton 元素未找到');
            return false;
        }
        if (!muteButton) {
            console.warn('app.js: muteButton 元素未找到');
            return false;
        }
        if (!screenButton) {
            console.warn('app.js: screenButton 元素未找到');
            return false;
        }
        if (!stopButton) {
            console.warn('app.js: stopButton 元素未找到');
            return false;
        }
        if (!resetSessionButton) {
            console.warn('app.js: resetSessionButton 元素未找到');
            return false;
        }
        if (!statusElement) {
            console.warn('app.js: statusElement 元素未找到');
            return false;
        }
        if (!chatContainer) {
            console.warn('app.js: chatContainer 元素未找到');
            return false;
        }

        console.log('app.js: 所有 DOM 元素获取成功');

        // 初始化所有功能模块
        initWebSocket(lanlan_config);
        initAudioFunctions();
        initUIHandlers(micButton, muteButton, screenButton, stopButton, resetSessionButton, statusElement);
        initLive2DFunctions();
        initUtilityFunctions(chatContainer, statusElement, lanlan_config);

        return true;
    } catch (error) {
        console.error('app.js 初始化错误:', error);
        return false;
    }

    // WebSocket功能初始化
    function initWebSocket(lanlan_config) {
        console.log('app.js: 初始化WebSocket功能');
        connectWebSocket();

        // 建立WebSocket连接
        function connectWebSocket() {
            const baseUrl = window.BASE_URL || '';
            const protocol = baseUrl.startsWith('https:') ? "wss" : "ws";
            const wsHost = baseUrl.replace(/^https?:\/\//, '');
            const connectionId = Math.random().toString(36).substr(2, 9);

            // 确保使用正确的 lanlan_name
            const lanlanName = lanlan_config.lanlan_name || 'test';
            const wsUrl = `${protocol}://${wsHost}/ws/${lanlanName}`;

            console.log('WebSocket连接信息:', {
                baseUrl: baseUrl,
                protocol: protocol,
                wsHost: wsHost,
                wsUrl: wsUrl,
                lanlan_name: lanlanName,
                original_lanlan_name: lanlan_config.lanlan_name,
                connectionId: connectionId,
                timestamp: new Date().toISOString()
            });

            // 发送连接信息到 React Native 进行调试
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'log',
                    message: `WebSocket连接尝试: ${wsUrl} (lanlan_name: ${lanlanName}, connectionId: ${connectionId})`
                }));
            }

            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('WebSocket连接已建立:', wsUrl);
            };

            socket.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    // 处理二进制音频数据
                    console.log("收到新的音频块")
                    handleAudioBlob(event.data);
                    return;
                }

                try {
                    const response = JSON.parse(event.data);
                    console.log('WebSocket收到消息:', response);

                    if (response.type === 'gemini_response') {
                        // 检查是否是新消息的开始
                        const isNewMessage = response.isNewMessage || false;
                        appendMessage(response.text, 'gemini', isNewMessage);

                        // 如果是新消息，停止并清空当前音频队列
                        if (isNewMessage) {
                            clearAudioQueue();
                        }
                    } else if (response.type === 'user_activity') {
                        clearAudioQueue();
                    } if (response.type === 'cozy_audio') {
                        // 处理音频响应
                        console.log("收到新的音频头")
                        const isNewMessage = response.isNewMessage || false;

                        if (isNewMessage) {
                            // 如果是新消息，清空当前音频队列
                            clearAudioQueue();
                        }

                        // 根据数据格式选择处理方法
                        if (response.format === 'base64') {
                            handleBase64Audio(response.audioData, isNewMessage);
                        }
                    } else if (response.type === 'status') {
                        statusElement.textContent = response.message;
                        if (response.message === `${lanlan_config.lanlan_name}失联了，即将重启！`) {
                            if (isRecording === false) {
                                statusElement.textContent = `${lanlan_config.lanlan_name}正在打盹...`;
                            } else {
                                stopRecording();
                                if (socket.readyState === WebSocket.OPEN) {
                                    socket.send(JSON.stringify({
                                        action: 'end_session'
                                    }));
                                }
                                hideLive2d();
                                micButton.disabled = true;
                                muteButton.disabled = true;
                                screenButton.disabled = true;
                                stopButton.disabled = true;
                                resetSessionButton.disabled = true;

                                setTimeout(async () => {
                                    try {
                                        // 发送start session事件
                                        socket.send(JSON.stringify({
                                            action: 'start_session',
                                            input_type: 'audio'
                                        }));

                                        // 等待2.5秒后执行后续操作
                                        await new Promise(resolve => setTimeout(resolve, 2500));

                                        showLive2d();
                                        await startMicCapture();
                                        if (screenCaptureStream != null) {
                                            await startScreenSharing();
                                        }
                                        statusElement.textContent = `重启完成，${lanlan_config.lanlan_name}回来了！`;
                                    } catch (error) {
                                        console.error("重启时出错:", error);
                                        statusElement.textContent = "重启失败，请手动刷新。";
                                    }
                                }, 7500); // 7.5秒后执行
                            }
                        }
                    } else if (response.type === 'expression') {
                        window.LanLan1.registered_expressions[response.message]();
                    } else if (response.type === 'system' && response.data === 'turn end') {
                        console.log('收到turn end事件，开始情感分析');
                        console.log('当前currentGeminiMessage:', currentGeminiMessage);
                        // 消息完成时进行情感分析
                        if (currentGeminiMessage) {
                            const fullText = currentGeminiMessage.textContent.replace(/^\[\d{2}:\d{2}:\d{2}\] 🎀 /, '');
                            setTimeout(async () => {
                                const emotionResult = await analyzeEmotion(fullText);
                                if (emotionResult && emotionResult.emotion) {
                                    console.log('消息完成，情感分析结果:', emotionResult);
                                    applyEmotion(emotionResult.emotion);
                                }
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('处理消息失败:', error);
                }
            };

            socket.onclose = (event) => {
                console.log('WebSocket连接已关闭:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                    wsUrl: wsUrl
                });
                // 尝试重新连接
                setTimeout(connectWebSocket, 3000);
            };

            socket.onerror = (error) => {
                console.error('WebSocket错误:', {
                    error: error,
                    wsUrl: wsUrl,
                    baseUrl: baseUrl,
                    readyState: socket.readyState
                });

                // 发送错误信息到 React Native
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: `WebSocket连接失败: ${wsUrl}`
                    }));
                }
            };
        }
    }

    // 音频功能初始化
    function initAudioFunctions() {
        console.log('app.js: 初始化音频功能');
    }

    // UI事件处理初始化
    function initUIHandlers(micButton, muteButton, screenButton, stopButton, resetSessionButton, statusElement) {
        console.log('app.js: 初始化UI事件处理');

        console.log("=micButton:", micButton);
        console.log("=statusElement:", statusElement);

        micButton.addEventListener('click', async () => {
            await switchMicCapture();
        });
        muteButton.addEventListener('click', async () => {
            await switchMicCapture();
        });
        // screenButton.addEventListener('click', switchScreenSharing);
        // stopButton.addEventListener('click', switchScreenSharing);
        // resetSessionButton.addEventListener('click', switchScreenSharing);
    }

    // Live2D功能初始化
    function initLive2DFunctions() {
        console.log('app.js: 初始化Live2D功能');
    }

    // 工具函数初始化
    function initUtilityFunctions(chatContainer, statusElement, lanlan_config) {
        console.log('app.js: 初始化工具函数');

        // 将工具函数暴露到全局作用域
        window.appendMessage = appendMessage;
        window.analyzeEmotion = analyzeEmotion;
        window.switchMicCapture = switchMicCapture;
        window.switchScreenSharing = switchScreenSharing;

        // 添加消息到聊天界面
        function appendMessage(text, sender, isNewMessage = true) {
            function getCurrentTimeString() {
                return new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }

            if (sender === 'gemini' && !isNewMessage && currentGeminiMessage) {
                // 追加到现有的Gemini消息
                currentGeminiMessage.insertAdjacentHTML('beforeend', text.replaceAll('\n', '<br>'));
            } else {
                // 创建新消息
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', sender);
                messageDiv.textContent = "[" + getCurrentTimeString() + "] 🎀 " + text;
                chatContainer.appendChild(messageDiv);

                // 如果是Gemini消息，更新当前消息引用
                if (sender === 'gemini') {
                    currentGeminiMessage = messageDiv;
                }
            }
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // 情感分析功能
        async function analyzeEmotion(text) {
            console.log('analyzeEmotion被调用，文本:', text);
            try {
                const response = await fetch(buildUrl('/api/emotion/analysis'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text
                    })
                });

                if (!response.ok) {
                    console.warn('情感分析请求失败:', response.status);
                    return null;
                }

                const result = await response.json();
                console.log('情感分析API返回结果:', result);

                if (result.error) {
                    console.warn('情感分析错误:', result.error);
                    return null;
                }

                return result;
            } catch (error) {
                console.error('情感分析请求异常:', error);
                return null;
            }
        }

        // 切换麦克风功能
        async function switchMicCapture() {

            console.log("==========switchMicCapture==========");
            console.log("muteButton.disabled:", muteButton.disabled);

            if (muteButton.disabled) {
                await startMicCapture();
            } else {
                await stopMicCapture();
            }
        }

        // 切换屏幕共享功能  
        async function switchScreenSharing() {
            if (stopButton.disabled) {
                // 检查是否在录音状态
                if (!isRecording) {
                    statusElement.textContent = '请先开启麦克风！';
                    return;
                }
                await startScreenSharing();
            } else {
                await stopScreenSharing();
            }
        }
    }

    // 工具函数
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    function base64ToFloat32Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // PCM16 → Float32
        const samples = new Float32Array(bytes.length / 2);
        for (let i = 0; i < samples.length; i++) {
            const lo = bytes[i * 2];
            const hi = bytes[i * 2 + 1];
            const val = (hi << 8) | lo;
            samples[i] = val > 32767 ? (val - 65536) / 32768 : val / 32768;
        }
        return samples;
    }

    function onMessage(event, audioCtx, dest) {
        const base64Data = event.data;  // PCM base64
        const float32 = base64ToFloat32Array(base64Data);
        const buffer = audioCtx.createBuffer(1, float32.length, 16000); // 采样率 16k
        buffer.copyToChannel(float32, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination); // 本地播放
        source.connect(dest);                 // 送入 MediaStream
        source.start();
    }

    async function startMicCapture() {  // 开麦，按钮on click
        try {
            console.log("==========开始麦克风==========");

            if (!audioPlayerContext) {
                audioPlayerContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioPlayerContext.state === 'suspended') {
                await audioPlayerContext.resume();
            }

            console.log("==========audioStart==========");

            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'audioStart'
            }));

            const audioCtx = new AudioContext();
            const dest = audioCtx.createMediaStreamDestination();
            window.getRecordedStream = () => dest.stream;

            console.log('⚠️  app.js: 开始监听 onMessage');
            document.addEventListener('message', event => {
                // console.log('app.js onMessage');
                onMessage(event, audioCtx, dest);
            });

            // // 获取麦克风流
            // stream = await navigator.mediaDevices.getUserMedia({audio: true});

            // console.log("==========stream==========");

            // // 检查音频轨道状态
            // const audioTracks = stream.getAudioTracks();
            // console.log("音频轨道数量:", audioTracks.length);
            // console.log("音频轨道状态:", audioTracks.map(track => ({
            //     label: track.label,
            //     enabled: track.enabled,
            //     muted: track.muted,
            //     readyState: track.readyState
            // })));

            // if (audioTracks.length === 0) {
            //     console.error("没有可用的音频轨道");
            //     statusElement.textContent = '无法访问麦克风';
            //     return;
            // }

            await startAudioWorklet(window.getRecordedStream());

            micButton.disabled = true;
            muteButton.disabled = false;
            screenButton.disabled = false;
            stopButton.disabled = true;
            resetSessionButton.disabled = false;
            statusElement.textContent = '正在语音...';
        } catch (err) {
            console.error('获取麦克风权限失败:', err);
            statusElement.textContent = '无法访问麦克风';
        }
    }

    async function stopMicCapture() { // 闭麦，按钮on click
        stopRecording();
        micButton.disabled = false;
        muteButton.disabled = true;
        screenButton.disabled = true;
        stopButton.disabled = true;
        resetSessionButton.disabled = false;
        statusElement.textContent = `${lanlan_config.lanlan_name}待机中...`;
    }

    async function getMobileCameraStream() {
        const makeConstraints = (facing) => ({
            video: {
                facingMode: facing,
                frameRate: { ideal: 1, max: 1 },
            },
            audio: false,
        });

        const attempts = [
            { label: 'rear', constraints: makeConstraints({ ideal: 'environment' }) },
            { label: 'front', constraints: makeConstraints('user') },
            { label: 'any', constraints: { video: { frameRate: { ideal: 1, max: 1 } }, audio: false } },
        ];

        let lastError;

        for (const attempt of attempts) {
            try {
                console.log(`Trying ${attempt.label} camera @ ${1}fps…`);
                return await navigator.mediaDevices.getUserMedia(attempt.constraints);
            } catch (err) {
                console.warn(`${attempt.label} failed →`, err);
                statusElement.textContent = err;
                return err;
            }
        }
    }

    async function startScreenSharing() { // 分享屏幕，按钮on click
        // 检查是否在录音状态
        if (!isRecording) {
            statusElement.textContent = '请先开启麦克风录音！';
            return;
        }

        try {
            // 初始化音频播放上下文
            showLive2d();
            if (!audioPlayerContext) {
                audioPlayerContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // 如果上下文被暂停，则恢复它
            if (audioPlayerContext.state === 'suspended') {
                await audioPlayerContext.resume();
            }
            let captureStream;

            if (screenCaptureStream == null) {
                if (isMobile()) {
                    // On mobile we capture the *camera* instead of the screen.
                    // `environment` is the rear camera (iOS + many Androids). If that's not
                    // available the UA will fall back to any camera it has.
                    screenCaptureStream = await getMobileCameraStream();

                } else {
                    // Desktop/laptop: capture the user's chosen screen / window / tab.
                    screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: 'always',
                            frameRate: 1,
                        },
                        audio: false,
                    });
                }
            }
            startScreenVideoStreaming(screenCaptureStream, isMobile() ? 'camera' : 'screen');

            micButton.disabled = true;
            muteButton.disabled = false;
            screenButton.disabled = true;
            stopButton.disabled = false;
            resetSessionButton.disabled = false;

            // 当用户停止共享屏幕时
            screenCaptureStream.getVideoTracks()[0].onended = stopScreening;

            // 获取麦克风流
            if (!isRecording) statusElement.textContent = '没开麦啊喂！';
        } catch (err) {
            console.error(isMobile() ? '摄像头访问失败:' : '屏幕共享失败:', err);
            console.error('启动失败 →', err);
            let hint = '';
            switch (err.name) {
                case 'NotAllowedError':
                    hint = '请检查 iOS 设置 → Safari → 摄像头 权限是否为"允许"';
                    break;
                case 'NotFoundError':
                    hint = '未检测到摄像头设备';
                    break;
                case 'NotReadableError':
                case 'AbortError':
                    hint = '摄像头被其它应用占用？关闭扫码/拍照应用后重试';
                    break;
            }
            statusElement.textContent = `${err.name}: ${err.message}${hint ? `\n${hint}` : ''}`;
        }
    }

    async function stopScreenSharing() { // 停止共享，按钮on click
        stopScreening();
        micButton.disabled = true;
        muteButton.disabled = false;
        screenButton.disabled = false;
        stopButton.disabled = true;
        resetSessionButton.disabled = false;
        screenCaptureStream = null;
        statusElement.textContent = '正在语音...';
    }



    // 应用情感到Live2D模型
    function applyEmotion(emotion) {
        if (window.LanLan1 && window.LanLan1.setEmotion) {
            console.log('调用window.LanLan1.setEmotion:', emotion);
            window.LanLan1.setEmotion(emotion);
        } else {
            console.warn('情感功能未初始化');
        }
    }

    // 使用AudioWorklet开始音频处理
    async function startAudioWorklet(stream) {
        isRecording = true;

        // 创建音频上下文
        const audioContext = new AudioContext();
        console.log("音频上下文采样率:", audioContext.sampleRate);

        // 创建媒体流源
        const source = audioContext.createMediaStreamSource(stream);

        try {
            console.log('==========AudioWorklet addModule start==========');

            // 加载AudioWorklet处理器
            // const blob = new Blob([window.AUDIO_PROCESSOR_CODE], { type: 'application/javascript' });
            // const url = URL.createObjectURL(blob);

            // const url = window.AUDIO_PROCESSOR_CODE_URL;

            // const url = 'http://192.168.88.38:48911/static/audio-processor.js';
            const url = 'http://192.168.50.66:48911/static/audio-processor.js';

            console.log('==========AudioWorklet addModule url==========', url);

            console.log('audioContext.audioWorklet:', audioContext.audioWorklet);

            await audioContext.audioWorklet.addModule(url);

            console.log('==========AudioWorklet loaded OK==========');

            // 创建AudioWorkletNode
            workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
                processorOptions: {
                    originalSampleRate: audioContext.sampleRate,
                    targetSampleRate: 16000
                }
            });

            // 监听处理器发送的消息
            workletNode.port.onmessage = (event) => {
                const audioData = event.data;

                // 新增逻辑：focus_mode为true且正在播放语音时，不回传麦克风音频
                if (typeof focus_mode !== 'undefined' && focus_mode === true && isPlaying === true) {
                    // 处于focus_mode且语音播放中，跳过回传
                    return;
                }

                if (isRecording && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        action: 'stream_data',
                        data: Array.from(audioData),
                        input_type: 'audio'
                    }));
                }
            };

            // 连接节点
            source.connect(workletNode);
            // 不需要连接到destination，因为我们不需要听到声音
            // workletNode.connect(audioContext.destination);

        } catch (err) {
            console.error('加载AudioWorklet失败:', err);
            console.dir(err); // <--- 使用 console.dir()
            statusElement.textContent = 'AudioWorklet加载失败';
            console.error('Detailed error:', {
                message: err.message,
                name: err.name,
                stack: err.stack
            });
        }
    }


    // 停止录屏
    function stopScreening() {
        if (videoSenderInterval) clearInterval(videoSenderInterval);
    }

    // 停止录音
    function stopRecording() {

        stopScreening();
        if (!isRecording) return;

        isRecording = false;
        currentGeminiMessage = null;

        // 停止所有轨道
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // 关闭AudioContext
        if (audioContext) {
            audioContext.close();
        }

        // 通知服务器暂停会话
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'pause_session'
            }));
        }
        // statusElement.textContent = '录制已停止';
    }

    // 清空音频队列并停止所有播放
    function clearAudioQueue() {
        // 停止所有计划的音频源
        scheduledSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // 忽略已经停止的源
            }
        });

        // 清空队列和计划源列表
        scheduledSources = [];
        audioBufferQueue = [];
        isPlaying = false;
        audioStartTime = 0;
        nextStartTime = 0; // 新增：重置预调度时间
    }


    function scheduleAudioChunks() {
        const scheduleAheadTime = 5;

        initializeGlobalAnalyser();

        // 关键：预调度所有在lookahead时间内的chunk
        while (nextChunkTime < audioPlayerContext.currentTime + scheduleAheadTime) {
            if (audioBufferQueue.length > 0) {
                const { buffer: nextBuffer } = audioBufferQueue.shift();
                console.log('ctx', audioPlayerContext.sampleRate,
                    'buf', nextBuffer.sampleRate);

                const source = audioPlayerContext.createBufferSource();
                source.buffer = nextBuffer;
                // source.connect(audioPlayerContext.destination);


                // 创建analyser节点用于lipSync
                // const analyser = audioPlayerContext.createAnalyser();
                // analyser.fftSize = 2048;
                // source.connect(analyser);
                // analyser.connect(audioPlayerContext.destination);
                // if (window.LanLan1 && window.LanLan1.live2dModel) {
                //     startLipSync(window.LanLan1.live2dModel, analyser);
                // }


                source.connect(globalAnalyser);

                if (!lipSyncActive && window.LanLan1 && window.LanLan1.live2dModel) {
                    startLipSync(window.LanLan1.live2dModel, globalAnalyser);
                    lipSyncActive = true;
                }

                // 精确时间调度
                source.start(nextChunkTime);
                // console.log(`调度chunk在时间: ${nextChunkTime.toFixed(3)}`);

                // 设置结束回调处理lipSync停止
                source.onended = () => {
                    // if (window.LanLan1 && window.LanLan1.live2dModel) {
                    //     stopLipSync(window.LanLan1.live2dModel);
                    // }
                    const index = scheduledSources.indexOf(source);
                    if (index !== -1) {
                        scheduledSources.splice(index, 1);
                    }

                    if (scheduledSources.length === 0 && audioBufferQueue.length === 0) {
                        if (window.LanLan1 && window.LanLan1.live2dModel) {
                            stopLipSync(window.LanLan1.live2dModel);
                        }
                        lipSyncActive = false;
                        isPlaying = false; // 新增：所有音频播放完毕，重置isPlaying
                    }
                };

                // // 更新下一个chunk的时间
                nextChunkTime += nextBuffer.duration;

                scheduledSources.push(source);
            } else {
                break;
            }
        }

        // 继续调度循环
        setTimeout(scheduleAudioChunks, 25); // 25ms间隔检查
    }


    async function handleAudioBlob(blob) {
        // 你现有的PCM处理代码...
        const pcmBytes = await blob.arrayBuffer();
        if (!pcmBytes || pcmBytes.byteLength === 0) {
            console.warn('收到空的PCM数据，跳过处理');
            return;
        }

        if (!audioPlayerContext) {
            audioPlayerContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioPlayerContext.state === 'suspended') {
            await audioPlayerContext.resume();
        }

        const int16Array = new Int16Array(pcmBytes);
        const audioBuffer = audioPlayerContext.createBuffer(1, int16Array.length, 48000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768.0;
        }

        const bufferObj = { seq: seqCounter++, buffer: audioBuffer };
        audioBufferQueue.push(bufferObj);

        let i = audioBufferQueue.length - 1;
        while (i > 0 && audioBufferQueue[i].seq < audioBufferQueue[i - 1].seq) {
            [audioBufferQueue[i], audioBufferQueue[i - 1]] =
                [audioBufferQueue[i - 1], audioBufferQueue[i]];
            i--;
        }

        // 如果是第一次，初始化调度
        if (!isPlaying) {
            nextChunkTime = audioPlayerContext.currentTime + 0.1;
            isPlaying = true;
            scheduleAudioChunks(); // 开始调度循环
        }
    }

    function startScreenVideoStreaming(stream, input_type) {
        const video = document.createElement('video');
        // console.log('Ready for sharing 1')

        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        // console.log('Ready for sharing 2')

        videoTrack = stream.getVideoTracks()[0];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 定时抓取当前帧并编码为jpeg
        video.play().then(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            videoSenderInterval = setInterval(() => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // base64 jpeg

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        action: 'stream_data',
                        data: dataUrl,
                        input_type: input_type,
                    }));
                }
            }, 1000);
        } // 每100ms一帧
        )
    }

    function initializeGlobalAnalyser() {
        if (!globalAnalyser && audioPlayerContext) {
            globalAnalyser = audioPlayerContext.createAnalyser();
            globalAnalyser.fftSize = 2048;
            globalAnalyser.connect(audioPlayerContext.destination);
        }
    }

    function startLipSync(model, analyser) {
        const dataArray = new Uint8Array(analyser.fftSize);

        function animate() {
            analyser.getByteTimeDomainData(dataArray);
            // 简单求音量（RMS 或最大振幅）
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const val = (dataArray[i] - 128) / 128; // 归一化到 -1~1
                sum += val * val;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            // 这里可以调整映射关系
            const mouthOpen = Math.min(1, rms * 8); // 放大到 0~1
            // 通过统一通道设置嘴巴开合，屏蔽 motion 对嘴巴的控制
            if (window.LanLan1 && typeof window.LanLan1.setMouth === 'function') {
                window.LanLan1.setMouth(mouthOpen);
            }

            animationFrameId = requestAnimationFrame(animate);
        }

        animate();
    }

    function stopLipSync(model) {
        cancelAnimationFrame(animationFrameId);
        if (window.LanLan1 && typeof window.LanLan1.setMouth === 'function') {
            window.LanLan1.setMouth(0);
        } else if (model && model.internalModel && model.internalModel.coreModel) {
            // 兜底
            try { model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0); } catch (_) { }
        }
    }

    // 隐藏live2d函数
    function hideLive2d() {
        const container = document.getElementById('live2d-container');
        container.classList.add('minimized');
    }

    // 显示live2d函数
    function showLive2d() {
        const container = document.getElementById('live2d-container');

        // 判断是否已经最小化（通过检查是否有hidden类或检查样式）
        if (!container.classList.contains('minimized') &&
            container.style.visibility !== 'minimized') {
            // 如果已经显示，则不执行任何操作
            return;
        }

        // 先恢复容器尺寸和可见性，但保持透明度为0和位置在屏幕外
        // container.style.height = '1080px';
        // container.style.width = '720px';
        container.style.visibility = 'visible';

        // 强制浏览器重新计算样式，确保过渡效果正常
        void container.offsetWidth;

        // 移除hidden类，触发过渡动画
        container.classList.remove('minimized');
    }
}

// 尝试立即初始化，如果失败则等待 DOM 加载
if (!init_app()) {
    console.log('app.js: DOM 未就绪，等待 DOMContentLoaded 事件');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('app.js: DOMContentLoaded 触发，重新初始化');
        init_app();
    });
}

