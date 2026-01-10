# N.E.K.O.-RN 文档中心

本文档目录用于存放 **N.E.K.O.-RN（React Native / Expo）** 端的设计与规格文档。

## 📚 规范文档体系 (Spec-Driven Docs)

本项目采用 **SDD (Spec-Driven Development)** 规范驱动开发模式。文档按功能模块化划分，作为 AI 与人类协作的“单一真理源”。

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

## 🔗 上游公共文档（N.E.K.O）

- [前端 packages 多端兼容与同步（上游入口）](./upstream-frontend-packages.md)：**公共规范单一真理源**在 `@N.E.K.O/docs/frontend`，本仓库仅引用不复制。

## 🛠 文档准则
1. **先设计后代码**：重大功能前必须先在 `/docs` 中更新相关 Spec。
2. **模块化维护**：避免在单体文件中堆积逻辑，按功能域进行分割。
3. **闭环验证**：功能的验收应严格对齐文档中描述的规格。
