import React from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useT, tOrDefault } from "../i18n";
import { useChatState, useSendMessage, useWebScreenshot } from "./hooks";

/**
 * ChatContainer - Web 版本
 * 
 * 使用 HTML/CSS 实现的聊天界面：
 * - 浮动按钮（缩小态）
 * - 完整聊天框（展开态）
 * - 支持 Web 截图功能（navigator.mediaDevices）
 * 
 * @platform Web - 完整实现
 * @see ChatContainer.native.tsx - RN 版本（Modal 实现）
 */
export default function ChatContainer() {
  const t = useT();

  // 使用共享的状态管理
  const {
    collapsed,
    setCollapsed,
    messages,
    setMessages,
    addMessages,
    pendingScreenshots,
    setPendingScreenshots,
  } = useChatState();

  // 初始化欢迎消息
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "sys-1",
          role: "system",
          content: tOrDefault(
            t,
            "chat.welcome",
            "欢迎来到 React 聊天系统（迁移 Demo）"
          ),
          createdAt: Date.now(),
        },
      ]);
    }
  }, [messages.length, setMessages, t]);

  // 发送消息逻辑
  const { handleSendText } = useSendMessage(
    addMessages,
    pendingScreenshots,
    () => setPendingScreenshots([])
  );

  // Web 截图功能
  const { handleScreenshot } = useWebScreenshot(
    setPendingScreenshots,
    () => alert(tOrDefault(t, "chat.screenshot.unsupported", "您的浏览器不支持截图")),
    () => alert(tOrDefault(t, "chat.screenshot.failed", "截图失败"))
  );

  /** ================= 缩小态：左下角按钮（button，支持键盘） ================= */
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={tOrDefault(t, "chat.expand", "打开聊天")}
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#44b7fe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(68,183,254,0.5)",
          zIndex: 9999,
          border: "none",
          padding: 0,
        }}
      >
        <span style={{ color: "#fff", fontSize: 22 }}>💬</span>
      </button>
    );
  }

  /** ================= 展开态：聊天框 ================= */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 400,
        height: 520,
        margin: "0 auto",
        background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.18)",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 0 16px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(255,255,255,0.5)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {tOrDefault(t, "chat.title", "💬 Chat")}
        </span>

        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={tOrDefault(t, "chat.minimize", "最小化聊天")}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: "#e6f4ff",
            color: "#44b7fe",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: "28px",
          }}
        >
          —
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <MessageList messages={messages} />
      </div>

      <ChatInput
        onSend={handleSendText}
        onTakePhoto={handleScreenshot}
        pendingScreenshots={pendingScreenshots}
        setPendingScreenshots={setPendingScreenshots}
      />
    </div>
  );
}
