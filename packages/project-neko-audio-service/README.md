# @project_neko/audio-service

跨平台音频服务（Web / React Native）：

- **Web**：`getUserMedia + AudioWorklet` 采集麦克风 → 通过 Realtime(WebSocket) 上行；下行支持 PCM16 与（可选）OGG/OPUS 流式解码后播放，并提供振幅回调用于口型同步。
- **React Native**：优先适配 `react-native-pcm-stream`（Android/iOS 原生模块），后续 native module API 变更仅需调整适配层。

> 注意：这是 N.E.K.O monorepo 内部 workspace 包，目前入口指向 TS 源码，不是可直接发布到 npm 的产物。

---

## 最近更新（2026-01-10）

**错误处理修复**：
- ✅ 修复 Native 版本录音启动失败被静默吞掉的问题
- ✅ 修复 Web 版本并行启动时麦克风资源泄漏的问题
- ✅ 改进状态机一致性，确保失败时正确设置 `error` 状态

详见主项目文档：[Audio Service 错误处理修复](https://github.com/your-org/N.E.K.O/blob/main/docs/frontend/packages/audio-service-error-handling-fix.md)

---

## 使用方法

参考主项目文档：[audio-service.md](https://github.com/your-org/N.E.K.O/blob/main/docs/frontend/packages/audio-service.md)


