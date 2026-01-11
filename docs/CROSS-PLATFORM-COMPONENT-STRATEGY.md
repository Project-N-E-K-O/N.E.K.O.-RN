# React 跨平台组件策略（当前实践）

本页只描述 **当前仓库正在采用** 的跨平台实现方式，避免重复/教程式长文。

---

## 🎯 目标

- **同一套组件 API（Props/Types）** 在 Web 与 RN 保持一致
- **实现分离**：Web 用 `.tsx`（DOM/CSS），RN 用 `.native.tsx`（react-native primitives）
- **使用方零条件判断**：业务页面直接 import 使用，不写 `Platform.OS === ...`（除非临时兜底）

---

## ✅ 推荐方案：平台扩展文件（Metro 自动选择）

目录示例：

```
Component/
├── Component.tsx         # Web 实现
├── Component.native.tsx  # RN 实现
├── types.ts              # 共享类型
├── hooks.ts              # 共享逻辑（尽量 host-agnostic）
└── index.ts              # 统一导出
```

约束：
- **RN 实现不得依赖** `react-dom` / `document` / CSS
- **Web-only 能力**（如截图、Portal、window API）必须隔离在 Web 实现中

---

## 📌 当前仓库落地位置（作为“事实来源”）

- `packages/project-neko-components/src/Live2DRightToolbar/`
  - 已有 `Live2DRightToolbar.native.tsx`
- `packages/project-neko-components/src/chat/`
  - 已有 `ChatContainer.native.tsx`

> 注意：Chat 的 RN UI 已存在，但仍需与主界面 WS 文本消息数据流对齐（见 `./ANDROID-NEXT-STEPS.md`）。

---

## ⚠️ Web-only 组件（当前仍需原生化）

- `Modal`：当前为 Web DOM/CSS 体系，Android 真机需补齐 RN 版（保持 Promise API 不变）
- `StatusToast`：当前依赖 `react-dom` Portal，Android 真机需补齐 RN 版

---

## ✅ Checklist（新增/迁移组件时）

- [ ] types/hooks 是否可在 Web/RN 共用（不引入 DOM / react-dom / window）？
- [ ] 是否提供 `.native.tsx`（Android 真机可运行）？
- [ ] RN 入口（`index.native.ts`）是否避免导出 Web-only 实现？
- [ ] 是否更新 `./RN-DEVELOPMENT-STRATEGY.md` 的组件矩阵（仅写结论，不写改动过程）？

