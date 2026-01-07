# 音频服务规格 (Audio Service Spec)

## 3.1 职责
管理录音、播放状态以及通过 WebSocket 与 AI 后端进行 PCM 数据交换。

## 3.2 关键 API
- `startRecording()`: 
  - 启动原生录音采样 (16kHz, Mono)。
  - 缓冲区达到阈值 (512 samples/32ms) 时通过 WS 发送 `stream_data`。
- `playPCMData(arrayBuffer)`: 
  - 接收下行二进制数据入播放队列。
  - 推荐格式：PCM16LE, 48kHz, Mono。
- `clearAudioQueue()`: 即时中止播放并清空所有未播放的数据块。
- `handleUserSpeechDetection()`: 进入“用户说话”模式，通常包含自动打断 (Shut up) 逻辑。

## 3.3 性能规格
- **上行延迟**：目标单位切片 < 40ms。
- **下行抖动缓冲**：由原生 `PCMStream` 处理队列。
