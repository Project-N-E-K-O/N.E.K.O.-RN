### 上游公共文档（来自 @N.E.K.O/docs/frontend）

本页仅作为 **入口/索引**：不复制正文内容，统一跳转到上游 `@N.E.K.O/docs/frontend` 的"公共规范"文档。

> 说明：以下链接使用 **跨仓库相对路径**，适用于在 Cursor/VSCode 等本地工作区同时打开 `N.E.K.O` 与 `N.E.K.O.-RN` 的场景。
> 若你在 GitHub 网页端阅读，这些链接可能无法直接跳转（因为跨 repo）。

#### 文档入口

- [前端 packages 多端兼容与同步文档（索引）](../../N.E.K.O/docs/frontend/README.md)

#### 最新更新（2026-01-18）

- [WebSocket 稳定性改进总结](../../N.E.K.O/docs/frontend/SUMMARY-websocket-stability-improvements-2026-01-18.md) - Ref 模式、clientMessageId 去重、超时清理
- [Chat Text Conversation Feature Spec](../../N.E.K.O/docs/frontend/spec/chat-text-conversation.md) - ChatContainer WebSocket 集成规范

#### 规范与流程

- [packages 多端兼容设计（React Web / legacy HTML+JS / React Native）](../../N.E.K.O/docs/frontend/packages-multi-platform.md)
- [将 @N.E.K.O/frontend/packages 同步到 @N.E.K.O.-RN/packages（以前者为源）](../../N.E.K.O/docs/frontend/packages-sync-to-neko-rn.md)

#### Spec 规范（适合 Cursor 工作区）

- [SDD 规范（spec/README）](../../N.E.K.O/docs/frontend/spec/README.md)
- [Feature Spec 模板](../../N.E.K.O/docs/frontend/spec/template-feature-spec.md)
- [Package Spec 模板](../../N.E.K.O/docs/frontend/spec/template-package-spec.md)

#### Packages 文档（逐包说明）

- [packages 索引](../../N.E.K.O/docs/frontend/packages/README.md)
- [common](../../N.E.K.O/docs/frontend/packages/common.md)
- [request](../../N.E.K.O/docs/frontend/packages/request.md)
- [realtime](../../N.E.K.O/docs/frontend/packages/realtime.md) - 含 WebSocket 稳定性最佳实践
- [audio-service](../../N.E.K.O/docs/frontend/packages/audio-service.md)
- [live2d-service](../../N.E.K.O/docs/frontend/packages/live2d-service.md)
- [components](../../N.E.K.O/docs/frontend/packages/components.md) - ChatContainer、ChatInput 等组件
- [web-only 边界说明（components/web-bridge）](../../N.E.K.O/docs/frontend/packages/web-only-boundaries.md)

#### 本地检查（预留 CI 自动）

在本地工作区同时存在 `N.E.K.O` 与 `N.E.K.O.-RN` 时，可运行以下命令验证本页所有上游链接目标都能解析到文件：

- `npm run docs:check-upstream`

