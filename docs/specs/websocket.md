# WebSocket 协议规范 (WebSocket Protocol)

## 6.1 通信链路
- **URL**: `ws://{host}:{port}/ws/{characterName}`
- **数据格式**: JSON (Control) + Binary (Voice)

## 6.2 客户端 -> 服务端 (C2S)

### 会话开启 (`start_session`)
```json
{ "action": "start_session", "input_type": "audio" }
```

### 音频流传输 (`stream_data`)
```json
{ 
  "action": "stream_data", 
  "input_type": "audio", 
  "data": [/* Int16 Audio Samples */] 
}
```

### 会话结束 (`end_session`)
```json
{ "action": "end_session" }
```

## 6.3 服务端 -> 客户端 (S2C)

### 文本响应 (`gemini_response`)
```json
{ 
  "type": "gemini_response", 
  "isNewMessage": true, 
  "text": "..." 
}
```

### 用户活动检测 (`user_activity`)
```json
{ "type": "user_activity" }
```
*触发客户端打断逻辑。*

### 回合状态 (`system`)
```json
{ "type": "system", "data": "turn end" }
```

### 二进制音频
下行为原始 PCM 字节流。客户端按 **48kHz, PCM16LE, Mono** 进行解码播放。
