// 这个文件是 react-native-web 的扩展包装器
// 它导出 react-native-web 的所有内容，同时添加缺失的 API

// 导入 react-native-web 的所有内容
const RNWeb = require('react-native-web');

// TurboModuleRegistry 实现（Web 上返回 null）
const TurboModuleRegistry = {
  get: (name) => {
    console.log(`[Web] TurboModuleRegistry.get("${name}") - returning null`);
    return null;
  },
  getEnforcing: (name) => {
    console.log(`[Web] TurboModuleRegistry.getEnforcing("${name}") - returning null`);
    return null;
  },
};

// NativeModules 空实现
const NativeModules = RNWeb.NativeModules || {};

// 创建导出对象
const exports = {};

// 复制所有 RNWeb 的属性
for (const key in RNWeb) {
  if (RNWeb.hasOwnProperty(key)) {
    exports[key] = RNWeb[key];
  }
}

// 添加我们的扩展
exports.TurboModuleRegistry = TurboModuleRegistry;
exports.NativeModules = NativeModules;

// 如果 RNWeb 有默认导出，保留它
if (RNWeb.default) {
  exports.default = RNWeb.default;
}

// 导出
module.exports = exports;
