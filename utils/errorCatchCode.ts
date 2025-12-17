export const ERROR_CATCH_CODE = `
(function () {
    // 🎯 立即设置错误捕获，在任何其他代码执行之前
    window.addEventListener('error', function (event) {
        var errorInfo = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error ? event.error.toString() : '未知错误',
            stack: event.error ? event.error.stack : '无堆栈信息',
            timestamp: new Date().toISOString()
        };

        console.error('🚨 WebView JavaScript 全局错误:', errorInfo);

        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'javascript_error',
                error: errorInfo,
                source: 'webview_early_capture'
            }));
        }
    }, true); // 使用捕获阶段，确保优先处理

    // 🎯 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', function (event) {
        var rejectionInfo = {
            reason: event.reason ? event.reason.toString() : '未知原因',
            stack: event.reason && event.reason.stack ? event.reason.stack : '无堆栈信息',
            timestamp: new Date().toISOString()
        };

        console.error('🚨 WebView Promise 拒绝:', rejectionInfo);

        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'promise_rejection',
                error: rejectionInfo,
                source: 'webview_early_capture'
            }));
        }
    });

    // 🎯 监听资源加载错误
    window.addEventListener('error', function (event) {
        if (event.target !== window && event.target) {
            var resourceError = {
                type: 'resource_error',
                tagName: event.target.tagName,
                src: event.target.src || event.target.href || '未知资源',
                message: '资源加载失败',
                timestamp: new Date().toISOString()
            };

            console.error('🚨 WebView 资源加载错误:', resourceError);

            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'resource_error',
                    error: resourceError,
                    source: 'webview_early_capture'
                }));
            }
        }
    }, true);

    console.log('🎯 WebView 错误捕获机制已设置');
    console.log('🎯 注入的JavaScript开始执行');
    console.log('🎯 检查ReactNativeWebView接口:', !!window.ReactNativeWebView);
})();
`;
