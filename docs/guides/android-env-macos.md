# macOS（zsh）Android 基础开发环境搭建

适用场景：在 **macOS** 上为本仓库（Expo + React Native）准备 Android 开发环境（真机/模拟器），并能顺利完成本地构建 APK + 真机安装运行。

> 本文只覆盖“能开发/能构建/能跑起来”的最小集合；项目运行与网络配置请看 `../platforms/android.md`。

---

## 0. 你最终应该具备什么

- `java -version` 显示 **17**
- `adb version` 能输出版本号（来自 `platform-tools`）
- `sdkmanager --version` 能输出版本号（来自 `cmdline-tools`）
- （可选）`emulator -version` / `emulator -list-avds` 可用（需要 Android Emulator）
- 构建并安装（真机）：

```bash
npx expo prebuild --platform android --clean
npm i
npx eas build --profile development --platform android --local
adb install /path/to/your.apk
```

---

## 1. 安装方式选择：Android Studio（推荐） vs 命令行（可复现）

### A) 通过 Android Studio 图形化管理 SDK（推荐）

1) 安装 Android Studio  
2) 打开 **Settings/Preferences → Android SDK**，确认 SDK 路径（建议默认）：

- Apple Silicon / Intel 默认通常是：`$HOME/Library/Android/sdk`

3) 在 **SDK Platforms** 中勾选：

- Android 14（API 34）

4) 在 **SDK Tools** 中勾选（至少）：

- Android SDK Build-Tools 34.x
- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)
- Android Emulator（如果你需要模拟器）

5) 应用并等待下载完成。

### B) 通过命令行安装 Android SDK（你当前的方式，适合写进脚本/CI）

核心思路：把 Google 官方的 **Command-line Tools** 放进 `$ANDROID_SDK_ROOT/cmdline-tools/latest`，然后用 `sdkmanager` 安装平台与工具。

#### 1) 确定 SDK 目录

建议使用 Android Studio 默认目录（本项目文档也按这个写）：

```bash
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
mkdir -p "$ANDROID_SDK_ROOT"
```

> 兼容性提示：部分旧工具仍读取 `ANDROID_HOME`。如果你遇到“找不到 SDK”类问题，可以同时设置：
>
> `export ANDROID_HOME="$ANDROID_SDK_ROOT"`

#### 2) 安装 Command-line Tools（cmdline-tools）

从 Google 下载 **Command line tools only**（macOS）压缩包后，解压并放到如下结构：

```
$ANDROID_SDK_ROOT/
  cmdline-tools/
    latest/
      bin/sdkmanager
      bin/avdmanager
      ...
```

最常见的坑是多一层目录（例如 `cmdline-tools/latest/cmdline-tools/bin`）。如果你解压后结构不对，调整到上面这种即可。

#### 3) 用 sdkmanager 安装必要组件

先把 `sdkmanager` 加入 PATH（也可以先临时 export 一次）：

```bash
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
```

安装（最小集合 + API 34）：

```bash
sdkmanager --install \
  "platform-tools" \
  "platforms;android-34" \
  "build-tools;34.0.0"
```

如果你需要模拟器（可选）：

```bash
sdkmanager --install \
  "emulator" \
  "system-images;android-34;google_apis;arm64-v8a"
```

接受许可：

```bash
yes | sdkmanager --licenses
```

（可选）创建 AVD（仅在你需要模拟器时）：

```bash
avdmanager create avd -n neko-api34 -k "system-images;android-34;google_apis;arm64-v8a"
```

---

## 2. 安装 Java 17（brew）

安装：

```bash
brew install openjdk@17
```

推荐设置方式（更稳，避免路径差异）：

```bash
export JAVA_HOME="$(
  /usr/libexec/java_home -v 17 2>/dev/null
)"
export PATH="$JAVA_HOME/bin:$PATH"
```

验证：

```bash
java -version
javac -version
```

---

## 3. Gradle 7 要不要装？

通常 **不需要**。项目会通过 `android/gradlew`（Gradle Wrapper）使用匹配版本（无论是本地构建还是其他构建方式），无需你额外安装全局 Gradle。

只有在以下情况下你才需要全局 Gradle（可选）：

- 你想在任意目录直接运行 `gradle ...` 做调试/排查
- 你明确需要固定某个 Gradle 版本进行对齐

如果你仍想安装：

```bash
brew install gradle@7
```

---

## 4. zsh 配置示例（与你当前配置对齐）

把下面追加到 `~/.zshrc`，然后 `source ~/.zshrc`：

```bash
# Android SDK
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
export PATH="$PATH:$ANDROID_SDK_ROOT/emulator"

# Java 17
export JAVA_HOME="$(
  /usr/libexec/java_home -v 17 2>/dev/null
)"
export PATH="$JAVA_HOME/bin:$PATH"

# Gradle（可选：通常不需要）
# export PATH="/opt/homebrew/opt/gradle@7/bin:$PATH"
```

> 你原来的 `JAVA_HOME="/opt/homebrew/opt/openjdk@17"` 也能用；上面这种写法在不同 Homebrew 安装路径/多 JDK 场景下更不容易踩坑。

---

## 5. 快速验证（建议按顺序执行）

```bash
which java
java -version

which adb
adb version

which sdkmanager
sdkmanager --version

# 仅在需要模拟器时
which emulator
emulator -version || true
emulator -list-avds || true
```

---

## 6. 常见坑位（高频）

- **找不到 sdkmanager / adb**：检查 `PATH` 是否包含 `cmdline-tools/latest/bin` 与 `platform-tools`
- **cmdline-tools 目录层级不对**：确保是 `cmdline-tools/latest/bin/sdkmanager`（不要多一层 `cmdline-tools`）
- **Gradle 报 Java 版本不对**：确认 `JAVA_HOME` 指向 JDK17，且 `java -version` 真的是 17
- **真机/模拟器连不上后端**：这不是环境问题，按 `../platforms/android.md` 的网络配置排查（`adb reverse` / host 配置）

