export const WRAP_CONSOLE_METHOD_CODE = `
(function () {
    if (window.__RN_LOG_BRIDGE__) return;
    window.__RN_LOG_BRIDGE__ = true;

    function safeStringify(obj) {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return "[Circular]";
                seen.add(value);
            }
            return value;
        });
    }

    function initLogBridge() {
        try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage("initLogBridge"); } catch(e) {}
        if (!(window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function')) {
            setTimeout(initLogBridge, 500);
            return;
        }

        function sendToReactNative(type, args) {
            try {
                const message = args.map(arg =>
                    typeof arg === 'object' ? safeStringify(arg) : String(arg)
                ).join(' ');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, message }));
            } catch (e) {}
        }

        const methods = ['log', 'warn', 'error', 'info', 'debug'];
        methods.forEach(fn => {
            const original = console[fn] || function () {};
            console[fn] = function (...args) {
                sendToReactNative(fn, args);
                try { original(...args); } catch (e) {}
            };
        });

        try { console.log('system', '✅ ReactNative WebView 日志桥接就绪'); } catch(e) {}
    }

    initLogBridge();
})();
`;


