# React 跨平台组件策略：同时支持 Web 和 RN

**文档日期**：2026-01-11  
**适用场景**：组件需要同时在 Web 和 React Native 环境运行，但对 RN 做特殊适配

---

## 🎯 核心目标

**让一个组件同时支持 Web 和 RN，仅对 RN 做特殊处理，避免完全重写。**

```
┌─────────────────────────────────────┐
│   统一组件接口 (Props/Types)        │
├─────────────────────────────────────┤
│  Web 实现     │   RN 特殊处理       │
│  (完整版)     │   (简化/适配版)      │
└─────────────────────────────────────┘
```

---

## 📋 方案对比

### 方案 1：文件扩展名自动选择（⭐ 推荐）

Metro Bundler 和 Webpack 都支持平台特定的文件扩展名：

```
src/Live2DRightToolbar/
├── Live2DRightToolbar.tsx        # Web 默认实现
├── Live2DRightToolbar.native.tsx # RN 特殊实现
├── index.ts                       # 统一导出
└── types.ts                       # 共享类型
```

**导入时自动选择**：
```typescript
// index.ts
export * from './Live2DRightToolbar';  // 自动选择平台版本
```

**打包器行为**：
- Web 打包：使用 `Live2DRightToolbar.tsx`
- RN 打包：使用 `Live2DRightToolbar.native.tsx`（如果存在）
- 对使用者透明，无需条件判断

---

### 方案 2：Platform.select() API

```typescript
// Live2DRightToolbar/index.ts
import { Platform } from 'react-native';

export const Live2DRightToolbar = Platform.select({
  web: require('./Live2DRightToolbar.web').Live2DRightToolbar,
  default: require('./Live2DRightToolbar.native').Live2DRightToolbar,
});
```

**优点**：
- ✅ 运行时动态选择
- ✅ 灵活控制

**缺点**：
- ⚠️ 运行时判断，略有性能开销
- ⚠️ Tree-shaking 效果较差

---

### 方案 3：组件内部条件渲染

```typescript
// Live2DRightToolbar.tsx
import { Platform, View } from 'react-native';

export function Live2DRightToolbar(props: Props) {
  if (Platform.OS === 'web') {
    return <WebImplementation {...props} />;
  }
  
  return <NativeImplementation {...props} />;
}
```

**优点**：
- ✅ 单一文件，易于维护
- ✅ 可共享逻辑

**缺点**：
- ⚠️ 文件可能变得复杂
- ⚠️ Web 和 RN 代码混在一起

---

## ⭐ 推荐实现：方案 1（文件扩展名）

### 完整示例：Live2DRightToolbar

#### 1. 目录结构

```
packages/project-neko-components/src/Live2DRightToolbar/
├── types.ts                          # 共享类型定义
├── hooks.ts                          # 共享业务逻辑
├── Live2DRightToolbar.tsx            # Web 完整实现
├── Live2DRightToolbar.native.tsx     # RN 简化实现
├── components/                       # RN 子组件
│   ├── ToolbarButton.tsx
│   ├── AgentPanel.tsx
│   └── SettingsPanel.tsx
├── styles.native.ts                  # RN 样式
└── index.ts                          # 统一导出
```

---

#### 2. 共享类型 (`types.ts`)

```typescript
// types.ts - Web 和 RN 共享
export type Live2DRightToolbarButtonId = 
  | "mic" 
  | "screen" 
  | "agent" 
  | "settings" 
  | "goodbye" 
  | "return";

export type Live2DRightToolbarPanel = "agent" | "settings" | null;

export interface Live2DAgentState {
  statusText: string;
  master: boolean;
  keyboard: boolean;
  mcp: boolean;
  userPlugin: boolean;
  disabled: Partial<Record<Live2DAgentToggleId, boolean>>;
}

export interface Live2DSettingsState {
  mergeMessages: boolean;
  allowInterrupt: boolean;
  proactiveChat: boolean;
  proactiveVision: boolean;
}

// Props 接口 - Web 和 RN 完全一致
export interface Live2DRightToolbarProps {
  visible?: boolean;
  right?: number;
  bottom?: number;
  top?: number;
  isMobile?: boolean;

  micEnabled: boolean;
  screenEnabled: boolean;
  goodbyeMode: boolean;

  openPanel: Live2DRightToolbarPanel;
  onOpenPanelChange: (panel: Live2DRightToolbarPanel) => void;

  settings: Live2DSettingsState;
  onSettingsChange: (id: Live2DSettingsToggleId, next: boolean) => void;

  agent: Live2DAgentState;
  onAgentChange: (id: Live2DAgentToggleId, next: boolean) => void;

  onToggleMic: (next: boolean) => void;
  onToggleScreen: (next: boolean) => void;
  onGoodbye: () => void;
  onReturn: () => void;

  onSettingsMenuClick?: (id: Live2DSettingsMenuId) => void;
}
```

---

#### 3. 共享业务逻辑 (`hooks.ts`)

```typescript
// hooks.ts - 提取可复用的业务逻辑
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { 
  Live2DRightToolbarPanel,
  Live2DAgentToggleId,
  Live2DSettingsToggleId,
} from './types';

/**
 * 面板开关逻辑（Web 和 RN 共享）
 */
export function usePanelToggle(
  openPanel: Live2DRightToolbarPanel,
  onOpenPanelChange: (panel: Live2DRightToolbarPanel) => void
) {
  const [closingPanel, setClosingPanel] = useState<Exclude<Live2DRightToolbarPanel, null> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PANEL_ANIM_MS = 240;

  const startClose = useCallback(
    (panel: Exclude<Live2DRightToolbarPanel, null>) => {
      setClosingPanel(panel);
      onOpenPanelChange(null);

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        setClosingPanel((prev) => (prev === panel ? null : prev));
        closeTimerRef.current = null;
      }, PANEL_ANIM_MS);
    },
    [onOpenPanelChange]
  );

  const togglePanel = useCallback(
    (panel: Exclude<Live2DRightToolbarPanel, null>) => {
      if (openPanel === panel) {
        startClose(panel);
        return;
      }

      if (openPanel) {
        startClose(openPanel);
      }
      onOpenPanelChange(panel);
    },
    [onOpenPanelChange, openPanel, startClose]
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  return {
    closingPanel,
    togglePanel,
    startClose,
    PANEL_ANIM_MS,
  };
}

/**
 * 按钮配置（Web 和 RN 共享，但图标路径可能不同）
 */
export function useToolbarButtons({
  micEnabled,
  screenEnabled,
  openPanel,
  goodbyeMode,
  isMobile,
  onToggleMic,
  onToggleScreen,
  onGoodbye,
  togglePanel,
  iconBasePath = '/static/icons', // RN 可覆盖
}: any) {
  return useMemo(
    () =>
      [
        {
          id: "mic" as const,
          title: "语音控制",
          hidden: false,
          active: micEnabled,
          onClick: () => onToggleMic(!micEnabled),
          icon: `${iconBasePath}/mic_icon_off.png`,
        },
        {
          id: "screen" as const,
          title: "屏幕分享",
          hidden: false,
          active: screenEnabled,
          onClick: () => onToggleScreen(!screenEnabled),
          icon: `${iconBasePath}/screen_icon_off.png`,
        },
        {
          id: "agent" as const,
          title: "Agent工具",
          hidden: Boolean(isMobile),
          active: openPanel === "agent",
          onClick: () => togglePanel("agent"),
          icon: `${iconBasePath}/Agent_off.png`,
          hasPanel: true,
        },
        {
          id: "settings" as const,
          title: "设置",
          hidden: false,
          active: openPanel === "settings",
          onClick: () => togglePanel("settings"),
          icon: `${iconBasePath}/set_off.png`,
          hasPanel: true,
        },
        {
          id: "goodbye" as const,
          title: "请她离开",
          hidden: Boolean(isMobile),
          active: goodbyeMode,
          onClick: onGoodbye,
          icon: `${iconBasePath}/rest_off.png`,
          hasPanel: false,
        },
      ].filter((b) => !b.hidden),
    [goodbyeMode, isMobile, micEnabled, onGoodbye, onToggleMic, onToggleScreen, openPanel, screenEnabled, togglePanel, iconBasePath]
  );
}
```

---

#### 4. Web 实现（保持原样）

```typescript
// Live2DRightToolbar.tsx - Web 版本（原有实现）
import React from "react";
import { tOrDefault, useT } from "../i18n";
import { usePanelToggle, useToolbarButtons } from "./hooks";
import type { Live2DRightToolbarProps } from "./types";
import "./Live2DRightToolbar.css";

export function Live2DRightToolbar(props: Live2DRightToolbarProps) {
  const t = useT();
  const { togglePanel, closingPanel, startClose, PANEL_ANIM_MS } = usePanelToggle(
    props.openPanel,
    props.onOpenPanelChange
  );

  const buttons = useToolbarButtons({
    ...props,
    togglePanel,
  });

  // ... Web 原有实现（使用 div, button, img 等）
  
  return (
    <div className="live2d-right-toolbar" style={{ right: props.right, top: props.top }}>
      {/* Web 完整 UI */}
    </div>
  );
}
```

---

#### 5. RN 实现（特殊处理）

```typescript
// Live2DRightToolbar.native.tsx - RN 版本（简化实现）
import React from 'react';
import { View, TouchableOpacity, Image, Modal, ScrollView, Switch, Text } from 'react-native';
import { usePanelToggle, useToolbarButtons } from './hooks';
import type { Live2DRightToolbarProps } from './types';
import { styles } from './styles.native';

export function Live2DRightToolbar(props: Live2DRightToolbarProps) {
  const { togglePanel, closingPanel } = usePanelToggle(
    props.openPanel,
    props.onOpenPanelChange
  );

  const buttons = useToolbarButtons({
    ...props,
    togglePanel,
    // RN 使用远程图标或本地资源
    iconBasePath: 'http://your-server.com/static/icons',
  });

  if (!props.visible) return null;

  return (
    <>
      {/* 浮动按钮组 */}
      <View style={[styles.container, { right: props.right, top: props.top }]}>
        {props.goodbyeMode ? (
          <TouchableOpacity
            style={[styles.button, styles.returnButton]}
            onPress={props.onReturn}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: 'http://your-server.com/static/icons/rest_off.png' }} 
              style={styles.icon}
            />
          </TouchableOpacity>
        ) : (
          buttons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={[styles.button, button.active && styles.buttonActive]}
              onPress={button.onClick}
              activeOpacity={0.7}
            >
              <Image 
                source={{ uri: button.icon }} 
                style={styles.icon}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Agent Panel Modal */}
      <Modal
        visible={props.openPanel === 'agent'}
        transparent
        animationType="slide"
        onRequestClose={() => props.onOpenPanelChange(null)}
      >
        <TouchableWithoutFeedback onPress={() => props.onOpenPanelChange(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.panelContainer}>
                <Text style={styles.statusText}>{props.agent.statusText}</Text>
                
                {/* Agent 开关列表 */}
                <View style={styles.row}>
                  <Switch
                    value={props.agent.master}
                    onValueChange={(value) => props.onAgentChange('master', value)}
                    disabled={props.agent.disabled.master}
                  />
                  <Text style={styles.label}>Agent总开关</Text>
                </View>
                
                <View style={styles.row}>
                  <Switch
                    value={props.agent.keyboard}
                    onValueChange={(value) => props.onAgentChange('keyboard', value)}
                    disabled={props.agent.disabled.keyboard}
                  />
                  <Text style={styles.label}>键鼠控制</Text>
                </View>
                
                {/* ... 更多开关 */}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Settings Panel Modal */}
      <Modal
        visible={props.openPanel === 'settings'}
        transparent
        animationType="slide"
        onRequestClose={() => props.onOpenPanelChange(null)}
      >
        <TouchableWithoutFeedback onPress={() => props.onOpenPanelChange(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.panelContainer}>
                {/* Settings 开关列表 */}
                <View style={styles.row}>
                  <Switch
                    value={props.settings.mergeMessages}
                    onValueChange={(value) => props.onSettingsChange('mergeMessages', value)}
                  />
                  <Text style={styles.label}>合并消息</Text>
                </View>
                
                {/* ... 更多设置 */}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
```

---

#### 6. RN 样式 (`styles.native.ts`)

```typescript
// styles.native.ts
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 99999,
    flexDirection: 'column',
  },
  
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  buttonActive: {
    backgroundColor: 'rgba(68, 183, 254, 0.9)',
  },
  
  returnButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  
  icon: {
    width: '76%',
    height: '76%',
    resizeMode: 'contain',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  panelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  statusText: {
    fontSize: 13,
    color: '#44b7fe',
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(68, 183, 254, 0.1)',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginBottom: 8,
  },
  
  label: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});
```

---

#### 7. 统一导出 (`index.ts`)

```typescript
// index.ts - 自动根据平台选择实现
export * from './types';
export * from './Live2DRightToolbar';  // Metro 自动选择 .tsx 或 .native.tsx
```

---

#### 8. 包导出配置

```typescript
// packages/project-neko-components/index.ts (Web)
export * from './src/Live2DRightToolbar';  // 使用 .tsx

// packages/project-neko-components/index.native.ts (RN)
export * from './src/Live2DRightToolbar';  // 使用 .native.tsx
```

---

## 🎯 使用方式（对开发者透明）

```typescript
// app/(tabs)/main.tsx
import { Live2DRightToolbar } from '@project_neko/components';

// 无需任何平台判断！组件内部已处理
export function MainScreen() {
  return (
    <View>
      <Live2DRightToolbar
        visible
        micEnabled={micEnabled}
        screenEnabled={screenEnabled}
        {...otherProps}
      />
    </View>
  );
}
```

**打包时自动选择**：
- Web 构建：使用 `Live2DRightToolbar.tsx`（完整 Web 实现）
- iOS/Android 构建：使用 `Live2DRightToolbar.native.tsx`（RN 适配版本）

---

## 📊 方案对比总结

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **文件扩展名** | 自动选择、Tree-shaking 好、对使用者透明 | 需要两个文件 | ⭐⭐⭐⭐⭐ |
| **Platform.select()** | 灵活、运行时切换 | 性能略差、Tree-shaking 差 | ⭐⭐⭐ |
| **组件内条件** | 单文件维护 | 代码混杂、难以维护 | ⭐⭐ |
| **当前方案** | 无需实现 RN 版本 | RN 端功能缺失 | ⭐⭐⭐⭐ |

---

## 🔧 实施步骤

### Step 1：提取共享逻辑
```bash
cd packages/project-neko-components/src/Live2DRightToolbar
touch types.ts hooks.ts
```

将类型和业务逻辑提取到独立文件。

### Step 2：创建 Native 实现
```bash
touch Live2DRightToolbar.native.tsx
touch styles.native.ts
```

### Step 3：实现 RN 版本
参考上面的示例代码，实现简化版 RN 组件。

### Step 4：更新导出
```typescript
// index.ts
export * from './types';
export * from './Live2DRightToolbar';
```

### Step 5：移除条件判断
```typescript
// main.tsx - 之前
{Platform.OS === 'web' && (
  <Live2DRightToolbar {...props} />
)}

// main.tsx - 之后（自动选择平台版本）
<Live2DRightToolbar {...props} />
```

---

## ✅ 优势总结

### 对开发者
- ✅ **无需关心平台差异** - 导入即用
- ✅ **类型安全** - TypeScript 完整支持
- ✅ **API 一致** - Web 和 RN 使用相同 Props

### 对维护者
- ✅ **代码分离** - Web 和 RN 实现独立维护
- ✅ **逻辑复用** - hooks 和 types 共享
- ✅ **渐进式迁移** - 可先用 Web 版本，再实现 RN 版本

### 对性能
- ✅ **Tree-shaking** - 只打包对应平台的代码
- ✅ **编译时选择** - 无运行时判断开销
- ✅ **优化空间** - 每个平台可独立优化

---

## 💡 最佳实践

### 1. 优先提取共享逻辑
```typescript
// ✅ 推荐：提取到 hooks.ts
export function useToolbarState() {
  // 业务逻辑
}

// ❌ 避免：在组件内重复实现
```

### 2. 保持 Props 一致
```typescript
// ✅ 推荐：Web 和 RN 使用相同接口
export interface ComponentProps {
  // 共享 props
}

// ❌ 避免：平台特定 props
interface WebComponentProps {
  webOnly?: string;
}
```

### 3. 合理简化 RN 实现
```typescript
// ✅ RN 可以简化但保持功能
- Web: 浮动面板 + 动画
- RN: Modal + 基础过渡

// ❌ 不要过度简化导致功能缺失
```

### 4. 文档注释说明差异
```typescript
/**
 * Live2D 右侧工具栏
 * 
 * @platform Web - 完整实现（浮动面板、CSS 动画）
 * @platform RN - 简化实现（Modal 面板、基础过渡）
 */
export function Live2DRightToolbar(props: Props) {
  // ...
}
```

---

## 📚 相关资源

- [React Native Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [Metro Bundler Platform Extensions](https://facebook.github.io/metro/docs/configuration#platforms)
- [Expo Platform Specific Modules](https://docs.expo.dev/workflow/customizing/#platform-specific-extensions)

---

**文档版本**：1.0  
**最后更新**：2026-01-11  
**维护者**：N.E.K.O.-RN Development Team
