# N.E.K.O.-RN Android 平台运行指南

**文档日期**：2026-01-11  
**适用平台**：Android（真机 + 模拟器）  
**目标用户**：开发者、测试人员

---

## 📋 概述

N.E.K.O.-RN 在 Android 平台运行，支持真机和模拟器两种方式。本文档提供完整的环境配置、构建、运行和调试指南。

---

## 🎯 关键特性

### Android 平台支持的功能

| 功能 | 支持状态 | 实现方式 | 说明 |
|------|---------|---------|------|
| **Live2D 渲染** | ✅ 完整支持 | 原生模块 | 使用 `react-native-live2d` |
| **音频录制/播放** | ✅ 完整支持 | 原生模块 | 使用 `react-native-pcm-stream` |
| **WebSocket 通信** | ✅ 完整支持 | JS 层 | 实时语音交互 |
| **手势控制** | ✅ 完整支持 | 原生手势 | 拖拽、缩放 Live2D 模型 |
| **数据持久化** | ✅ 完整支持 | AsyncStorage | 偏好设置、配置缓存 |
| **Web 组件（Toolbar等）** | ⚠️ Web 模式 | 条件渲染 | 需 Expo Web 支持 |

---

## 🛠️ 环境准备

### 1. 系统要求

**操作系统**：
- macOS（推荐）
- Windows 10/11
- Linux（Ubuntu 20.04+）

**硬件要求**：
- CPU: 4 核以上（推荐 8 核）
- RAM: 8GB 以上（推荐 16GB）
- 磁盘空间: 至少 20GB 可用空间

---

### 2. 必需软件安装

#### 2.1 Node.js
```bash
# 推荐使用 nvm 管理 Node.js 版本
# 项目要求: Node.js v20.19.0+ 或 v22.12.0+

# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.19.0
nvm use 20.19.0

# Windows
# 从 https://nodejs.org/ 下载安装 v20.19.0+

# 验证安装
node -v  # 应显示 v20.x.x 或 v22.x.x
npm -v
```

#### 2.2 JDK 17（必需）
```bash
# macOS (使用 Homebrew)
brew install openjdk@17
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc

# Windows
# 从 https://adoptium.net/ 下载 Temurin JDK 17
# 设置环境变量 JAVA_HOME

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-17-jdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# 验证安装
java -version  # 应显示 openjdk version "17.x.x"
echo $JAVA_HOME  # 应显示 JDK 17 路径
```

**⚠️ 重要**：React Native 0.73+ **必须使用 JDK 17**，不支持 JDK 11 或 JDK 21。

---

#### 2.3 Android Studio

**下载安装**：
- 官网：https://developer.android.com/studio
- 推荐版本：Jellyfish (2023.3.1) 或更高

**安装步骤**：
1. 下载并安装 Android Studio
2. 启动后，进入 SDK Manager
3. 安装以下组件：
   - ✅ Android SDK Platform 34
   - ✅ Android SDK Platform-Tools
   - ✅ Android SDK Build-Tools 34.0.0
   - ✅ Android SDK Command-line Tools
   - ✅ CMake（Native 构建需要）
   - ✅ NDK (Side by side)

---

#### 2.4 环境变量配置

**macOS/Linux** (`~/.zshrc` 或 `~/.bash_profile`):
```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Java
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
# export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Linux
```

**Windows** (系统环境变量):
```
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17

Path 添加:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%JAVA_HOME%\bin
```

**验证配置**：
```bash
# 检查 Android SDK
adb version

# 检查 Java
java -version

# 检查环境变量
echo $ANDROID_HOME
echo $JAVA_HOME
```

---

## 📦 项目初始化

### 1. 克隆项目（包含子模块）

```bash
# 克隆主项目及所有子模块
git clone --recurse-submodules https://github.com/Project-N-E-K-O/N.E.K.O.-RN.git
cd N.E.K.O.-RN

# 如果已克隆但未加载子模块
git submodule update --init --recursive
```

### 2. 安装依赖

```bash
# 安装 npm 依赖
npm install

# 清理缓存（如果遇到问题）
npm run clean
```

---

## 🚀 运行与调试

### 方式 1：开发模式运行（推荐）

#### 启动 Android 模拟器（可选）
```bash
# 列出可用的模拟器
emulator -list-avds

# 启动指定模拟器
emulator -avd Pixel_5_API_34 &

# 或者在 Android Studio 中启动 AVD Manager
```

#### 运行开发构建
```bash
# 启动 Metro bundler 并构建 Android
npm run android

# 或直接使用 Expo
npx expo run:android

# 指定设备（如有多个设备）
npx expo run:android --device
```

**首次运行**：
- 会自动安装 Development Build 到设备
- 构建时间约 5-10 分钟（根据机器性能）
- 安装完成后自动启动应用

---

### 方式 2：真机调试（推荐）

#### 准备真机
1. **启用开发者模式**：
   - 进入 `设置` → `关于手机`
   - 连续点击 `版本号` 7 次
   - 返回 `设置` → `开发者选项`

2. **启用 USB 调试**：
   - 开启 `USB 调试`
   - 开启 `USB 安装`（部分设备）

3. **连接电脑**：
   ```bash
   # 检查设备连接
   adb devices
   
   # 应显示类似：
   # List of devices attached
   # ABCDEF123456    device
   ```

#### 运行到真机
```bash
# 确保设备已连接
adb devices

# 运行应用
npm run android

# 如有多个设备，选择真机
npx expo run:android --device
```

---

### 方式 3：本地构建 APK（离线分发）

```bash
# 1. 清理并重新生成原生项目
npx expo prebuild --platform android --clean

# 2. 使用 EAS 本地构建（开发版）
npx eas build --profile development --platform android --local

# 3. 构建完成后，APK 位于项目根目录
# 文件名类似：build-xxxx.apk

# 4. 手动安装到设备
adb install build-xxxx.apk
```

**构建 Release APK**：
```bash
# 使用 release profile
npx eas build --profile preview --platform android --local
```

---

## 🔧 配置与调试

### 1. 网络配置（重要）

**修改服务器地址**：
```typescript
// utils/devConnectionConfig.ts
export const devConnectionConfig = {
  host: '192.168.1.100',  // 改为你的电脑局域网 IP
  port: 48911,
  httpPort: 48910,
};
```

**查看局域网 IP**：
```bash
# macOS/Linux
ifconfig | grep "inet "
# 或
ipconfig getifaddr en0

# Windows
ipconfig
```

**防火墙配置**：
- 确保端口 48910、48911、8081 开放
- macOS: `系统设置` → `网络` → `防火墙`
- Windows: `控制面板` → `Windows Defender 防火墙`

---

### 2. Metro Bundler 配置

**启动开发服务器**：
```bash
# 启动 Metro bundler
npm start

# 清除缓存启动
npm start -- --clear

# 指定端口
npm start -- --port 8082
```

**Metro 配置文件** (`metro.config.js`):
```javascript
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // 添加子模块支持
  config.watchFolders = [
    path.resolve(__dirname, 'packages/react-native-live2d'),
    path.resolve(__dirname, 'packages/react-native-pcm-stream'),
  ];

  return config;
})();
```

---

### 3. 调试工具

#### React Native Debugger
```bash
# 安装
brew install --cask react-native-debugger  # macOS

# 启动
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

#### Chrome DevTools
- 在应用中摇晃设备（或按 Cmd+M / Ctrl+M）
- 选择 "Debug"
- 打开 Chrome: `chrome://inspect`

#### Logcat 查看日志
```bash
# 实时查看所有日志
adb logcat

# 过滤应用日志
adb logcat | grep "ReactNative"

# 清除日志
adb logcat -c
```

---

## ⚙️ 原生模块配置

### react-native-live2d

**Android 配置** (`android/app/build.gradle`):
```gradle
android {
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
        
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        }
    }
    
    packagingOptions {
        pickFirst 'lib/*/libfbjni.so'
        pickFirst 'lib/*/libc++_shared.so'
    }
}
```

### react-native-pcm-stream

**权限配置** (`android/app/src/main/AndroidManifest.xml`):
```xml
<manifest>
    <!-- 录音权限 -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- 存储权限（模型缓存） -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
</manifest>
```

---

## 🐛 常见问题

### 1. 构建失败：JDK 版本错误
```
ERROR: JAVA_HOME is set to an invalid directory
```

**解决方案**：
```bash
# 确认 JDK 17 已安装
java -version

# 设置正确的 JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# 验证
echo $JAVA_HOME
```

---

### 2. Metro Bundler 连接失败
```
Unable to load script. Make sure you're either running Metro...
```

**解决方案**：
```bash
# 1. 清除缓存
npm start -- --clear

# 2. 重启 Metro
pkill -f metro
npm start

# 3. 重新安装应用
npm run android
```

---

### 3. 原生模块链接失败
```
Error: Unable to resolve module react-native-live2d
```

**解决方案**：
```bash
# 1. 更新子模块
git submodule update --init --recursive

# 2. 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 重新构建
npx expo prebuild --platform android --clean
npm run android
```

---

### 4. 真机网络连接失败
```
WebSocket connection failed: Connection refused
```

**解决方案**：
1. 确保手机和电脑在同一 Wi-Fi
2. 检查 `devConnectionConfig.ts` 中的 IP 地址
3. 关闭电脑防火墙或开放端口
4. 使用 `adb reverse` 端口转发：
   ```bash
   adb reverse tcp:48911 tcp:48911
   adb reverse tcp:48910 tcp:48910
   ```

---

### 5. Live2D 模型加载失败
```
Failed to load model: Network request failed
```

**解决方案**：
```bash
# 1. 检查模型 URL 是否正确
# 2. 确保网络可访问
# 3. 清除应用数据
adb shell pm clear com.neko.rn

# 4. 重启应用
```

---

## 📊 性能优化建议

### 1. 开发构建优化
```gradle
// android/app/build.gradle
android {
    buildTypes {
        debug {
            // 禁用混淆（加快构建）
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

### 2. 仅构建需要的 ABI
```gradle
android {
    defaultConfig {
        ndk {
            // 仅构建 ARM64（大部分真机）
            abiFilters 'arm64-v8a'
        }
    }
}
```

### 3. 使用增量构建
```bash
# 不清理构建缓存
npm run android

# 仅在必要时清理
npx expo prebuild --platform android --clean
```

---

## ✅ 验收清单

运行应用后，验证以下功能：

- [ ] **应用启动**：无崩溃，显示主界面
- [ ] **Live2D 渲染**：模型正常显示和动画
- [ ] **音频录制**：可以录音并传输到服务器
- [ ] **音频播放**：可以播放服务器返回的音频
- [ ] **WebSocket 连接**：实时通信正常
- [ ] **手势控制**：可以拖拽和缩放 Live2D 模型
- [ ] **打断功能**：说话时可以打断 AI 回复
- [ ] **数据持久化**：设置保存后重启应用仍存在

---

## 📚 相关文档

### 开发指南
- [开发与入门指南](./guide/development.md) - 完整开发指南
- [RN 开发策略](./RN-DEVELOPMENT-STRATEGY.md) - Web 组件优先策略
- [跨平台组件策略](./CROSS-PLATFORM-COMPONENT-STRATEGY.md) - 组件跨平台实现

### 技术规格
- [音频服务规格](./modules/audio.md) - 音频采样率、编解码
- [Live2D 服务规格](./modules/live2d.md) - 模型加载、动画控制
- [WebSocket 协议](./specs/websocket.md) - 通信协议定义

### 外部资源
- [React Native 官方文档](https://reactnative.dev/docs/environment-setup)
- [Expo 文档](https://docs.expo.dev/)
- [Android 开发者文档](https://developer.android.com/)

---

## 🔄 持续更新

本文档会随着项目开发持续更新。如遇到文档中未提及的问题，请：

1. 查看 [GitHub Issues](https://github.com/Project-N-E-K-O/N.E.K.O.-RN/issues)
2. 搜索现有解决方案
3. 创建新 Issue 报告问题

---

**文档版本**：1.0  
**最后更新**：2026-01-11  
**维护者**：N.E.K.O.-RN Development Team  
**适用版本**：N.E.K.O.-RN v1.0.0+
