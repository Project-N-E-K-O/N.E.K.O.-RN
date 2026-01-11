# N.E.K.O.-RN 开发策略（当前状态）

本页仅保留 **当前仓库** 的开发策略结论与边界说明；不保留改动记录与重复教程内容。

---

## 🎯 总体原则

- **Android 真机优先**：核心体验必须在 Android（Dev Client）可用。
- **共享优先**：网络/协议/服务层优先复用 `@project_neko/*`（request/realtime/audio-service/live2d-service）。
- **UI 跨端**：关键 UI 通过 `.native.tsx` 落地到 RN，避免 Android 依赖 `react-dom`。

---

## 🧩 当前 Android 主链路（概览）

- Live2D：`react-native-live2d`（原生渲染）
- 音频：`@project_neko/audio-service`（Native 走 `react-native-pcm-stream`）
- Realtime：`@project_neko/realtime`（WS client）
- 协调：`MainManager`（Audio/Live2D 打断与反馈）

规格：
- `./modules/audio.md`
- `./modules/live2d.md`
- `./modules/coordination.md`
- `./specs/websocket.md`
- `./specs/states.md`

---

## 📦 UI 组件现状矩阵（以 Android 真机为准）

| 组件/能力 | Android | 说明 |
|---|---:|---|
| Live2D 视图 | ✅ | 原生模块必需 |
| Mic 上行 + 音频下行播放 | ✅ | `@project_neko/audio-service` 接管二进制播放 |
| Live2DRightToolbar | ✅ | 已有 `.native.tsx`（简化版） |
| ChatContainer | ⚠️ | 已有 `.native.tsx`（UI 已有），但需对齐 WS 文本消息数据流 |
| Modal（Alert/Confirm/Prompt） | ⏳ | 当前为 Web-only（DOM/CSS），需 RN 版 |
| StatusToast | ⏳ | 当前依赖 `react-dom`，需 RN 版 |
| Live2D 拖拽/缩放手势 | ⚠️ | 单指 SDK 交互 ✅；UI 手势映射到 `scale/position` ⏳ |

---

## 🚧 目前优先级（结论）

详见：`./ANDROID-NEXT-STEPS.md`

---

## 🔗 相关文档（入口）

- 跨平台组件策略：`./CROSS-PLATFORM-COMPONENT-STRATEGY.md`
- Android 运行指南：`./ANDROID-PLATFORM-GUIDE.md`
- 集成测试清单：`./integration-testing-guide.md`

