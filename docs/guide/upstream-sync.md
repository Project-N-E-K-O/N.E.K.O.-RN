# 上游 packages 同步指南（保持 RN 为“镜像 + overlay”）

本项目的 `packages/project-neko-*` 默认以 **`@N.E.K.O/frontend/packages/*` 为上游单一真理源（source of truth）**，RN 侧通过同步脚本进行镜像拷贝；若 RN 需要平台特有差异，则放在 `packages-overrides/` 作为 **overlay**，避免下次同步被覆盖丢失。

---

## 同步原则（务必遵守）

- **上游为源**：`packages/project-neko-*` 不应长期“手改漂移”。
- **RN 特有改动走 overlay**：把差异文件放进 `packages-overrides/project-neko-*/`。
- **需要改业务逻辑**：优先回推到 `@N.E.K.O/frontend/packages/*`，再同步回来。

---

## 同步命令（标准流程）

在 `N.E.K.O.-RN` 项目根目录执行：

```bash
node scripts/sync-neko-packages.js --verbose
```

同步完成后建议做一次验证：

```bash
npm install
npm run typecheck
```

---

## 同步后你应该看到什么

- `packages/project-neko-*` 被更新为上游最新代码（镜像拷贝）。
- `packages-overrides/` 中的文件会被覆盖到对应目标包（overlay）。
- 某些配置文件（例如 `vite.config.ts` 的 `outDir`）可能由脚本做 **路径后处理**，这类差异属于预期现象。

---

## 常见问题

### 1) “我在 RN 侧手改了 packages，下一次同步会怎样？”

会被覆盖丢失。正确做法：

- **要保留这份差异**：把对应文件迁移到 `packages-overrides/project-neko-*/`；或
- **要两端一致**：回推到上游 `@N.E.K.O/frontend/packages/*`，再同步。

### 2) “如何查看上游同步规范与背景？”

请看上游文档入口（本仓库只做索引不复制）：

- `docs/upstream-frontend-packages.md`

