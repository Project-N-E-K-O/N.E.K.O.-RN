# Metro Web Platform 配置问题解决方案

## 问题描述

在 Expo Router 的 Web 平台上运行时，Metro bundler 尝试导入 React Native 的内部模块（特别是开发工具相关模块），这些模块在 Web 平台上不存在，导致构建失败。

## 错误信息

```
Metro error: Unable to resolve module ../../src/private/devsupport/rndevtools/ReactDevToolsSettingsManager
from /Users/noahwang/projects/N.E.K.O.-RN/node_modules/react-native/Libraries/Core/setUpReactDevTools.js
```

## 根本原因

1. `@expo/metro-runtime/src/location/install.native.ts` 导入了 `react-native/Libraries/Core/InitializeCore`
2. `InitializeCore` 导入了 `setUpReactDevTools`
3. `setUpReactDevTools` 尝试导入 React Native 内部的开发工具模块
4. 这些模块在 Web 平台上不存在

## 解决方案

### 方案 1：自定义 resolveRequest（当前实现）

在 `metro.config.js` 中添加自定义的模块解析逻辑，将不支持的模块重定向到空的 shim 文件。

### 方案 2：禁用 React Native InitializeCore（如果方案 1 失败）

如果方案 1 不起作用，可以尝试在 Web 平台上完全跳过 React Native 的初始化代码。

## 测试步骤

1. 停止开发服务器
2. 清除缓存：`npx expo start --clear`
3. 选择 'w' 打开 Web
4. 检查是否还有相同的错误

## 备选方案

如果当前方案不起作用，可以考虑：

1. 使用 Webpack 而不是 Metro 进行 Web 构建
2. 使用 `expo-dev-client` 的自定义配置
3. 升级到最新版本的 Expo SDK

---

**日期**: 2026-01-11
**状态**: 待测试
