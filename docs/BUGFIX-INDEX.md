# Bugfix 文档索引

本目录包含 N.E.K.O.-RN 项目的 bug 修复文档。

---

## 最近修复

### 2026-01-10

#### Live2DAgentState 类型一致性修复

**文件**: `bugfix-live2d-agent-state-type-consistency-2026-01-10.md`

**问题**: `Live2DAgentState` 接口中 `statusText` 和 `disabled` 字段被错误标记为可选，但 hook 始终提供这两个字段。

**影响**: 
- `packages/project-neko-components/src/Live2DRightToolbar/Live2DRightToolbar.tsx`
- `hooks/useLive2DAgentBackend.ts`

**修复**:
- 将接口改为必需字段
- 移除不必要的 fallback 和可选链

**相关文档**:
- N.E.K.O 仓库: `docs/frontend/SUMMARY-live2d-agent-state-type-fix.md`
- N.E.K.O 仓库: `docs/frontend/bugfix-live2d-agent-state-type-consistency-2026-01-10.md`

---

## 文档规范

### 命名约定

```
bugfix-<component>-<brief-description>-YYYY-MM-DD.md
```

示例：
- `bugfix-live2d-agent-state-type-consistency-2026-01-10.md`
- `bugfix-audio-service-error-handling-2026-01-10.md`

### 文档结构

每个 bugfix 文档应包含：

1. **问题描述**
   - 症状
   - 影响范围

2. **根本原因分析**
   - 为什么会出现这个问题？
   - 代码证据

3. **修复方案**
   - 具体修改
   - 代码对比

4. **验证**
   - 类型检查
   - 运行时测试

5. **最佳实践**
   - 如何预防类似问题
   - Code Review 检查点

6. **相关文档**
   - 交叉引用

---

## 搜索 Bugfix

```bash
# 查找所有 bugfix 文档
find docs -name "bugfix-*.md"

# 按日期排序
ls -lt docs/bugfix-*.md

# 搜索特定组件的修复
grep -l "ComponentName" docs/bugfix-*.md
```

---

**维护者**: N.E.K.O.-RN 开发团队  
**最后更新**: 2026-01-10
