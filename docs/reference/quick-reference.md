# N.E.K.O.-RN 快速参考（当前状态）

本页是“入口 + 速查”，不复制长教程与历史记录。

---

## 🚀 常用命令

- Android（真机，本地出 APK）：`npx expo prebuild --platform android --clean && npm i && npx eas build --profile development --platform android --local`（见 `../platforms/android.md`）
- Metro：`npm start`（清缓存：`npm start -- --clear`）
- Web（仅调试 Web 组件）：`npm run web`
- 类型检查：`npm run typecheck`

---

## ✅ Android 真机必看

- 运行与环境：`../platforms/android.md`
- macOS 环境搭建（Android SDK / JDK17 / zsh）：`../guides/android-env-macos.md`
- 下一步优先级：`../roadmap/android.md`
- 集成验收：`../testing/integration.md`
- 组件现状矩阵：`../strategy/rn-development.md`
- 常见问题排查：`../guides/troubleshooting.md`
