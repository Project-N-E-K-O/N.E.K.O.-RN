# N.E.K.O.-RN 集成测试指南（当前状态）

本文档仅保留 **当前仓库（Android 真机优先）** 的可执行验收清单。  
排查请移步：`../guides/troubleshooting.md`。

---

## 🧪 测试环境准备

- **后端**：启动 N.E.K.O 主服务器（默认 `48911`），并确保 WebSocket `/ws/{characterName}` 可达。
- **RN 配置**：确认 `useDevConnectionConfig`（host/port/characterName）已指向可访问的后端。
- **网络**：按 `../platforms/android.md` 的“网络配置（关键）”设置（模拟器 `10.0.2.2`；真机局域网 IP，必要时 `adb reverse`）。

参考：
- `../platforms/android.md`（环境/运行/网络）
- `../specs/websocket.md`（协议）

---

## ✅ 核心验收清单（主界面：`app/(tabs)/main.tsx`）

### 1) Live2D（渲染/生命周期）
- [ ] 进入主界面后能触发 `loadModel()`（focus 时调用）
- [ ] `onModelLoaded` 后模型稳定渲染
- [ ] 点击模型能触发 tap 回调（业务可用）
- [ ] 页面切换/失焦时能卸载（不崩溃、不残留 GL 资源）

参考：`./modules/live2d.md`

### 2) WebSocket（连接/重连）
- [ ] 能连接到 `ws://{host}:{port}/ws/{characterName}`
- [ ] 断线后按策略重连（上限/间隔与当前实现一致）

参考：`./specs/states.md`

### 3) 音频（上行/下行/打断）
- [ ] 工具栏 Mic 打开：启动录音并上行 `stream_data`
- [ ] 后端下行二进制音频能播放（由 `@project_neko/audio-service` 接管）
- [ ] 收到 `user_activity` 或用户主动打断时：停止播放并清理队列

参考：`./modules/audio.md`

### 4) LipSync（口型同步）
- [ ] 仅在 **页面聚焦 + JS 资源 ready + Native 渲染 ready** 时启动
- [ ] AI 播放音频时嘴巴跟随振幅变化；播放停止后归零

参考：`./modules/live2d.md`

### 5) Chat UI（展示/发送）
- [ ] WS 文本消息能在 `ChatContainer.native.tsx` 中正确展示（含流式追加场景）
- [ ] 手动输入并发送文本：能触发后端回复（与 Web 流程一致）

路线图：`../roadmap/android.md`

