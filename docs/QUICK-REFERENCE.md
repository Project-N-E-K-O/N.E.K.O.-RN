# N.E.K.O.-RN 开发快速参考

> 📌 **快速查阅卡片** - 开发时的速查手册

---

## 🎯 核心策略（必读）

### 渐进式迁移原则
```plaintext
优先使用 Web 组件 → 条件渲染 → 必要时原生化
```

**关键文档**：
- [RN-DEVELOPMENT-STRATEGY.md](./RN-DEVELOPMENT-STRATEGY.md) - 开发策略概述
- [CROSS-PLATFORM-COMPONENT-STRATEGY.md](./CROSS-PLATFORM-COMPONENT-STRATEGY.md) - 跨平台组件实现（⭐ 进阶）

---

## 📦 组件使用速查

### ✅ 可直接使用（Web 模式）

```typescript
import { Platform } from 'react-native';
import { 
  Live2DRightToolbar,
  ChatContainer,
  Modal,
  StatusToast,
} from '@project_neko/components';

// 条件渲染
{Platform.OS === 'web' && (
  <Live2DRightToolbar {...props} />
)}
```

### ⚠️ 需要 Native 实现

```typescript
// 这些能力必须有 Native/平台实现
import { ReactNativeLive2dView } from 'react-native-live2d';
import { AudioService } from '@/services/AudioService';
```

### 📋 组件分类表

| 组件 | 平台 | 状态 | 说明 |
|------|------|------|------|
| `Live2DView` | Native | ✅ | Live2D 渲染（必需原生） |
| `AudioPlayer` | Native | ✅ | 音频播放（必需原生） |
| `Live2DRightToolbar` | Web | ✅ | 工具栏 UI（Web 优先） |
| `ChatContainer` | Web | ✅ | 聊天界面（Web 优先） |
| `Modal` | Web | ✅ | 模态框（Web 优先） |
| `StatusToast` | Web | ✅ | 提示气泡（Web 优先） |

---

## 🧩 RN 主界面依赖现状（`app/(tabs)/main.tsx`）

### ✅ 当前已使用

- **UI（跨平台组件）**：`@project_neko/components`（`Live2DRightToolbar`、`ChatContainer`）
- **Live2D 原生渲染**：`react-native-live2d`（`ReactNativeLive2dView`）
- **HTTP 请求（跨平台通用）**：`@project_neko/request`（用于 Agent API：health/flags/availability/admin control）
- **WebSocket（跨平台通用）**：`@project_neko/realtime`（用于 `/ws/{characterName}`：音频流 + 文本消息）
- **业务能力（RN 内部实现）**：
  - `hooks/useLive2D.ts` + `services/Live2DService.ts`：模型下载/缓存/props 聚合（`modelPath/scale/position/...`）；并在内部复用跨平台内核 `@project_neko/live2d-service`
  - `hooks/useAudio.ts` + `services/AudioService.ts`：音频录制/播放与 WebSocket 交互（底层由 `services/wsService.ts` 统一封装）
  - `hooks/useLive2DAgentBackend.ts`：通过 `@project_neko/request` 的 client 调 Agent API（统一替代直接 `fetch`）

### ❌ 当前未使用（主界面链路内）

以下 packages **在 `main.tsx` 的调用链里未使用**（即未作为主界面的依赖来源）：

- ~~`packages/project-neko-audio-service`~~ ✅ **已接入**（通过 `@project_neko/audio-service`，由 `hooks/useAudio.ts` 间接使用）

> 更新：`packages/project-neko-live2d-service` ✅ **已接入**（通过 `@project_neko/live2d-service`，由 `services/Live2DService.ts` 间接使用）。

> 备注：仓库内仍有 `@project_neko/request` 的使用示例（如 `app/webapp.tsx`、`app/request-lab.tsx`）；主界面链路通过 hooks/services 间接接入（见上）。

## 🔧 开发工作流

### 1. 使用现有 Web 组件

```typescript
// ✅ 推荐写法
import { SomeComponent } from '@project_neko/components';
import { Platform } from 'react-native';

export function MyScreen() {
  return (
    <View>
      {Platform.OS === 'web' && (
        <SomeComponent {...props} />
      )}
    </View>
  );
}
```

### 2. 类型导入（重要！）

```typescript
// ✅ 正确：分离类型导入
import { SomeComponent } from '@project_neko/components';
import type { 
  SomeComponentProps,
  SomeComponentHandle,
} from '@project_neko/components';

// ❌ 错误：混合导入可能导致运行时错误
import { SomeComponent, SomeComponentProps } from '@project_neko/components';
```

### 3. 添加文档注释

```typescript
{/* 
  【Web 组件】ComponentName
  - 使用 Web 版本（Platform.OS === 'web'）
  - 未来可考虑 Native 实现
  - 参考：docs/RN-DEVELOPMENT-STRATEGY.md
*/}
{Platform.OS === 'web' && (
  <ComponentName {...props} />
)}
```

---

## 📝 代码规范

### 条件渲染

```typescript
// ✅ 推荐：清晰的平台检查
{Platform.OS === 'web' && (
  <WebComponent />
)}

// ✅ 推荐：提供 Native 占位符
{Platform.OS === 'web' ? (
  <WebComponent />
) : (
  <NativePlaceholder />
)}

// ❌ 避免：不清晰的嵌套
{Platform.select({
  web: <WebComponent />,
  default: null,
})}
```

### 样式处理

```typescript
// ✅ 推荐：使用 StyleSheet
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

// ✅ 平台特定样式
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
});
```

---

## 🚀 运行命令

### 开发模式

```bash
# Android 模拟器/真机（推荐）
npm run android
# 或
npx expo run:android

# iOS 模拟器（需 Mac）
npm run ios
npx expo run:ios

# Web 模式（支持所有 Web 组件）
npm run web
# 或
npx expo start --web
```

**详细说明**：参考 [Android 平台运行指南](./ANDROID-PLATFORM-GUIDE.md)（⭐ Android 开发者必读）

### 构建与测试

```bash
# 类型检查
npm run typecheck

# 构建（如果有）
npm run build

# 测试
npm test
```

---

## ⚠️ 常见问题

### Q1: Web 组件在 Native 不显示？
**A**: 检查是否添加了 `Platform.OS === 'web'` 条件判断。

### Q2: Android 进入 Live2D 页面模型不显示（黑屏/空白）？
**A**: 先确认业务层是否触发了模型资源加载：

- **必须触发**：`useLive2D.loadModel()`（建议放在页面 focus 时触发）
- **快速判断**：看日志里 `<ReactNativeLive2dView />` 的 `modelPath` 是否一直是 `undefined`
- **后端检查**：确认 Live2D 静态资源服务可访问（默认 `backendPort: 8081`）并能下载 `*.model3.json` 及依赖

### Q2: 类型报错？
**A**: 确保使用 `import type` 分离类型导入（避免运行时错误）。

### Q3: 如何在 Android 真机上运行？
**A**: 
1. 启用 USB 调试
2. 连接设备：`adb devices`
3. 运行：`npm run android`
4. 详见：[Android 平台运行指南](./ANDROID-PLATFORM-GUIDE.md)

### Q4: 如何查看 Web 组件的实现？
**A**: 参考 `packages/project-neko-components/src/` 目录。

### Q5: 需要原生化某个组件怎么办？
**A**: 
1. 评估必要性（参考 [RN-DEVELOPMENT-STRATEGY.md](./RN-DEVELOPMENT-STRATEGY.md)）
2. 创建 `.native.tsx` 版本
3. 更新 `index.native.ts` 导出

---

## 📚 文档导航

### 必读文档（⭐）
1. **[RN-DEVELOPMENT-STRATEGY.md](./RN-DEVELOPMENT-STRATEGY.md)** - 开发策略
2. **[ANDROID-PLATFORM-GUIDE.md](./ANDROID-PLATFORM-GUIDE.md)** - Android 平台运行指南（Android 开发必读）
3. **[CROSS-PLATFORM-COMPONENT-STRATEGY.md](./CROSS-PLATFORM-COMPONENT-STRATEGY.md)** - 跨平台组件（进阶）
4. **[guide/troubleshooting.md](./guide/troubleshooting.md)** - 常见问题排查

### 参考文档
- [README.md](./README.md) - 文档中心
- [guide/upstream-sync.md](./guide/upstream-sync.md) - 上游 packages 同步指南
- [upstream-frontend-packages.md](./upstream-frontend-packages.md) - 上游公共文档入口（索引）

### 模块规格
- [modules/audio.md](./modules/audio.md) - 音频服务
- [modules/live2d.md](./modules/live2d.md) - Live2D 服务
- [modules/coordination.md](./modules/coordination.md) - 主协调层

---

## 🎨 代码片段（可直接复制）

### 添加新的 Web 组件

```typescript
import { Platform, View } from 'react-native';
import { NewWebComponent } from '@project_neko/components';
import type { NewWebComponentProps } from '@project_neko/components';

export function MyScreen() {
  const webComponentProps: NewWebComponentProps = {
    // ... props
  };

  return (
    <View style={styles.container}>
      {/* 
        【Web 组件】NewWebComponent
        - 使用 Web 版本（Platform.OS === 'web'）
        - 参考：docs/RN-DEVELOPMENT-STRATEGY.md
      */}
      {Platform.OS === 'web' && (
        <NewWebComponent {...webComponentProps} />
      )}
    </View>
  );
}
```

### 添加平台特定样式

```typescript
import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
```

---

## 🔗 外部资源

- [Expo 官方文档](https://docs.expo.dev/)
- [React Native 文档](https://reactnative.dev/docs/getting-started)
- [Metro Bundler](https://facebook.github.io/metro/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

---

**最后更新**：2026-01-11  
**维护者**：N.E.K.O.-RN Development Team

---

## 💡 提示

- 🔍 使用 Cmd/Ctrl + F 快速搜索
- 📌 将本文档加入书签
- 🔄 定期查看更新
- 💬 遇到问题时先查阅此文档
