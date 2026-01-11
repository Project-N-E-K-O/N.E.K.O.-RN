/**
 * React Native 专用导出
 * 
 * 注意：Web-only 组件（依赖 react-dom）不在此导出
 * - StatusToast, Modal 仅 Web 可用
 * - Live2DRightToolbar, ChatContainer 已实现 RN 版本（使用 .native.tsx）
 */

export { Button } from "./src/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./src/Button";

// StatusToast 依赖 react-dom，不导出
// export { default as StatusToast } from "./src/StatusToast";
// export type { StatusToastHandle } from "./src/StatusToast";

export { QrMessageBox } from "./src/QrMessageBox";
export type { QrMessageBoxProps } from "./src/QrMessageBox";

// Modal 依赖 react-dom，不导出
// export { default as Modal } from "./src/Modal";
// export type { ModalHandle } from "./src/Modal";
// export { AlertDialog } from "./src/Modal/AlertDialog";
// export { ConfirmDialog } from "./src/Modal/ConfirmDialog";
// export { PromptDialog } from "./src/Modal/PromptDialog";
// export { BaseModal } from "./src/Modal/BaseModal";
// export type { BaseModalProps } from "./src/Modal/BaseModal";
// export type { AlertDialogProps } from "./src/Modal/AlertDialog";
// export type { ConfirmDialogProps } from "./src/Modal/ConfirmDialog";
// export type { PromptDialogProps } from "./src/Modal/PromptDialog";

// Live2DRightToolbar 现已支持 RN（使用 .native.tsx）
export * from "./src/Live2DRightToolbar";

// ChatContainer 现已支持 RN（使用 .native.tsx）
// 注意：只导出 ChatContainer，ChatInput 和 MessageList 仅 Web 可用（使用 HTML 元素）
export { ChatContainer } from "./src/chat";
export type { ChatMessage, PendingScreenshot } from "./src/chat";

// i18n adapter (Provider -> window.t -> fallback)
export { I18nProvider, useT, tOrDefault } from "./src/i18n";
export type { TFunction, I18nProviderProps } from "./src/i18n";

// 为了类型兼容性，导出空的 stub 类型
export type StatusToastHandle = {
  show: (message: string, duration?: number) => void;
};

export type ModalHandle = {
  showAlert: (message: string, title?: string | null) => Promise<boolean>;
  showConfirm: (message: string, title?: string | null, options?: any) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string | null) => Promise<string | null>;
};
