# 常见问题排查（Troubleshooting）

本页只记录 **仍然可能在当前项目出现** 的问题与解决方案；历史性“当时怎么修”的过程文档不在这里保留。

---

## Metro Web 平台构建失败（Expo Router / Metro）

### 现象

Web 平台启动时报 Metro 无法解析 React Native 的内部 devsupport 模块，类似：

```
Unable to resolve module ../../src/private/devsupport/rndevtools/ReactDevToolsSettingsManager
from .../node_modules/react-native/Libraries/Core/setUpReactDevTools.js
```

### 原因

Metro 在 Web 平台上走到了 React Native 初始化链路中的 devtools 相关模块，而这些模块在 Web 环境不可用。

### 处理方式（当前方案）

- 在 `metro.config.js` 里通过自定义解析逻辑，把不支持的 RN 内部模块 **重定向到空 shim**（或等价的 noop 实现）。
- 清缓存重启：

```bash
npx expo start --clear
```

### 如果仍然失败

- 升级 Expo SDK / Metro 相关依赖后重试（有时上游已修复）。
- 评估 Web bundler 方案（Metro ↔ Webpack）作为兜底，但需要统一团队策略再推进。

