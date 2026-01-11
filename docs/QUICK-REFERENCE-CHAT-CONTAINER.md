# ChatContainer 组件跨平台重构 - 快速参考

**日期**：2026-01-11  
**状态**：✅ 已完成

---

## 📁 文件清单

### 新增文件

```
packages/project-neko-components/src/chat/
├── hooks.ts                     ✅ 共享业务逻辑
├── ChatContainer.native.tsx     ✅ RN 原生实现
└── styles.native.ts             ✅ RN 样式
```

### 修改文件

```
packages/project-neko-components/src/chat/
├── ChatContainer.tsx            ✅ 重构为使用 hooks
└── index.ts                     ✅ 导出 hooks

packages/project-neko-components/
└── index.native.ts              ✅ 启用 ChatContainer 导出

app/(tabs)/
└── main.tsx                     ✅ 移除 Platform 条件判断

docs/
└── REFACTOR-CHAT-CONTAINER-2026-01-11.md  ✅ 详细文档
```

---

## 🎯 核心改动

### 1. 提取共享逻辑 (`hooks.ts`)

```typescript
// 状态管理
export function useChatState() { ... }

// 发送消息
export function useSendMessage(...) { ... }

// Web 截图
export function useWebScreenshot(...) { ... }

// ID 生成
export function generateId(): string { ... }
```

### 2. Web 版本重构

```typescript
// ChatContainer.tsx - 使用共享 hooks
const {
  collapsed, setCollapsed,
  messages, addMessages,
  pendingScreenshots, setPendingScreenshots,
} = useChatState();

const { handleSendText } = useSendMessage(...);
const { handleScreenshot } = useWebScreenshot(...);
```

### 3. RN 版本实现

```typescript
// ChatContainer.native.tsx - 使用相同的 hooks
const { ... } = useChatState();
const { handleSendText } = useSendMessage(...);

// Modal + TouchableOpacity + ScrollView + TextInput
```

### 4. 使用方式简化

```typescript
// 之前
{Platform.OS === 'web' ? (
  <ChatContainer />
) : (
  <View>简化版聊天</View>
)}

// 之后
<ChatContainer />  // Metro 自动选择平台版本
```

---

## ✅ 功能完整性

| 功能 | Web | RN | 说明 |
|------|-----|-----|------|
| 浮动按钮 | ✅ | ✅ | 缩小态 |
| 聊天面板 | ✅ | ✅ | 展开态 |
| 消息列表 | ✅ | ✅ | 支持三种角色 |
| 文本输入 | ✅ | ✅ | 多行输入 |
| 截图功能 | ✅ | ⚠️ | RN 暂不支持（Alert 提示） |
| 消息角色 | ✅ | ✅ | system/user/assistant |
| 状态管理 | ✅ | ✅ | 共享 hooks |

---

## 🚀 测试步骤

### Web 测试

```bash
cd /Users/noahwang/projects/N.E.K.O.-RN
npm start
# 浏览器访问 Web 版本
```

### Android 测试

```bash
cd /Users/noahwang/projects/N.E.K.O.-RN
npm run android
# 或使用 Android Studio
```

### 验证点

- [ ] 浮动按钮显示正常（左下角💬）
- [ ] 点击按钮展开聊天面板
- [ ] 消息列表可滚动
- [ ] 文本输入正常
- [ ] 发送消息功能正常
- [ ] 最小化按钮工作正常
- [ ] Web 截图功能正常（仅 Web）
- [ ] RN 截图提示正常（仅 RN）

---

## 📊 代码统计

| 指标 | 数值 |
|------|------|
| 新增文件 | 3 |
| 修改文件 | 4 |
| 新增代码行 | ~500 |
| 共享逻辑行 | ~150 |
| 代码复用率 | ~30% |

---

## 🎓 学习要点

### 1. 跨平台策略

- ✅ 使用文件扩展名自动选择（`.native.tsx`）
- ✅ 提取共享业务逻辑到 `hooks.ts`
- ✅ 保持类型定义完全一致
- ✅ 对使用者完全透明

### 2. 架构模式

```
┌─────────────────────────────────────┐
│   统一接口 (Types + Hooks)          │
├─────────────────────────────────────┤
│  Web 实现     │   RN 实现           │
│  HTML/CSS     │   Modal/ScrollView   │
│  完整功能     │   简化/适配         │
└─────────────────────────────────────┘
```

### 3. Metro Bundler 行为

- Web 打包：`ChatContainer.tsx`
- RN 打包：`ChatContainer.native.tsx`
- 自动选择，Tree-shaking 友好

---

## 🔗 相关文档

- [详细重构文档](./REFACTOR-CHAT-CONTAINER-2026-01-11.md)
- [跨平台组件策略](./CROSS-PLATFORM-COMPONENT-STRATEGY.md)
- [RN 开发策略](./RN-DEVELOPMENT-STRATEGY.md)
- [Live2DRightToolbar 案例](./REFACTOR-LIVE2D-TOOLBAR-2026-01-11.md)

---

## 📝 备注

- TypeScript 可能需要时间刷新类型缓存
- 如遇导入错误，尝试重启开发服务器
- RN 截图功能可后续通过原生模块实现

---

**版本**：1.0  
**维护者**：N.E.K.O.-RN Team
