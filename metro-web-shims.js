// 这个文件为 Web 平台提供空的 shim，用于替换不支持的 React Native 模块
// 这是一个通用的 shim，会根据导入的模块返回不同的值

// 默认导出为空函数
const noop = () => {};

// TurboModuleRegistry 实现
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

// 创建一个简单的导出对象（避免使用 defineProperty 创建只读属性）
const shim = {
  Alert: {
    alert: (title, message) => {
      console.warn('Alert.alert called on web:', title, message);
    }
  },
  Platform: {
    OS: 'web',
    select: (obj) => obj.web || obj.default
  },
  TurboModuleRegistry: TurboModuleRegistry,
  NativeModules: {},
  ensureNativeModulesAreInstalled: noop,
  get: TurboModuleRegistry.get,
  getEnforcing: TurboModuleRegistry.getEnforcing,
  default: null, // 使用简单的 null 值，而不是函数
};

// 直接导出（不使用 Object.keys forEach 循环）
module.exports = shim;
