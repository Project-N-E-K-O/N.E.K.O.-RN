# N.E.K.O.-RN 集成测试指南

本文档提供集成测试的步骤和检查点，用于验证 N.E.K.O.-RN 在 RN 环境中的核心功能与关键协作链路是否正常工作。

---

## 🧪 测试环境准备

### 1. 后端服务器
确保 N.E.K.O 后端服务器正在运行，包括：
- 主服务器（默认端口 48911）
- Agent 服务器（如果测试 Agent 功能）
- WebSocket 服务（用于实时通信）

### 2. RN 应用配置
检查 `useDevConnectionConfig` 中的配置：
```typescript
{
  host: 'localhost', // 或你的服务器 IP
  port: 48911,
  characterName: 'mao_pro'
}
```

### 3. 网络连接
- iOS 模拟器：使用 `localhost`
- Android 模拟器：使用 `10.0.2.2`（模拟器的特殊地址指向宿主机）
- 真机：使用服务器的局域网 IP

---

## ✅ 功能测试清单

### 基础功能（已有）

#### 1. Live2D 模型加载 ✅
- [ ] 点击"加载模型"按钮
- [ ] 模型正确显示在屏幕上
- [ ] 模型可以点击交互
- [ ] 页面切换时模型正确卸载

**测试代码位置**：`app/(tabs)/main.tsx` - `handleLoadModel`

---

#### 2. 音频服务 ✅
- [ ] WebSocket 连接成功（显示"已连接到服务器"）
- [ ] 点击"开始聊天"按钮启动录音
- [ ] 录音时显示"🎤 停止录音"
- [ ] 录音数据正确发送到服务器
- [ ] 接收并播放 AI 回复的音频

**测试代码位置**：`hooks/useAudio.ts`

---

#### 3. 口型同步 ✅
- [ ] 模型加载后自动启动口型同步
- [ ] AI 说话时嘴巴跟随音频振幅动
- [ ] 静音时嘴巴闭合
- [ ] 页面失焦时口型同步停止

**测试代码位置**：`hooks/useLipSync.ts`

---

#### 4. 聊天消息显示 ✅
- [ ] 收到 Gemini 响应时消息正确显示
- [ ] 消息列表最多显示最近 5 条
- [ ] 系统消息（连接状态等）正确显示
- [ ] 消息格式包含时间戳和角色标识

**测试代码位置**：`hooks/useChatMessages.ts`

---

### 扩展功能（可选）

#### 5. Agent Backend 管理 🆕

##### 5.1 Agent 开关
- [ ] 点击"🤖 Agent OFF"按钮
- [ ] 状态显示"Agent服务器连接中..."
- [ ] 连接成功后显示"Agent模式已开启"
- [ ] 按钮变为"🤖 Agent ON"（蓝色背景）
- [ ] 再次点击可以关闭 Agent

**期望行为**：
```
初始状态 → "查询中..." (灰色)
↓
点击 Agent OFF → "Agent服务器连接中..." (灰色，禁用)
↓
连接成功 → "Agent模式已开启" (蓝色)
↓
点击 Agent ON → "Agent模式已关闭" (灰色)
```

##### 5.2 Agent 健康检查
- [ ] 后端未启动时显示"Agent服务器未启动"
- [ ] 后端启动后状态自动更新
- [ ] Agent 面板打开时自动轮询（1.5秒）
- [ ] 关闭面板后停止轮询

**测试步骤**：
1. 启动 RN 应用（后端未启动）
2. 观察状态显示"Agent服务器未启动"
3. 启动后端服务器
4. 等待自动刷新（约 1.5 秒）
5. 状态更新为"Agent服务器就绪"

##### 5.3 错误处理
- [ ] 网络错误时显示友好提示（Alert）
- [ ] 服务器返回错误时正确解析并显示
- [ ] 并发操作时不会重复请求

**测试代码位置**：`hooks/useLive2DAgentBackend.ts`

---

#### 6. Live2D Preferences 持久化 🆕

##### 6.1 保存偏好设置
- [ ] 拖拽模型后位置被保存
- [ ] 缩放模型后比例被保存
- [ ] 关闭应用后偏好设置仍然保留

**手动测试步骤**：
1. 加载模型
2. 拖拽模型到新位置
3. 使用手势缩放模型
4. 关闭并重新打开应用
5. 再次加载模型
6. 验证位置和缩放是否恢复

##### 6.2 加载偏好设置
- [ ] 首次加载模型使用默认位置/缩放
- [ ] 再次加载相同模型恢复之前的设置
- [ ] 加载不同模型使用各自的设置

##### 6.3 数据验证
- [ ] 无效数据（NaN、Infinity）被正确忽略
- [ ] 负数缩放被拒绝
- [ ] AsyncStorage 错误被正确捕获并记录

**测试代码位置**：`hooks/useLive2DPreferences.ts`

**调试命令**：
```typescript
// 查看保存的偏好设置
import AsyncStorage from '@react-native-async-storage/async-storage';
const prefs = await AsyncStorage.getItem('@neko:live2d_preferences');
console.log('偏好设置:', JSON.parse(prefs || '[]'));

// 清空偏好设置
await AsyncStorage.removeItem('@neko:live2d_preferences');
```

---

### 集成测试（服务协调）

#### 7. MainManager 协调 ✅

##### 7.1 Gemini 响应处理
- [ ] 新消息开始时清空音频队列
- [ ] Live2D 播放"开心"动作
- [ ] 音频正确播放
- [ ] 口型同步正常

##### 7.2 用户语音打断
- [ ] 用户说话时检测到活动
- [ ] 音频播放被打断
- [ ] Live2D 播放"惊讶"动作
- [ ] 消息显示"检测到用户语音活动"

##### 7.3 回合结束
- [ ] 收到 "turn end" 消息
- [ ] Live2D 恢复"中性"表情
- [ ] 音频队列清空
- [ ] 准备接受下一轮输入

**测试代码位置**：`utils/MainManager.ts`

---

## 🐛 常见问题排查

### 问题 1：Agent 一直显示"查询中..."
**可能原因**：
- 后端服务器未启动
- 网络配置错误（host/port）
- CORS 策略阻止请求

**排查步骤**：
1. 检查后端日志确认服务器运行
2. 使用 curl 测试端点：`curl http://host:port/api/agent/health`
3. 检查 RN Debugger 的 Network 标签
4. 查看控制台错误信息

---

### 问题 2：Preferences 无法保存
**可能原因**：
- AsyncStorage 权限问题
- 数据验证失败（无效数值）
- 存储空间不足

**排查步骤**：
1. 检查控制台错误：`Failed to save preferences`
2. 验证数据格式：`console.log(snapshot)`
3. 测试 AsyncStorage：
   ```typescript
   await AsyncStorage.setItem('test', 'value');
   const result = await AsyncStorage.getItem('test');
   console.log('AsyncStorage 测试:', result);
   ```

---

### 问题 3：模型加载后位置不正确
**可能原因**：
- Preferences 未正确集成到 useLive2D
- 模型 URI 不匹配（路径或文件名不同）
- 首次加载没有偏好设置

**排查步骤**：
1. 查看加载的 URI：`console.log('modelUri:', modelUri)`
2. 查看偏好设置：`console.log('loaded prefs:', prefs)`
3. 检查匹配逻辑：精确匹配 → 文件名匹配 → 目录名匹配

---

### 问题 4：Agent 状态不自动更新
**可能原因**：
- 轮询未启动（openPanel 为 null）
- 轮询被提前清除
- 网络请求失败

**排查步骤**：
1. 检查 openPanel 状态：`console.log('openPanel:', openPanel)`
2. 确认轮询是否启动：在 useEffect 中添加日志
3. 手动调用刷新：
   ```typescript
   await refreshAgentState();
   ```

---

## 📊 性能测试

### 1. 内存使用
- [ ] 长时间运行不增长
- [ ] 页面切换后内存正确释放
- [ ] 没有内存泄漏（监听器、定时器）

**工具**：
- React Native Debugger
- Xcode Instruments (iOS)
- Android Profiler (Android)

---

### 2. 网络效率
- [ ] Agent 轮询间隔合理（1.5秒）
- [ ] 没有重复或不必要的请求
- [ ] 失败时正确重试

**监控指标**：
- 请求频率（应 ≤ 1 req/1.5s per endpoint）
- 失败率（应 < 5%）
- 响应时间（应 < 500ms）

---

### 3. UI 响应性
- [ ] 按钮点击立即响应
- [ ] 状态更新流畅无卡顿
- [ ] 动画帧率稳定（60 FPS）

---

## 🔧 自动化测试（未来）

### 单元测试框架
使用 Jest + React Native Testing Library

**示例测试**：
```typescript
// __tests__/useLive2DAgentBackend.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useLive2DAgentBackend } from '@/hooks/useLive2DAgentBackend';

describe('useLive2DAgentBackend', () => {
  it('should fetch agent health', async () => {
    const { result } = renderHook(() =>
      useLive2DAgentBackend({
        apiBase: 'http://localhost:48911',
        showToast: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshAgentState();
    });

    expect(result.current.agent.statusText).not.toBe('查询中...');
  });
});
```

---

## 📝 测试报告模板

```markdown
# 测试报告 - [日期]

## 测试环境
- 设备：iPhone 14 Pro 模拟器 / Pixel 6 模拟器
- RN 版本：0.81.4
- 后端版本：[version]

## 测试结果

### 基础功能
- [x] Live2D 加载：通过
- [x] 音频服务：通过
- [x] 口型同步：通过
- [x] 聊天显示：通过

### 新增功能
- [ ] Agent Backend：[通过/失败/部分通过]
  - 具体问题：...
- [ ] Preferences：[通过/失败/部分通过]
  - 具体问题：...

### 性能指标
- 内存使用：[数值] MB
- CPU 使用：[数值]%
- 网络请求数：[数值] req/min

### 发现的问题
1. [问题描述]
   - 重现步骤：...
   - 预期行为：...
   - 实际行为：...
   - 严重程度：高/中/低

## 建议
- [改进建议 1]
- [改进建议 2]
```

---

## 📚 相关文档
- [上游文档](./upstream-frontend-packages.md)
- [架构设计](./arch/design.md)

---

**文档版本**：1.0  
**最后更新**：2026-01-10
