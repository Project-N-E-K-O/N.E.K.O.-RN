# 音频服务规格 (Audio Service Spec)

## 3.1 职责
管理录音、播放状态以及通过 WebSocket 与 AI 后端进行 PCM 数据交换。

## 3.1.1 实现与依赖（2026-01-11）
- **跨平台音频&麦克风库**：`@project_neko/audio-service`
  - **React Native**：`createNativeAudioService()`（底层走 `react-native-pcm-stream`）
  - **Web**：`createWebAudioService()`（底层走 `getUserMedia + AudioWorklet`）
- **Realtime(WebSocket)**：`@project_neko/realtime`
- **主界面接入方式**：`app/(tabs)/main.tsx` → `hooks/useAudio.ts` → `services/AudioService.ts`（兼容层）→ `@project_neko/audio-service`

## 3.2 关键 API
- `startRecording()`: 
  - 启动原生录音采样 (16kHz, Mono)。
  - 缓冲区达到阈值 (512 samples/32ms) 时通过 WS 发送 `stream_data`。
- `playPCMData(arrayBuffer)`: 
  - 接收下行二进制数据入播放队列。
  - 推荐格式：PCM16LE, 48kHz, Mono。
- `clearAudioQueue()`: 即时中止播放并清空所有未播放的数据块。
- `handleUserSpeechDetection()`: 进入“用户说话”模式，通常包含自动打断 (Shut up) 逻辑。

> 说明（迁移后差异）：
> - **下行播放不再由上层手动调用 `playPCMData`**：二进制消息会被 `@project_neko/audio-service` 在 Realtime 的 `binary` 事件里自动播放。
> - `playPCMData` 仅作为历史兼容入口保留（在 `AudioService` 内部），主链路请勿再调用（避免双重播放）。
> - `hooks/useAudio.ts` **已不再对外暴露** `playPCMData`（避免误用）；如确需兼容调用，请直接使用 `audio.audioService?.playPCMData(...)` 并接受其弃用警告。

## 3.3 性能规格
- **上行延迟**：目标单位切片 < 40ms。
- **下行抖动缓冲**：由原生 `PCMStream` 处理队列。
