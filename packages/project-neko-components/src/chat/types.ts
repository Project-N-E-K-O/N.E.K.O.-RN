export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  createdAt: number;
} & (
    | { content: string; image?: string }
    | { content?: string; image: string }
  );

export interface PendingScreenshot {
  id: string;
  base64: string;
}

/**
 * 外部消息类型（来自 useChatMessages hook）
 * sender: 'user' | 'gemini' | 'system' -> 映射到 role: 'user' | 'assistant' | 'system'
 */
export interface ExternalChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'gemini' | 'system';
  timestamp: string;
  isComplete?: boolean;
}

/**
 * ChatContainer 组件 Props
 */
export interface ChatContainerProps {
  /**
   * 外部消息列表（受控模式）
   * 如果提供，将显示外部消息而非内部状态
   */
  externalMessages?: ExternalChatMessage[];
  /**
   * 发送文本消息的回调（受控模式）
   * 如果提供，发送消息时会调用此回调而非内部逻辑
   */
  onSendText?: (text: string) => void;
}
