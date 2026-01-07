# 开发与验收指南 (Dev & Acceptance Guide)

## 8.1 本地配置约束
目前这些参数依赖硬编码，修改时需同步更新：
- **Backend**: `192.168.88.38`
- **Voice Port**: `48911`
- **Asset Port**: `8081` (Live2D)

## 8.2 验收清单 (Checklist)
1. **录音校验**：使用 `pcmstream-test.tsx` 确认 16kHz 采样是否有噪音。
2. **打断校验**：在 AI 说话时大声出声，Live2D 画面应立即刷新且声音停止。
3. **加载校验**：模型下载成功后应有本地缓存，二次加载应为秒开。

## 8.3 打包构建
- 确保原生模块 `react-native-live2d` 已通过 `npm install` 链接。
- Android 使用 `npx expo run:android` 进行 Debug 构建。
- iOS 需配置相应的 Provisioning Profile。
