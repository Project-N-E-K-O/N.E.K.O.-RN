# 核心状态机 (Core State Machines)

## 7.1 WebSocket 连接状态 (ConnectionStatus)
- `DISCONNECTED`: 连接断开。
- `CONNECTING`: 正在握手。
- `CONNECTED`: 通信就绪。
- `ERROR`: 发生致命错误，等待重连。

**重连机制**：
- 最大尝试次数：5 次。
- 间隔：固定 3s (后续考虑指数退避)。

## 7.2 音频会话状态 (SessionActive)
- `IDLE`: 等待输入。
- `COLLECTING`: 麦克风录音中，数据上流。
- `RESPONDING`: AI 播放音频中。
- `INTERRUPTED`: 用户入场，AI 避让。
