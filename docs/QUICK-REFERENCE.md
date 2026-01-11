# N.E.K.O.-RN 快速参考（当前状态）

本页是“入口 + 速查”，不复制长教程与历史记录。

---

## 🚀 常用命令

- Android（真机/模拟器）：`npm run android` / `npx expo run:android`
- Metro：`npm start`（清缓存：`npm start -- --clear`）
- Web（仅调试 Web 组件）：`npm run web`
- 类型检查：`npm run typecheck`

---

## ✅ Android 真机必看

- 运行与环境：`./ANDROID-PLATFORM-GUIDE.md`
- 下一步优先级：`./ANDROID-NEXT-STEPS.md`
- 集成验收：`./integration-testing-guide.md`

---

## 📦 UI 组件现状（结论）

- **已可用（Android）**：
  - `Live2DRightToolbar`（已有 `.native.tsx`）
  - `ChatContainer`（已有 `.native.tsx`，但需对齐 WS 消息数据流）
- **仍为 Web-only（Android 不可用）**：
  - `Modal`（DOM/CSS）
  - `StatusToast`（`react-dom` Portal）

---

## ⚠️ 最常见坑（当前仍会遇到）

- **Chat 面板能打开但没真实消息**：主界面消息流在 `hooks/useChatMessages.ts`，而 `ChatContainer.native.tsx` 仍是迁移 Demo（自维护消息）。需要统一数据源（见 `ANDROID-NEXT-STEPS.md` P0）。
- **Android 模型不显示**：通常是没触发 `useLive2D.loadModel()` 或后端静态资源（默认 `8081`）不可达（见 `./modules/live2d.md`）。
- **真机连不上后端**：host/端口配置或防火墙问题；必要时用 `adb reverse`（见 `./ANDROID-PLATFORM-GUIDE.md`）。

