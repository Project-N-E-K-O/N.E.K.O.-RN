# 主协调层 (Coordination Layer)

## 5.1 MainManager
`MainManager` 是业务逻辑的最终汇聚点，确保音频与视觉反馈高度同步。

## 5.2 核心业务流 (Workflows)

### AI 发言响应 (`onGeminiResponse`)
1. **音频清理**：清空之前回复残留的播放队列。
2. **视觉反馈**：调用 `Live2DService` 播放 `happy` 动作或关联表情。
3. **文本流转**：将文本转发至 UI 渲染层。

### 用户打断逻辑 (`onUserSpeechDetected`)
1. **强制静音**：调用 `AudioService` 停止一切音频播放。
2. **沉浸式交互**：Live2D 角色表现出“惊讶”或“倾听”的姿态。

### 回合结束处理 (`onTurnEnd`)
- 统计回合指标。
- (未来) 触发情感提取，持久化模型表情状态。
