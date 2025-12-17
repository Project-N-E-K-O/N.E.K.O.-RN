// 统一的消息发送函数
function sendToReactNative(type, message) {
    if (window.ReactNativeWebView) {
        try {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: type,
                message: message
            }));
        } catch (error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: type,
                message: '发送消息到 React Native 失败:' + error
            }));
        }
    }
}

sendToReactNative('log', '🎯 ReactNativeWebView 已就绪')

sendToReactNative('log', '🎯 开始设置日志桥接')

// 备份原始 console 方法
var originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// 统一的 console 重写函数
function wrapConsoleMethod(type) {
    sendToReactNative('log', 'console.' + type + '() 开始桥接')
    return function() {
        var args = Array.prototype.slice.call(arguments);
        var message = args.map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
        
        // 发送到 React Native
        sendToReactNative(type, message);

        // 调用原始方法
        originalConsole[type].apply(console, arguments);
    };
}

// 重写所有 console 方法
console.log = wrapConsoleMethod('log');
console.warn = wrapConsoleMethod('warn');
console.error = wrapConsoleMethod('error');
console.info = wrapConsoleMethod('info');
console.debug = wrapConsoleMethod('debug');

console.log('system', '日志桥接设置完成');