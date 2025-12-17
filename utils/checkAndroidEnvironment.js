// Android 环境检查脚本
// 在 React Native WebView 中运行此脚本来检查环境兼容性

const checkAndroidEnvironment = () => {
    const results = {
        userAgent: navigator.userAgent,
        webViewVersion: null,
        androidVersion: null,
        apiLevel: null,
        audioWorkletSupport: false,
        secureContext: false,
        recommendations: []
    };

    // 解析 User Agent
    const ua = navigator.userAgent;
    console.log('User Agent:', ua);

    // 检查 Android 版本
    const androidMatch = ua.match(/Android (\d+(?:\.\d+)?)/);
    if (androidMatch) {
        results.androidVersion = androidMatch[1];
        const version = parseFloat(androidMatch[1]);
        
        // 估算 API Level
        if (version >= 14) results.apiLevel = 34;
        else if (version >= 13) results.apiLevel = 33;
        else if (version >= 12) results.apiLevel = 31;
        else if (version >= 11) results.apiLevel = 30;
        else if (version >= 10) results.apiLevel = 29;
        else if (version >= 9) results.apiLevel = 28;
        else if (version >= 8.1) results.apiLevel = 27;
        else if (version >= 8.0) results.apiLevel = 26;
        else if (version >= 7.1) results.apiLevel = 25;
        else if (version >= 7.0) results.apiLevel = 24;
    }

    // 检查 WebView 版本
    const webViewMatch = ua.match(/Chrome\/(\d+)/);
    if (webViewMatch) {
        results.webViewVersion = parseInt(webViewMatch[1]);
    }

    // 检查 AudioWorklet 支持
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            const testContext = new AudioContextClass();
            results.audioWorkletSupport = !!testContext.audioWorklet;
            testContext.close();
        }
    } catch (e) {
        console.error('AudioContext test failed:', e);
    }

    // 检查安全上下文
    results.secureContext = window.isSecureContext;

    // 生成建议
    if (!results.audioWorkletSupport) {
        if (results.apiLevel < 29) {
            results.recommendations.push('升级到 Android 10+ (API Level 29+) 以获得 AudioWorklet 支持');
        }
        if (results.webViewVersion && results.webViewVersion < 66) {
            results.recommendations.push('WebView 版本过低，需要 Chrome 66+ 版本');
        }
        if (!results.secureContext) {
            results.recommendations.push('使用 HTTPS 连接以获得完整功能支持');
        }
    }

    // 添加通用建议
    if (results.apiLevel < 33) {
        results.recommendations.push('建议使用 Android 13+ (API Level 33+) 以获得最佳兼容性');
    }

    return results;
};

// 在 WebView 中运行检查
if (typeof window !== 'undefined') {
    const envCheck = checkAndroidEnvironment();
    console.log('=== Android 环境检查结果 ===');
    console.log(envCheck);
    
    // 发送结果到 React Native
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'environment_check',
            data: envCheck
        }));
    }
}

export default checkAndroidEnvironment;
