import React from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useT, tOrDefault } from "../i18n";
import { useChatState, useSendMessage, useWebScreenshot } from "./hooks";
import type { ChatMessage, ExternalChatMessage, ChatContainerProps } from "./types";

/**
 * 将外部消息类型转换为内部 ChatMessage 类型
 */
function convertExternalMessage(msg: ExternalChatMessage): ChatMessage {
  const roleMap: Record<ExternalChatMessage['sender'], ChatMessage['role']> = {
    user: 'user',
    gemini: 'assistant',
    system: 'system',
  };

  return {
    id: msg.id,
    role: roleMap[msg.sender],
    content: msg.text,
    createdAt: new Date(msg.timestamp).getTime() || Date.now(),
  };
}

/**
 * ChatContainer - Web 版本
 *
 * 使用 HTML/CSS 实现的聊天界面：
 * - 浮动按钮（缩小态）
 * - 完整聊天框（展开态）
 * - 支持 Web 截图功能（navigator.mediaDevices）
 *
 * 支持两种模式：
 * 1. 非受控模式（默认）：组件内部管理消息状态
 * 2. 受控模式：通过 props 传入 externalMessages 和 onSendText
 *
 * @platform Web - 完整实现
 * @see ChatContainer.native.tsx - RN 版本（Modal 实现）
 */
export default function ChatContainer({
  externalMessages,
  onSendText,
}: ChatContainerProps = {}) {
  const t = useT();

  // 判断是否为受控模式
  const isControlled = externalMessages !== undefined;

  // 使用共享的状态管理（非受控模式）
  const {
    collapsed,
    setCollapsed,
    messages: internalMessages,
    setMessages,
    addMessages,
    pendingScreenshots,
    setPendingScreenshots,
  } = useChatState();

  // 计算实际显示的消息列表
  const displayMessages: ChatMessage[] = React.useMemo(() => {
    if (isControlled && externalMessages) {
      return externalMessages.map(convertExternalMessage);
    }
    return internalMessages;
  }, [isControlled, externalMessages, internalMessages]);

  // 初始化欢迎消息（仅非受控模式）
  React.useEffect(() => {
    if (!isControlled && internalMessages.length === 0) {
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
  }, [isControlled, internalMessages.length, setMessages, t]);

  // 发送消息逻辑（非受控模式）
  const { handleSendText: internalHandleSendText } = useSendMessage(
    addMessages,
    pendingScreenshots,
    () => setPendingScreenshots([])
  );

  // 统一的发送处理
  const handleSend = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (isControlled && onSendText) {
      // 受控模式：调用外部回调
      onSendText(trimmed);
    } else {
      // 非受控模式：使用内部逻辑
      internalHandleSendText(trimmed);
    }
  }, [isControlled, onSendText, internalHandleSendText]);

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
        <MessageList messages={displayMessages} />
      </div>

      <ChatInput
        onSend={handleSend}
        // 受控模式下禁用截图功能（截图仅非受控模式可用）
        onTakePhoto={isControlled ? undefined : handleScreenshot}
        pendingScreenshots={isControlled ? undefined : pendingScreenshots}
        setPendingScreenshots={isControlled ? undefined : setPendingScreenshots}
      />
    </div>
  );
}
