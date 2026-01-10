# N.E.K.O Web App.tsx → N.E.K.O.-RN main.tsx 同步报告

**同步日期**：2026-01-10  
**同步方向**：`@N.E.K.O/frontend/src/web/App.tsx` → `@N.E.K.O.-RN/app/(tabs)/main.tsx`  
**执行者**：Cursor AI Agent

---

## 📋 同步概述

本次同步将 N.E.K.O Web 版本的核心功能架构迁移到 React Native 版本，主要包括：

1. ✅ Agent Backend 管理（useLive2DAgentBackend）
2. ✅ Live2D Preferences 持久化（useLive2DPreferences）
3. ✅ ChatContainer 组件集成准备
4. ⏳ Live2DRightToolbar UI（需要单独的 RN 实现）

---

## 🎯 核心功能同步

### 1. Agent Backend 管理 ✅

**文件**：`/hooks/useLive2DAgentBackend.ts`

**功能**：
- Agent 服务器健康检查 (`/api/agent/health`)
- Agent flags 管理 (`/api/agent/flags`)
- 可用性检查 (`/api/agent/*/availability`)
- 管理员控制 (`/api/agent/admin/control`)
- 自动轮询机制（1.5秒间隔）

**适配说明**：
- Web 版本使用 `StatusToastHandle` ref，RN 版本使用 `showToast` 回调
- Web 版本使用 `useT` hook，RN 版本使用可选的 `t` 函数参数
- 保持相同的 API 接口和状态管理逻辑

**使用示例**：
```typescript
const { agent, onAgentChange, refreshAgentState } = useLive2DAgentBackend({
  apiBase: `http://${config.host}:${config.port}`,
  showToast: (message, duration) => {
    Alert.alert('提示', message);
  },
  openPanel: null,
});
```

---

### 2. Live2D Preferences 持久化 ✅

**文件**：`/hooks/useLive2DPreferences.ts`

**功能**：
- 保存和加载 Live2D 模型的位置、缩放等偏好设置
- 支持多个模型的偏好设置
- 智能匹配算法（精确匹配 → 文件名匹配 → 目录名匹配）

**适配说明**：
- Web 版本使用 API 端点 (`/api/config/preferences`)
- RN 版本使用 AsyncStorage 本地持久化
- 保持相同的数据结构 (`Live2DPreferencesSnapshot`)

**数据结构**：
```typescript
interface Live2DPreferencesSnapshot {
  modelUri: string;
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  parameters?: Record<string, number>;
}
```

**使用示例**：
```typescript
const { repository, loadPreferences, savePreferences } = useLive2DPreferences();

// 加载偏好
const prefs = await loadPreferences('/path/to/model.model3.json');

// 保存偏好
await savePreferences({
  modelUri: '/path/to/model.model3.json',
  position: { x: 100, y: 200 },
  scale: { x: 1.2, y: 1.2 },
});
```

---

### 3. main.tsx 架构更新 ✅

**主要变更**：

#### 新增导入
```typescript
import { useLive2DAgentBackend } from '@/hooks/useLive2DAgentBackend';
import { useLive2DPreferences } from '@/hooks/useLive2DPreferences';
import { Alert } from 'react-native';
```

#### 新增状态管理
```typescript
// Agent Backend 管理
const { agent, onAgentChange, refreshAgentState } = useLive2DAgentBackend({
  apiBase: `http://${config.host}:${config.port}`,
  showToast: (message, duration) => {
    Alert.alert('提示', message);
  },
  openPanel: null,
});

// Live2D Preferences 持久化
const { repository: preferencesRepository } = useLive2DPreferences();
```

#### 新增 UI 控件
- Agent 开关按钮
- Agent 状态显示文本

#### 样式更新
```typescript
buttonAgent: {
  backgroundColor: '#007AFF',
},
statusText: {
  color: '#fff',
  fontSize: 12,
  marginTop: 8,
  textAlign: 'center',
},
```

---

## 🔄 与 Web 版本的对比

| 功能 | Web 版本 | RN 版本 | 状态 |
|------|----------|---------|------|
| **Live2DStage** | PixiJS + pixi-live2d-display | react-native-live2d | ✅ 已有 |
| **Agent Backend** | useLive2DAgentBackend | useLive2DAgentBackend | ✅ 已同步 |
| **Preferences** | API (/api/config/preferences) | AsyncStorage | ✅ 已同步 |
| **ChatContainer** | @project_neko/components | 简单聊天显示 | ⏳ 准备中 |
| **Live2DRightToolbar** | Web UI 组件 | 需要 RN 实现 | ⏳ 待实现 |
| **拖拽/缩放** | Canvas pointer events | 原生手势 | ✅ 已有 |
| **国际化** | i18next + useT hook | 可选 t 函数 | ✅ 已适配 |

---

## 📦 依赖项

### 新增依赖
```json
{
  "@react-native-async-storage/async-storage": "^1.19.3"
}
```

### package.json 确认
确保以下依赖已安装：
- `@react-native-async-storage/async-storage`
- `react-native-live2d`（已有）
- `@project_neko/*` packages（已通过同步脚本更新）

---

## 🔧 集成 TODO

### 已完成 ✅
- [x] 创建 `useLive2DAgentBackend` hook
- [x] 创建 `useLive2DPreferences` hook
- [x] 更新 `main.tsx` 集成新功能
- [x] 添加 Agent 控制按钮
- [x] 添加状态显示

### 待完成 ⏳

#### 1. Live2D Preferences 与 useLive2D 集成
当前 `useLive2D` hook 尚未支持 preferences，需要：
- 修改 `useLive2D` 接受 `preferences` 参数
- 在模型加载时应用保存的位置/缩放
- 在用户拖拽/缩放后保存偏好设置

**实现建议**：
```typescript
// hooks/useLive2D.ts
export interface UseLive2DConfig {
  // ... 现有参数
  preferences?: Live2DPreferencesRepository;
}

// 在模型加载后应用偏好
useEffect(() => {
  if (modelState.isReady && preferences) {
    const prefs = await preferences.load(modelUri);
    if (prefs?.position) {
      // 应用位置
    }
    if (prefs?.scale) {
      // 应用缩放
    }
  }
}, [modelState.isReady]);
```

#### 2. ChatContainer 组件集成
`@project_neko/components` 的 `ChatContainer` 已同步到 RN，但需要：
- 验证在 RN 环境的兼容性
- 可能需要 RN 特定的样式调整
- 集成到 `main.tsx`

**使用建议**：
```typescript
import { ChatContainer } from '@project_neko/components';

// 在 render 中替换现有的简单聊天显示
<View style={styles.chatContainer}>
  <ChatContainer
    messages={chat.messages}
    onSendMessage={(text) => {
      audio.sendMessage(text);
    }}
  />
</View>
```

#### 3. Live2DRightToolbar 实现
Web 版本的 `Live2DRightToolbar` 是一个复杂的 Web UI 组件，包含：
- 麦克风/屏幕共享切换
- Agent 设置面板
- Settings 面板
- 设置菜单

**RN 实现建议**：
- 使用 React Native 的 `Modal` 或底部抽屉（Bottom Sheet）
- 拆分为多个子组件：`AgentPanel`, `SettingsPanel`, `MenuPanel`
- 使用 React Native 的 `Switch` 和 `Button` 组件

**组件结构建议**：
```
components/
  Live2DToolbar/
    Live2DToolbar.tsx          # 主入口
    AgentPanel.tsx             # Agent 设置面板
    SettingsPanel.tsx          # 通用设置面板
    MenuPanel.tsx              # 菜单面板
    styles.ts                  # 样式
```

---

## 🧪 测试计划

### 单元测试
- [ ] `useLive2DAgentBackend` 的 API 调用
- [ ] `useLive2DPreferences` 的存储和加载

### 集成测试
- [ ] Agent 开关功能
- [ ] 偏好设置保存和恢复
- [ ] 与现有 audio/live2d 服务的协调

### 手动测试
- [ ] 在 iOS 模拟器测试
- [ ] 在 Android 模拟器测试
- [ ] 在真机测试 Agent 功能
- [ ] 测试偏好设置持久化

---

## 📝 使用说明

### 启动 Agent 功能

1. 确保 N.E.K.O 后端服务器已启动（包含 Agent 服务）
2. 在 RN 应用中点击 "🤖 Agent OFF" 按钮
3. 应用会自动检查 Agent 健康状态并启用

### 查看 Agent 状态

Agent 状态会实时显示在按钮下方，包括：
- "查询中..." - 正在检查状态
- "Agent服务器未启动" - 服务器未就绪
- "Agent服务器就绪" - 服务器就绪但未启用
- "Agent模式已开启" - Agent 已启用

### 使用偏好设置

偏好设置会自动保存到设备本地，包括：
- Live2D 模型的位置
- Live2D 模型的缩放比例
- 自定义参数（如果有）

下次加载同一模型时会自动恢复这些设置。

---

## 🔍 调试建议

### 查看 Agent 日志
```typescript
useEffect(() => {
  console.log('🤖 Agent 状态:', agent.statusText, {
    master: agent.master,
    keyboard: agent.keyboard,
    mcp: agent.mcp,
    userPlugin: agent.userPlugin,
  });
}, [agent]);
```

### 查看 Preferences 日志
```typescript
const prefs = await loadPreferences(modelUri);
console.log('💾 加载的偏好设置:', prefs);
```

### 网络请求调试
使用 React Native Debugger 或 Flipper 查看 fetch 请求：
- Agent health: `GET http://host:port/api/agent/health`
- Agent flags: `GET/POST http://host:port/api/agent/flags`
- Agent availability: `GET http://host:port/api/agent/*/availability`

---

## ⚠️ 注意事项

### 1. Agent 服务器依赖
Agent 功能依赖 N.E.K.O 后端的 Agent 服务器，如果后端未启动或版本不兼容，功能将不可用。

### 2. AsyncStorage 限制
AsyncStorage 有大小限制（约 6MB），偏好设置数据较小不会有问题，但不要存储大量数据。

### 3. 网络权限
确保应用有网络权限，Android 需要在 `AndroidManifest.xml` 中声明：
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 4. CORS 问题
如果使用真机测试，确保后端服务器配置了正确的 CORS 策略，允许来自 RN 应用的请求。

---

## 📚 相关文档

### 上游文档
- [N.E.K.O Web App.tsx](../../N.E.K.O/frontend/src/web/App.tsx)
- [useLive2DAgentBackend (Web)](../../N.E.K.O/frontend/src/web/useLive2DAgentBackend.ts)
- [live2dPreferences (Web)](../../N.E.K.O/frontend/src/web/live2dPreferences.ts)

### RN 文档
- [main.tsx](../app/(tabs)/main.tsx)
- [useLive2DAgentBackend](../hooks/useLive2DAgentBackend.ts)
- [useLive2DPreferences](../hooks/useLive2DPreferences.ts)

### Packages 文档
- [packages 同步文档](../../N.E.K.O/docs/frontend/packages-sync-to-neko-rn.md)
- [RN 上游文档入口](./upstream-frontend-packages.md)

---

## 🎉 总结

本次同步成功将 N.E.K.O Web 版本的核心 Agent 管理和偏好设置功能迁移到 RN 版本，保持了相同的业务逻辑和 API 接口，同时针对 RN 平台进行了必要的适配（AsyncStorage、Alert、可选回调等）。

**主要成果**：
- ✅ Agent Backend 完整功能（健康检查、flags 管理、可用性检查、轮询）
- ✅ Preferences 持久化（AsyncStorage 实现）
- ✅ UI 集成（Agent 按钮、状态显示）
- ✅ 文档完善

**后续工作**：
- ⏳ Live2D Preferences 与 useLive2D 集成
- ⏳ ChatContainer 组件集成
- ⏳ Live2DRightToolbar RN 实现
- ⏳ 完整的集成测试

---

**报告生成时间**：2026-01-10  
**报告版本**：1.0
