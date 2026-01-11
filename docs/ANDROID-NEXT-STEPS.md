# Android 端下一步路线图（对齐 N.E.K.O Web 前端体验）

**文档日期**：2026-01-11  
**目标**：在 Android（RN 真机）实现与 `@N.E.K.O/docs/frontend` 对齐的核心体验与整体流程闭环。

---

## 0. 当前状态（结论）

- **核心链路已跑通**：Live2D（原生）+ WS（realtime）+ 音频上下行（`@project_neko/audio-service` + `react-native-pcm-stream`）+ LipSync + MainManager 协调。
- **UI 现状**：
  - `Live2DRightToolbar`：已有 RN 版本（`.native.tsx`），Android 可用。
  - `ChatContainer`：已有 RN 版本（`.native.tsx`），但当前仍是“迁移 Demo（自维护消息）”，**尚未接入主界面 WS 文本消息数据流**。
  - `Modal` / `StatusToast`：当前实现依赖 `react-dom`（Web-only），Android 需要补齐 `.native.tsx` 或 RN 入口避免导出。

---

## 1. 优先级（按依赖关系排序）

### P0：主界面“字幕/聊天”闭环（Android 体验最关键缺口）

- **P0-1**：把主界面的 WS 文本消息（`hooks/useChatMessages.ts`）接入 `ChatContainer.native.tsx` 的 UI 展示。
  - 推荐方案：让 `ChatContainer` 支持“受控 props”（`messages/onSend/...`），或统一成一个共享 store。
  - 验收：`gemini_response` 流式追加能在 UI 上逐字增长；`turn end` 后标记完成。

- **P0-2**：把“发送文本”打通到后端（与 Web 侧流程对齐）。
  - 验收：用户输入能触发后端回复（至少能走同一条 WS 或 HTTP→WS 的链路）。

### P1：Toast/Modal 原生化（让 Android 交互体验可用且一致）

- **P1-1**：实现 `StatusToast.native.tsx`（或 RN 入口导出 RN 版），替代核心路径里的 `Alert.alert`。
- **P1-2**：实现 `Modal` 的 RN 版（Alert/Confirm/Prompt），保持 `ModalHandle` Promise API 不变。

### P2：Live2D 手势 + Preferences 持久化

- **P2-1**：JS 层接入拖拽/捏合，把手势映射到 `scale/position`（原生 view 已支持 props 控制）。
- **P2-2**：把 `useLive2DPreferences` 真正接入 `useLive2D`（当前主界面存在 TODO）。

### P3：Settings 菜单流程落地（整体流程功能）

- **最快路径（建议）**：优先用 WebView 打开后端现有页面（如 `/api_key`、`/chara_manager`、`/memory_browser` 等），先达成“功能可达”，再择机原生化。

---

## 2. 验收建议（最小集合）

- **会话与音频**
  - Mic 打开：能录音上行；后端能回音频下行并播放。
  - 用户说话：能触发打断（stopPlayback）并恢复下一轮。

- **UI 与状态一致性**
  - 工具栏 Mic 状态与实际录音状态一致（失败时回落并提示）。
  - 聊天面板能显示真实 WS 文本消息（流式追加）。

- **Live2D**
  - 模型加载稳定；onBlur unload 不崩；LipSync 仅在 JS+Native ready 且页面聚焦时启用。

