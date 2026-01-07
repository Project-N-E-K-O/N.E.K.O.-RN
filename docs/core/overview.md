# 系统概述 (System Overview)

## 1.1 项目使命
N.E.K.O.-RN 旨在提供一个高性能、跨平台的虚拟角色实时交互客户端。通过集成 Live2D 渲染引擎与低延迟 PCM 音频链路，实现与 AI 角色（如基于 Gemini 的对话系统）的自然语音与视觉反馈交互。

## 1.2 核心技术能力
- **渲染引擎**：自研 `react-native-live2d` 原生模块，支持 Cubism 框架。
- **音频架构**：自研 `react-native-pcm-stream`，支持流式 16-bit PCM 采集与播放。
- **通信协议**：基于 WebSocket 的全双工通信，支持流式文本（TTFT 优化）与二进制音频。
- **智能协调**：`MainManager` 协调层实现情感驱动的 Live2D 动作与音频打断逻辑。

## 1.3 技术栈
- **框架**：React Native 0.81.4 + Expo 54
- **语言**：TypeScript (TSConfig Strict)
- **路由**：Expo Router (File-based Routing)
- **构建**：EAS Build / Dev Client
