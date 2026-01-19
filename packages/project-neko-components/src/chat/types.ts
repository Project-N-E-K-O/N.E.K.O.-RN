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
 * WebSocket 连接状态
 */
export type ConnectionStatus = "idle" | "connecting" | "open" | "closing" | "closed" | "reconnecting";

/**
 * ChatContainer 组件 Props
 *
 * 与 N.E.K.O/frontend 保持一致的接口设计
 */
export interface ChatContainerProps {
  /**
   * 外部消息列表（受控模式）
   * 如果提供，将显示外部消息而非内部状态
   */
  externalMessages?: ExternalChatMessage[];

  /**
   * 发送消息的回调（受控模式）
   * 如果提供，发送消息时会调用此回调而非内部逻辑
   * @param text 文本内容
   * @param images 可选的图片 base64 数组（截图或拍照）
   */
  onSendMessage?: (text: string, images?: string[]) => void;

  /**
   * WebSocket 连接状态
   * 用于显示连接状态指示器
   */
  connectionStatus?: ConnectionStatus;

  /**
   * 是否禁用输入（如断开连接时）
   */
  disabled?: boolean;

  /**
   * 自定义状态文本（显示在标题栏）
   */
  statusText?: string;

  /**
   * @deprecated 使用 onSendMessage 代替
   * 发送文本消息的回调（受控模式）
   */
  onSendText?: (text: string) => void;

  /**
   * 是否启用相机功能（仅 RN 平台）
   * 设为 true 时才会请求相机权限并显示拍照按钮
   * 默认为 false（相机功能需要集成 react-native-image-picker 或 expo-image-picker）
   */
  cameraEnabled?: boolean;
}
