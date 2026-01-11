# 开发与验收（当前状态）

本页只保留“开始开发 + 验收入口”。环境细节与排查请看对应文档链接。

---

## ✅ 开发前置

- Android 环境/网络：`../ANDROID-PLATFORM-GUIDE.md`
- 常见问题：`./troubleshooting.md`
- 上游 packages 同步：`./upstream-sync.md`

---

## 🚀 常用命令

```bash
npm install

# Android Dev Client（推荐）
npx expo run:android

# Metro
npm start

# 类型检查
npm run typecheck
```

---

## ✅ 最小验收（推荐顺序）

- [ ] **Live2D**：模型可加载、可点击、切页不崩
- [ ] **音频**：Mic 可录音上行；后端回音频可播放
- [ ] **打断**：用户说话/收到 `user_activity` 能停止播放并进入下一轮
- [ ] **LipSync**：播放音频时嘴巴随振幅变化

完整清单：`../integration-testing-guide.md`  
路线图：`../ANDROID-NEXT-STEPS.md`

