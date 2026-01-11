/**
 * Chat 组件导出
 * 
 * Metro Bundler 会根据平台自动选择：
 * - Web: ChatContainer.tsx
 * - Android/iOS: ChatContainer.native.tsx
 */

export { default as ChatContainer } from "./ChatContainer";
export { default as ChatInput } from "./ChatInput";
export { default as MessageList } from "./MessageList";
export * from "./types";
export * from "./hooks";