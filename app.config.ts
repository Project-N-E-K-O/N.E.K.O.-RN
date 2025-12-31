import type { ConfigContext, ExpoConfig } from "expo/config";

import base from "./app.json";

type BuildProfile = "development" | "preview" | "production" | string;

function getBuildProfile(): BuildProfile | undefined {
  // EAS Build 会自动注入该变量（值通常为 development/preview/production）
  const profile = process.env.EAS_BUILD_PROFILE;
  return profile ?? undefined;
}

function isDevLikeBuild(profile?: BuildProfile): boolean {
  if (profile) return profile === "development";
  // 本地 `expo start` / `expo run:*` 默认认为是开发环境
  return process.env.NODE_ENV !== "production";
}

function buildIosAtsForDev(): NonNullable<
  NonNullable<ExpoConfig["ios"]>["infoPlist"]
>["NSAppTransportSecurity"] {
  // Dev：允许局域网（如 192.168.x.x）明文请求；同时保留少量常用 host 例外
  return {
    // 允许访问本地网络资源（例如 192.168.x.x、10.x.x.x 等）
    NSAllowsLocalNetworking: true,
    NSExceptionDomains: {
      localhost: {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: false,
      },
      "127.0.0.1": {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: false,
      },
      // Android 模拟器访问宿主机常用 IP（iOS 侧不会用到，但保留无害）
      "10.0.2.2": {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: false,
      },
      // 局域网开发：建议用 dev 域名映射到 192.168.x.x，再在此处放行域名
      "dev.neko.local": {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: false,
      },
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseExpo = (base as any).expo as ExpoConfig;
  const profile = getBuildProfile();
  const devLike = isDevLikeBuild(profile);

  // 以 app.json 为基础，再按构建环境做“最小必要”覆盖
  const merged: ExpoConfig = {
    ...baseExpo,
    ...config,
    ios: {
      ...baseExpo.ios,
      ...config.ios,
      infoPlist: {
        ...(baseExpo.ios?.infoPlist ?? {}),
        ...(config.ios?.infoPlist ?? {}),
      },
    },
    android: {
      ...baseExpo.android,
      ...config.android,
    },
  };

  // --- iOS: ATS ---
  // 清理掉任何潜在的全局放开（避免误把 NSAllowsArbitraryLoads 带进生产）
  if (merged.ios?.infoPlist?.NSAppTransportSecurity) {
    delete (merged.ios.infoPlist as any).NSAppTransportSecurity;
  }
  if (devLike) {
    merged.ios = merged.ios ?? {};
    merged.ios.infoPlist = merged.ios.infoPlist ?? {};
    merged.ios.infoPlist.NSAppTransportSecurity = buildIosAtsForDev();
  }

  // --- Android: cleartext traffic ---
  merged.android = merged.android ?? {};
  // Expo 支持这些字段，但 ExpoConfig 的 TS 类型可能未覆盖，故在此做最小范围断言
  (merged.android as any).usesCleartextTraffic = devLike ? true : false;
  (merged.android as any).networkSecurityConfig = devLike
    ? "./config/android/network_security_config.dev.xml"
    : "./config/android/network_security_config.prod.xml";

  return merged;
};

