# N.E.K.O.-RN 开发策略：优先使用 React/Web 组件

**文档日期**：2026-01-11  
**策略版本**：1.0  
**执行者**：Development Team

---

## 📋 策略概述

在 N.E.K.O.-RN 的开发过程中，我们采取**渐进式迁移策略**：

1. **第一阶段（当前）**：优先使用 React/Web 组件，快速完善功能展示
2. **第二阶段（未来）**：根据性能和用户体验需求，逐步实现原生化

**目标平台**：
- ✅ **Android**（真机 + 模拟器）- 主要开发和测试平台
- ⏳ **iOS**（真机 + 模拟器）- 未来支持
- ✅ **Web**（Expo Web）- 开发调试和 Web 组件测试

**核心原则**：
> "先让功能跑起来，再优化体验"

---

## 🎯 策略优势

### 1. **快速迭代**
- 复用 N.E.K.O Web 版本的成熟组件
- 减少重复开发工作
- 保持代码库一致性

### 2. **降低风险**
- Web 组件已经过充分测试
- 避免过早优化
- 减少 Native 开发的复杂度

### 3. **灵活适配**
- 使用 `Platform.OS === 'web'` 条件渲染
- 保留未来 Native 实现的扩展空间
- 支持 Expo 的 Web 目标构建

---

## 🏗️ 技术实现

### 架构分层

```plaintext
┌─────────────────────────────────────────┐
│  N.E.K.O.-RN Application                │
├─────────────────────────────────────────┤
│  ┌─────────────────┐  ┌───────────────┐ │
│  │ Native 功能     │  │ Web 功能      │ │
│  │                 │  │               │ │
│  │ • Live2D 渲染   │  │ • Toolbar UI  │ │
│  │ • 音频播放      │  │ • Modal       │ │
│  │ • 手势控制      │  │ • ChatBox     │ │
│  │ • AsyncStorage  │  │ • Settings    │ │
│  └─────────────────┘  └───────────────┘ │
│           ↓                    ↓         │
│  ┌─────────────────────────────────────┐ │
│  │  @project_neko/components (共享)   │ │
│  │  - 类型定义                         │ │
│  │  - 业务逻辑 Hooks                   │ │
│  │  - 请求客户端                       │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 条件渲染模式

#### 模式 1：平台条件渲染
```typescript
// app/(tabs)/main.tsx
import { Platform } from 'react-native';

{/* Web 组件 - 使用条件渲染 */}
{Platform.OS === 'web' && (
  <View style={styles.toolbarContainer}>
    <Live2DRightToolbar
      visible
      isMobile={isMobile}
      {...toolbarProps}
    />
  </View>
)}

{/* Native 替代方案（可选） */}
{Platform.OS !== 'web' && (
  <View style={styles.toolbarContainer}>
    {/* 简化版 Native UI 或占位符 */}
    <Text>工具栏功能（开发中）</Text>
  </View>
)}
```

#### 模式 2：Expo Web Target
```typescript
// 利用 Expo 的 Web 构建目标
// 在 Web 模式下，React DOM 组件可以直接使用

// packages/project-neko-components/index.native.ts
export const Live2DRightToolbar = Platform.select({
  web: require('./src/Live2DRightToolbar/Live2DRightToolbar').Live2DRightToolbar,
  default: null as any, // Native 暂不支持
});
```

---

## 📦 组件分类与实现策略

### A 类：Native 实现（必需）

| 组件 | 原因 | Android 状态 | iOS 状态 |
|------|------|-------------|----------|
| `Live2DView` | 需要原生渲染性能 | ✅ 已完成 | ⏳ 待实现 |
| `AudioPlayer` | 需要原生音频 API | ✅ 已完成 | ⏳ 待实现 |
| `GestureHandler` | 需要原生手势识别 | ✅ 已完成 | ⏳ 待实现 |

### B 类：Web 实现（优先）

| 组件 | 原因 | Web 状态 | Android 状态 |
|------|------|---------|-------------|
| `Live2DRightToolbar` | 复杂 UI，Web 组件成熟 | ✅ 仅 Expo Web（`npm run web`）可用 | ⏳ 待原生化（Android Native 不可用） |
| `Modal` | react-dom 依赖，Web 兼容 | ✅ 仅 Expo Web（`npm run web`）可用 | ⏳ 待原生化（Android Native 不可用） |
| `ChatContainer` | 复杂文本渲染，Web 优势 | ✅ 仅 Expo Web（`npm run web`）可用 | ⏳ 待原生化（Android Native 不可用） |
| `StatusToast` | react-dom 依赖 | ✅ 仅 Expo Web（`npm run web`）可用 | ⏳ 待原生化（Android Native 不可用） |
| `SettingsPanel` | 表单组件，Web 成熟 | ✅ 仅 Expo Web（`npm run web`）可用 | ⏳ 待原生化（Android Native 不可用） |

**注意**：以上 B 类组件是 **Web-only**（依赖 Expo Web 构建目标）。它们只会在 **Expo/Web（`npm run web`）** 下渲染；在 Android 原生构建中 `Platform.OS === 'android'`，`Platform.OS === 'web'` 恒为 false，因此 **无法在 Android Native 中使用**，当前状态为 **待原生化**（如需 Android 支持需实现对应 `.native.tsx` 版本）。

### C 类：混合实现（未来优化）

| 组件 | Web 版本 | Native 版本（计划） |
|------|----------|---------------------|
| `Button` | ✅ 已有 | 可用 RN Pressable 优化 |
| `QrMessageBox` | ✅ 已有 | 可用原生二维码扫描 |

---

## 🚀 开发工作流

### 1. 使用 Web 组件（当前 - Android 平台）

```typescript
// Step 1: 确认组件在 Web 环境可用
import { Live2DRightToolbar } from '@project_neko/components';
import { Platform } from 'react-native';

// Step 2: 添加平台检查
{Platform.OS === 'web' && (
  <Live2DRightToolbar {...props} />
)}

// Step 3: 类型导入（确保类型安全）
import type {
  Live2DRightToolbarPanel,
  Live2DAgentState,
} from '@project_neko/components';
```

**Android 运行**：
```bash
# 启动 Metro bundler（支持 Web 组件）
npm start

# 运行到 Android 设备
npm run android

# 详细说明见：docs/ANDROID-PLATFORM-GUIDE.md
```

### 2. 添加 Native 占位符（可选）

```typescript
{Platform.OS !== 'web' && (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>
      该功能将在未来的 Native 版本中实现
    </Text>
  </View>
)}
```

### 3. 文档标注

在代码中添加注释标注：

```typescript
{/* 
  【Web 组件】Live2DRightToolbar
  - 当前使用 Web 版本（Platform.OS === 'web'）
  - 未来可考虑实现 Native 版本以优化性能
  - 参考文档：docs/RN-DEVELOPMENT-STRATEGY.md
*/}
{Platform.OS === 'web' && (
  <Live2DRightToolbar {...props} />
)}
```

---

## 📊 实现优先级

### Phase 1：核心功能（已完成）
- ✅ Live2D 渲染（Native）
- ✅ 音频播放（Native）
- ✅ 基础 UI 控制（Native）
- ✅ WebSocket 连接（共享逻辑）

### Phase 2：高级 UI（当前策略 - Web 优先）
- ✅ Live2DRightToolbar（Web）
- ✅ Modal 系统（Web）
- ✅ ChatContainer（Web）
- ✅ StatusToast（Web）
- ✅ SettingsPanel（Web）

### Phase 3：原生化优化（未来计划）
- ⏳ Live2DRightToolbar（Native 版本）
- ⏳ Settings Bottom Sheet（Native）
- ⏳ Agent Panel（Native）
- ⏳ 性能优化与动画改进

---

## 🔧 技术细节

### Expo Web 支持

N.E.K.O.-RN 使用 Expo，天然支持 Web 目标：

```json
// app.json
{
  "expo": {
    "platforms": ["ios", "android", "web"],
    "web": {
      "bundler": "metro"
    }
  }
}
```

**运行 Web 版本**：
```bash
npm run web
# 或
npx expo start --web
```

### 依赖检查

Web 组件依赖检查（在 `index.native.ts` 中）：

```typescript
// packages/project-neko-components/index.native.ts

// Web-only 组件（依赖 react-dom）
export const Live2DRightToolbar = Platform.select({
  web: require('./src/Live2DRightToolbar/Live2DRightToolbar').Live2DRightToolbar,
  default: (() => {
    console.warn('Live2DRightToolbar is only available on Web platform.');
    return null;
  }) as any,
});
```

### 类型安全

即使组件在 Native 不可用，类型定义仍需导出：

```typescript
// 导出类型（所有平台可用）
export type Live2DRightToolbarPanel = "agent" | "settings" | null;
export type Live2DAgentState = {
  statusText: string;
  master: boolean;
  // ...
};

// 组件实现（仅 Web 可用）
export const Live2DRightToolbar = Platform.select({ ... });
```

---

## ⚠️ 注意事项

### 1. **性能考虑**

Web 组件在 RN 中运行时可能存在性能差异：
- ✅ **可接受**：UI 控制组件（Toolbar、Modal、Settings）
- ⚠️ **需评估**：高频更新组件（动画、实时数据）
- ❌ **不推荐**：渲染密集型组件（Canvas、Video）

### 2. **用户体验**

- Web 组件的交互体验可能与纯 Native 应用有差异
- 需要在实际设备上测试手势和滚动行为
- 考虑添加平台特定的样式调整

### 3. **Bundle Size**

Web 组件可能增加包体积：
- 监控 bundle size
- 使用 Expo 的 bundle analyzer
- 必要时考虑代码分割

### 4. **调试**

Web 组件在 Native 环境的调试：
```bash
# 使用 Chrome DevTools
npx expo start --web

# 使用 React Native Debugger
npx expo start --devClient
```

---

## 📈 迁移路径（未来）

当需要将 Web 组件迁移到 Native 时：

### Step 1：评估迁移必要性
- [ ] 性能瓶颈分析
- [ ] 用户体验反馈
- [ ] 功能复杂度评估

### Step 2：创建 Native 实现
```bash
packages/project-neko-components/src/Live2DRightToolbar/
├── Live2DRightToolbar.tsx         # Web 版本（保留）
├── Live2DRightToolbar.native.tsx  # Native 版本（新建）
├── shared/                        # 共享逻辑
│   ├── types.ts
│   ├── hooks.ts
│   └── utils.ts
└── styles.native.ts
```

### Step 3：更新导出
```typescript
// index.native.ts
export { Live2DRightToolbar } from './src/Live2DRightToolbar/Live2DRightToolbar.native';
```

### Step 4：测试与验证
- [ ] 功能一致性测试
- [ ] 性能对比测试
- [ ] 用户体验测试

---

## 📚 相关文档

### 策略文档
- [docs/README.md](./README.md) - 文档中心索引
- [upstream-frontend-packages.md](./upstream-frontend-packages.md) - 上游公共文档入口（索引）
- [guide/upstream-sync.md](./guide/upstream-sync.md) - 上游 packages 同步指南

### 技术文档
- [Expo Web 文档](https://docs.expo.dev/workflow/web/)
- [React Native Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [Metro Bundler 配置](https://facebook.github.io/metro/)

---

## 🎯 总结

**当前策略**：
> 在 N.E.K.O.-RN 中，优先使用 React/Web 组件（通过 `Platform.OS === 'web'` 条件渲染）来快速实现功能完整性。

**核心优势**：
1. ⚡ 快速迭代 - 复用成熟组件
2. 🔒 稳定可靠 - Web 组件已充分测试
3. 🔄 灵活扩展 - 保留 Native 优化空间
4. 📦 统一维护 - 单一代码库，多平台支持

**适用场景**：
- ✅ 管理界面（Settings、Toolbar）
- ✅ 模态对话框（Modal、Alert）
- ✅ 表单组件（Input、Checkbox）
- ✅ 文本展示（Chat、Toast）

**不适用场景**：
- ❌ 高性能渲染（Live2D、Canvas）
- ❌ 原生功能（Camera、Location）
- ❌ 平台特定 API（Notifications、Push）

---

**文档版本**：1.0  
**最后更新**：2026-01-11  
**维护者**：N.E.K.O.-RN Development Team
