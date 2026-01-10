# packages-overrides

## 目的

本目录存放 **N.E.K.O.-RN 特有的文件**，这些文件在同步上游 `@N.E.K.O/frontend/packages` 后会自动叠加（overlay）到对应的 `packages/project-neko-*` 目录中。

## 使用场景

使用 overlay 机制的文件必须满足以下条件之一：

1. **平台特有资源**：仅 RN 需要的图片、字体等静态资源
2. **极少量平台适配代码**：无法在上游通过 `index.native.ts` 等条件入口解决的特殊情况
3. **临时 workaround**：等待上游修复的紧急补丁（应尽快回推上游）

## 禁止场景

❌ **不应放入 overlay 的内容**：

- 可以回推到上游的通用改进
- 完整的逻辑文件（会导致上游更新时冲突）
- 业务功能代码（应在 RN app 层实现）

## 目录结构

```
packages-overrides/
├── README.md (本文件)
├── project-neko-components/
│   └── src/
│       └── assets/
│           └── toast_background.png (RN 特有的 toast 背景图)
└── (其他包的 overlay,按需添加)
```

## Overlay 应用时机

每次运行 `scripts/sync-neko-packages.js` 时：

1. 先执行镜像同步（上游 → RN packages）
2. 然后应用 overlay（覆盖同名文件）
3. 输出应用的 overlay 文件清单

## 维护规则

### 添加新 overlay 文件时

1. **优先评估是否可回推上游**：大多数改动应该在上游解决
2. **在本 README 中记录原因**：为何这个文件必须是 RN 特有的
3. **定期审查**：随着上游能力完善，逐步减少 overlay 文件

### 删除 overlay 文件时

1. 确认上游已包含等效功能或不再需要该文件
2. 删除对应的 overlay 文件
3. 运行同步脚本验证无影响

## 当前 Overlay 清单

### project-neko-common

- `package.json`
  - **原因**：保持 vite 依赖版本声明（修复 CVE-2025-62522），避免同步时被覆盖为旧版本
  - **内容**：`devDependencies.vite: ^7.1.11`
  - **添加时间**：2026-01-10
  - **说明**：上游已修复到 ^7.1.11，但在同步脚本运行前需要此 override 确保版本正确

### project-neko-components

- `src/assets/toast_background.png`
  - **原因**：RN 特有的 toast 背景图片，Web 端使用纯 CSS 实现
  - **大小**：34KB
  - **添加时间**：2026-01-10

- `package.json`
  - **原因**：保持 vite 依赖版本声明（修复 CVE-2025-62522），避免同步时被覆盖为旧版本
  - **内容**：`devDependencies.vite: ^7.1.11`
  - **添加时间**：2026-01-10
  - **说明**：上游已修复到 ^7.1.11，但在同步脚本运行前需要此 override 确保版本正确

### project-neko-audio-service

- `package.json`
  - **原因**：保持 vite 依赖版本声明（修复 CVE-2025-62522），避免同步时被覆盖为旧版本
  - **内容**：`devDependencies.vite: ^7.1.11`
  - **添加时间**：2026-01-10
  - **说明**：上游已修复到 ^7.1.11，override 确保安全版本

### project-neko-live2d-service

- `package.json`
  - **原因**：保持 vite 依赖版本声明（修复 CVE-2025-62522），避免同步时被覆盖为旧版本
  - **内容**：`devDependencies.vite: ^7.1.11`
  - **添加时间**：2026-01-10
  - **说明**：上游已修复到 ^7.1.11，override 确保安全版本

### project-neko-realtime

- `package.json`
  - **原因**：保持 vite 依赖版本声明（修复 CVE-2025-62522），避免同步时被覆盖为旧版本
  - **内容**：`devDependencies.vite: ^7.1.11`
  - **添加时间**：2026-01-10
  - **说明**：上游已修复到 ^7.1.11，override 确保安全版本

## 故障排查

### 问题：同步后某个文件被意外覆盖

**原因**：该文件不在 overlay 中，被上游版本覆盖是预期行为。

**解决**：
1. 评估该改动是否应回推上游
2. 如确需 RN 特有，将文件添加到对应的 overlay 目录
3. 重新运行同步脚本

### 问题：overlay 文件没有生效

**检查点**：
1. 文件路径是否与上游 packages 完全一致（相对于包根目录）
2. 同步脚本是否正常执行了 overlay 应用步骤
3. 查看同步日志中的 overlay 应用清单

## 相关文档

- [packages 同步流程](../docs/upstream-frontend-packages.md)
- [上游 packages 文档](../../N.E.K.O/docs/frontend/packages-sync-to-neko-rn.md)
