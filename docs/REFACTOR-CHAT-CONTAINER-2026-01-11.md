# ChatContainer 组件跨平台重构总结

**日期**：2026-01-11  
**任务**：提取 ChatContainer 公共部分并实现 RN 兼容

---

## 📋 任务完成情况

### ✅ 已完成

1. **创建共享业务逻辑** (`hooks.ts`)
   - `useChatState()` - 聊天状态管理
   - `useSendMessage()` - 发送消息逻辑
   - `useWebScreenshot()` - Web 专用截图功能
   - `generateId()` - 跨平台 ID 生成器

2. **重构 Web 版本** (`ChatContainer.tsx`)
   - 使用共享 hooks
   - 保持原有功能
   - 添加平台注释

3. **创建 RN 版本** (`ChatContainer.native.tsx`)
   - Modal 面板实现
   - TouchableOpacity 浮动按钮
   - ScrollView 消息列表
   - TextInput 输入框
   - 完整功能支持（除 Web 截图）

4. **创建 RN 样式** (`styles.native.ts`)
   - 平台特定阴影效果
   - 响应式布局
   - 统一设计语言

5. **更新导出配置**
   - `src/chat/index.ts` - 导出 hooks
   - `index.native.ts` - 启用 ChatContainer 导出

6. **更新使用方式** (`main.tsx`)
   - 移除 `Platform.OS === 'web'` 条件判断
   - Metro Bundler 自动选择平台版本
   - 清理不再使用的样式

---

## 🎯 架构设计

### 文件结构

```
packages/project-neko-components/src/chat/
├── types.ts                     # 共享类型定义 ✅
├── hooks.ts                     # 共享业务逻辑 ✅
├── ChatContainer.tsx            # Web 完整实现 ✅
├── ChatContainer.native.tsx     # RN 原生实现 ✅
├── ChatInput.tsx                # Web 输入组件
├── MessageList.tsx              # Web 消息列表
├── styles.native.ts             # RN 样式 ✅
└── index.ts                     # 统一导出 ✅
```

### 共享逻辑 (`hooks.ts`)

```typescript
// 状态管理
export function useChatState() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingScreenshots, setPendingScreenshots] = useState<PendingScreenshot[]>([]);
  
  return {
    collapsed, setCollapsed,
    messages, addMessage, addMessages, clearMessages,
    pendingScreenshots, setPendingScreenshots,
  };
}

// 发送消息（Web 和 RN 共享）
export function useSendMessage(
  addMessages: (messages: ChatMessage[]) => void,
  pendingScreenshots: PendingScreenshot[],
  clearPendingScreenshots: () => void
) {
  const handleSendText = useCallback((text: string) => {
    // 处理截图和文本消息
  }, [addMessages, pendingScreenshots, clearPendingScreenshots]);

  return { handleSendText };
}

// Web 专用截图
export function useWebScreenshot(
  setPendingScreenshots: React.Dispatch<React.SetStateAction<PendingScreenshot[]>>,
  onUnsupported?: () => void,
  onError?: () => void
) {
  const handleScreenshot = useCallback(async () => {
    // navigator.mediaDevices.getDisplayMedia
  }, [setPendingScreenshots, onUnsupported, onError]);

  return { handleScreenshot };
}
```

### Web 版本特点

- ✅ 使用 HTML/CSS
- ✅ 浮动按钮 (`<button>`)
- ✅ 完整聊天框 (`<div>`)
- ✅ Web 截图功能 (`navigator.mediaDevices`)
- ✅ 毛玻璃效果 (`backdrop-filter`)

### RN 版本特点

- ✅ 使用 React Native 组件
- ✅ TouchableOpacity 浮动按钮
- ✅ Modal 聊天面板
- ✅ ScrollView 消息列表
- ✅ TextInput 多行输入
- ✅ Platform 特定阴影效果
- ⚠️ 暂不支持截图（Alert 提示）

---

## 🔄 迁移对比

### 之前（条件渲染）

```typescript
// main.tsx
{Platform.OS === 'web' ? (
  <ChatContainer />
) : (
  <View style={styles.chatContainer}>
    {/* 简化版聊天显示 */}
  </View>
)}
```

**问题**：
- ❌ RN 端功能缺失
- ❌ 代码重复
- ❌ 维护困难

### 之后（自动选择）

```typescript
// main.tsx（无需条件判断）
<ChatContainer />
```

**优势**：
- ✅ 对使用者透明
- ✅ Metro Bundler 自动选择
- ✅ Web 和 RN 功能完整
- ✅ 共享业务逻辑

---

## 📊 功能对比

| 功能 | Web 版本 | RN 版本 | 实现方式 |
|------|---------|---------|---------|
| 浮动按钮 | ✅ | ✅ | `<button>` / `TouchableOpacity` |
| 聊天面板 | ✅ | ✅ | `<div>` / `Modal` |
| 消息列表 | ✅ | ✅ | `<div>` / `ScrollView` |
| 文本输入 | ✅ | ✅ | `<textarea>` / `TextInput` |
| 截图功能 | ✅ | ⚠️ | `navigator.mediaDevices` / `Alert` |
| 毛玻璃效果 | ✅ | ⚠️ | `backdrop-filter` / `rgba` |
| 消息角色 | ✅ | ✅ | 共享类型 |
| 状态管理 | ✅ | ✅ | 共享 hooks |

---

## 🚀 使用方式

### 导入（对开发者透明）

```typescript
// 无需任何平台判断！
import { ChatContainer } from '@project_neko/components';

export function MainScreen() {
  return (
    <View>
      <ChatContainer />
    </View>
  );
}
```

### Metro Bundler 自动选择

- **Web 构建**：使用 `ChatContainer.tsx`（HTML/CSS 实现）
- **iOS/Android 构建**：使用 `ChatContainer.native.tsx`（RN 实现）

---

## 🎨 UI 展示

### Web 版本
- 浮动按钮：左下角蓝色圆形按钮（💬）
- 聊天面板：居中半透明毛玻璃效果
- 输入框：textarea + 发送/截图按钮
- 消息气泡：左右对齐，圆角背景

### RN 版本
- 浮动按钮：左下角蓝色圆形按钮（💬）
- 聊天面板：Modal 中央弹出，90% 宽度
- 输入框：TextInput 多行 + 发送/截图按钮
- 消息气泡：左右对齐，圆角背景
- 阴影效果：iOS shadowXxx / Android elevation

---

## 🔧 技术细节

### 1. 类型安全

```typescript
// types.ts - Web 和 RN 完全共享
export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  createdAt: number;
} & (
  | { content: string; image?: string }
  | { content?: string; image: string }
);
```

### 2. 状态管理

```typescript
// 使用共享 hook
const {
  collapsed,
  setCollapsed,
  messages,
  addMessages,
  pendingScreenshots,
  setPendingScreenshots,
} = useChatState();
```

### 3. 消息发送

```typescript
// Web 和 RN 使用相同的发送逻辑
const { handleSendText } = useSendMessage(
  addMessages,
  pendingScreenshots,
  () => setPendingScreenshots([])
);
```

### 4. 平台特定功能

```typescript
// Web: 截图
const { handleScreenshot } = useWebScreenshot(
  setPendingScreenshots,
  () => alert("不支持截图"),
  () => alert("截图失败")
);

// RN: Alert 提示
const handleTakePhoto = async () => {
  Alert.alert('截图功能', 'RN 版本暂不支持');
};
```

---

## 📝 相关文档

- [跨平台组件策略](./CROSS-PLATFORM-COMPONENT-STRATEGY.md)
- [RN 开发策略](./RN-DEVELOPMENT-STRATEGY.md)
- [Live2DRightToolbar 重构参考](./REFACTOR-LIVE2D-TOOLBAR-2026-01-11.md)

---

## 🎉 总结

### 成果

✅ **ChatContainer 组件已实现跨平台支持**

- Web 和 RN 功能完整
- 共享业务逻辑
- 对使用者透明
- 维护成本降低

### 优势

1. **代码复用** - 类型、hooks 在两个平台共享
2. **自动选择** - Metro Bundler 根据平台自动选择实现
3. **功能完整** - Web 和 RN 都有完整的聊天功能
4. **易于维护** - 逻辑修改只需更新 hooks

### 后续优化

- [ ] RN 版本实现截图功能（使用 expo-image-picker 或原生模块）
- [ ] 添加消息已读状态
- [ ] 支持消息编辑/删除
- [ ] 添加 Emoji 选择器
- [ ] 优化长消息列表性能（虚拟滚动）

---

**文档版本**：1.0  
**最后更新**：2026-01-11  
**维护者**：N.E.K.O.-RN Development Team
