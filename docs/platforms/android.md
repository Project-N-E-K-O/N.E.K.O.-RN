# N.E.K.O.-RN Android 运行指南（当前状态）

本页只保留“能跑起来”的必要步骤与关键排查点；细节问题统一收敛到 `../guides/troubleshooting.md`。

---

## 🎯 本页范围（避免重复）

- **组件现状矩阵（Android 真机事实来源）**：`../strategy/rn-development.md`
- **路线图（下一步优先级）**：`../roadmap/android.md`
- **验收清单（可执行）**：`../testing/integration.md`

---

## 🧰 环境要求（最小集合）

- Node.js：`v20.19.0+` 或 `v22.12.0+`
- JDK：`17`
- Android Studio：SDK Platform 34 + Build Tools 34 + platform-tools

详细安装步骤（含命令行安装 Android SDK、zsh 环境变量、验证命令）：`../guides/android-env-macos.md`

---

## 🚀 运行（推荐顺序）

### 1) 安装依赖（含子模块）

```bash
git submodule update --init --recursive
npm install
```

### 2) 启动 Metro（热更新）

```bash
npm start
```

---

## 📦 另一种真机运行方式：EAS 本地构建 APK + adb 安装（你当前的流程）

当你更希望得到一个 **可重复安装的本地 APK**（尤其是只跑真机、不想每次都走 Android Studio/Gradle 交互）时，可以用这条链路：

```bash
# 1) 预生成原生工程（清理并重建 android/）
npx expo prebuild --platform android --clean

# 2) 安装依赖
npm i

# 3) 本地构建 development apk（需要你本机已安装 eas-cli 并满足其本地构建要求）
npx eas build --profile development --platform android --local
```

构建完成后用 adb 安装到真机：

```bash
adb install /path/to/your.apk
```

> 提示：如果你要覆盖安装或降级安装，可用 `adb install -r`（覆盖）/ `adb install -r -d`（允许降级）。

---

## 🌐 网络配置（关键）

你需要让 Android 设备能访问本机的后端：

- **Android 模拟器**：host 用 `10.0.2.2`
- **Android 真机**：host 用电脑局域网 IP（同 Wi‑Fi）
- 必要时使用端口转发：

```bash
adb reverse tcp:48911 tcp:48911
adb reverse tcp:48910 tcp:48910
```

连接配置入口：`hooks/useDevConnectionConfig.ts`（或相关工具页）

---

## ✅ 验收入口（不在此处重复清单）

- 完整可执行清单：`../testing/integration.md`
- 路线图与阶段性验收：`../roadmap/android.md`

---

## 🧯 常见问题（只保留高频入口）

- **构建失败（Java 版本不对）**：确认 JDK 17
- **真机连不上后端**：检查 host/端口、防火墙、必要时 `adb reverse`
- **模型加载失败**：检查后端静态资源端口（默认 `8081`）与资源路径

更多排查：`../guides/troubleshooting.md`

