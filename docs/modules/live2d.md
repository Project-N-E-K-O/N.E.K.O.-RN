# Live2D 与口型服务 (Live2D & LipSync Spec)

## 4.1 Live2DService
负责模型生命周期与渲染控制。
- `loadModel(modelName)`: 
  - 从后端下载并缓存模型资源。
  - 路径：`Paths.cache/live2d/{modelName}/`。
- `playMotion(group, priority)`: 触发特定动画。
- `setExpression(expressionId)`: 立即切换面部表情。

## 4.2 LipSyncService
负责音频振幅驱动的口型同步。
- **机制**：订阅原生播放器的 `onAmplitudeUpdate` 事件。
- **配置项**：
  - `minAmplitude`: 噪声阈值 (默认 0.005)。
  - `amplitudeScale`: 振幅张角缩放 (默认 1.0)。
- **实时性**：直接调用原生 `ReactNativeLive2dModule.setMouthValue()`，无平滑处理以降低时延感。
