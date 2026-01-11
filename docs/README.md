# N.E.K.O.-RN 文档中心

本文档目录用于存放 **N.E.K.O.-RN（React Native / Expo）** 端的设计与规格文档。

## 📚 规范文档体系 (Spec-Driven Docs)

本项目采用 **SDD (Spec-Driven Development)** 规范驱动开发模式。文档按功能模块化划分，作为 AI 与人类协作的"单一真理源"。

### 0. 开发策略（重要）⭐
- **[RN 开发策略](./RN-DEVELOPMENT-STRATEGY.md)**：**优先使用 React/Web 组件**，渐进式迁移方案（必读）
- **[跨平台组件策略](./CROSS-PLATFORM-COMPONENT-STRATEGY.md)**：同时支持 Web 和 RN 的组件实现方案（进阶）
- **[快速参考卡片](./QUICK-REFERENCE.md)**：开发时的速查手册（推荐收藏）
- **[常见问题排查](./guide/troubleshooting.md)**：开发/构建常见问题与解决方案

### 1. 核心概述 (Core)
- [系统概述](./core/overview.md)：项目使命、技术能力与技术栈。
- [架构设计](./arch/design.md)：分层架构、核心设计模式与 Mermaid 图表。

### 2. 详细规格 (Modules)
- [音频服务](./modules/audio.md)：采样率、上行/下行控制。
- [Live2D 服务](./modules/live2d.md)：模型生命周期与口型驱动。
- [主协调层](./modules/coordination.md)：AI 响应与用户打断业务流。

### 3. 数据契约 (Specs)
- [WebSocket 协议](./specs/websocket.md)：JSON 负载与二进制数据格式定义。
- [状态机](./specs/states.md)：连接状态与会话状态管理。

### 4. 开发指南 (Guides)
- [开发与验收](./guide/development.md)：硬编码约束、环境配置与验收清单。
- **[Android 平台运行指南](./ANDROID-PLATFORM-GUIDE.md)**：Android 环境配置、构建、运行和调试（⭐ Android 开发者必读）

### 5. 上游同步（packages）
- **[上游 packages 同步指南](./guide/upstream-sync.md)**：如何同步 `@N.E.K.O/frontend/packages/*` 到本仓库 `packages/project-neko-*`
- [上游公共文档入口（N.E.K.O）](./upstream-frontend-packages.md)：本仓库只引用不复制

## 🛠 文档准则
1. **先设计后代码**：重大功能前必须先在 `/docs` 中更新相关 Spec。
2. **模块化维护**：避免在单体文件中堆积逻辑，按功能域进行分割。
3. **闭环验证**：功能的验收应严格对齐文档中描述的规格。
4. **渐进式迁移**：优先使用 Web 组件快速实现功能，参考 [RN 开发策略](./RN-DEVELOPMENT-STRATEGY.md)。
