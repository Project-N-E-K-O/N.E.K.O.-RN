/**
 * Chat 组件导出
 * 
 * Metro Bundler 会根据平台自动选择：
 * - Web: ChatContainer.tsx
 * - Android/iOS: ChatContainer.native.tsx
 * 
 * 注意：
 * - ChatInput 和 MessageList 只有 Web 实现（使用 HTML 元素）
 * - index.native.ts 应该只导出 ChatContainer（RN-safe）
 */

export { default as ChatContainer } from "./ChatContainer";
export { default as ChatInput } from "./ChatInput";
export { default as MessageList } from "./MessageList";
export * from "./types";
export * from "./hooks";