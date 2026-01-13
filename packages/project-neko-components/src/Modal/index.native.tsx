/**
 * Modal - React Native 版本
 *
 * 使用 React Native Modal 实现的对话框系统：
 * - AlertDialog: 单按钮提示
 * - ConfirmDialog: 双按钮确认（支持危险模式）
 * - PromptDialog: 文本输入对话框
 *
 * 保持与 Web 版本相同的 Promise API
 *
 * @platform Android/iOS - 原生实现
 * @see index.tsx - Web 版本（Portal + CSS 实现）
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { tOrDefault, useT } from '../i18n';

// 对话框类型
type DialogType = 'alert' | 'confirm' | 'prompt';

// 对话框配置接口
interface AlertConfig {
  type: 'alert';
  message: string;
  title?: string | null;
  okText?: string;
}

interface ConfirmConfig {
  type: 'confirm';
  message: string;
  title?: string | null;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PromptConfig {
  type: 'prompt';
  message: string;
  defaultValue?: string;
  placeholder?: string;
  title?: string | null;
  okText?: string;
  cancelText?: string;
}

type DialogConfig = AlertConfig | ConfirmConfig | PromptConfig;

// 对话框状态
interface DialogState {
  isOpen: boolean;
  config: DialogConfig | null;
  resolve: ((value: any) => void) | null;
}

export interface ModalHandle {
  alert: (message: string, title?: string | null) => Promise<boolean>;
  confirm: (
    message: string,
    title?: string | null,
    options?: { okText?: string; cancelText?: string; danger?: boolean }
  ) => Promise<boolean>;
  prompt: (
    message: string,
    defaultValue?: string,
    title?: string | null
  ) => Promise<string | null>;
}

const Modal = forwardRef<ModalHandle | null, {}>(function ModalComponent(_, ref) {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    config: null,
    resolve: null,
  });
  const [promptValue, setPromptValue] = useState('');
  const t = useT();

  // 使用 ref 跟踪最新的 dialogState
  const dialogStateRef = useRef<DialogState>(dialogState);

  useEffect(() => {
    dialogStateRef.current = dialogState;
  }, [dialogState]);

  // 创建对话框的通用函数
  const createDialog = useCallback((config: DialogConfig): Promise<any> => {
    return new Promise((resolve) => {
      // 如果有未完成的对话框，先结算其 Promise
      const prev = dialogStateRef.current;
      if (prev.resolve && prev.config) {
        if (prev.config.type === 'prompt') {
          prev.resolve(null);
        } else if (prev.config.type === 'confirm') {
          prev.resolve(false);
        } else {
          prev.resolve(true);
        }
      }

      if (config.type === 'prompt') {
        setPromptValue(config.defaultValue || '');
      }
      setDialogState({
        isOpen: true,
        config,
        resolve,
      });
    });
  }, []);

  // 关闭对话框
  const closeDialog = useCallback(() => {
    setDialogState((prev) => {
      if (prev.resolve && prev.config) {
        if (prev.config.type === 'prompt') {
          prev.resolve(null);
        } else if (prev.config.type === 'confirm') {
          prev.resolve(false);
        } else {
          prev.resolve(true);
        }
      }
      return {
        isOpen: false,
        config: null,
        resolve: null,
      };
    });
  }, []);

  // 处理确认
  const handleConfirm = useCallback(
    (value?: any) => {
      setDialogState((prev) => {
        if (prev.resolve) {
          if (prev.config?.type === 'prompt') {
            prev.resolve(value || promptValue || '');
          } else {
            prev.resolve(true);
          }
        }
        return {
          isOpen: false,
          config: null,
          resolve: null,
        };
      });
    },
    [promptValue]
  );

  // 处理取消
  const handleCancel = useCallback(() => {
    setDialogState((prev) => {
      if (prev.resolve) {
        if (prev.config?.type === 'prompt') {
          prev.resolve(null);
        } else {
          prev.resolve(false);
        }
      }
      return {
        isOpen: false,
        config: null,
        resolve: null,
      };
    });
  }, []);

  const getDefaultTitle = useCallback(
    (type: DialogType): string => {
      switch (type) {
        case 'alert':
          return tOrDefault(t, 'common.alert', '提示');
        case 'confirm':
          return tOrDefault(t, 'common.confirm', '确认');
        case 'prompt':
          return tOrDefault(t, 'common.input', '输入');
        default:
          return '提示';
      }
    },
    [t]
  );

  // API 方法
  const showAlert = useCallback(
    (message: string, title: string | null = null): Promise<boolean> => {
      return createDialog({
        type: 'alert',
        message,
        title: title !== null ? title : getDefaultTitle('alert'),
      });
    },
    [createDialog, getDefaultTitle]
  );

  const showConfirm = useCallback(
    (
      message: string,
      title: string | null = null,
      options: { okText?: string; cancelText?: string; danger?: boolean } = {}
    ): Promise<boolean> => {
      return createDialog({
        type: 'confirm',
        message,
        title: title !== null ? title : getDefaultTitle('confirm'),
        okText: options.okText,
        cancelText: options.cancelText,
        danger: options.danger || false,
      });
    },
    [createDialog, getDefaultTitle]
  );

  const showPrompt = useCallback(
    (
      message: string,
      defaultValue: string = '',
      title: string | null = null
    ): Promise<string | null> => {
      return createDialog({
        type: 'prompt',
        message,
        defaultValue,
        title: title !== null ? title : getDefaultTitle('prompt'),
      });
    },
    [createDialog, getDefaultTitle]
  );

  useImperativeHandle(
    ref,
    () => ({
      alert: showAlert,
      confirm: showConfirm,
      prompt: showPrompt,
    }),
    [showAlert, showConfirm, showPrompt]
  );

  // 卸载时关闭未完成的对话框
  useEffect(() => {
    return () => {
      if (!dialogStateRef.current.isOpen) return;

      const { resolve, config } = dialogStateRef.current;

      if (resolve && config) {
        if (config.type === 'prompt') {
          resolve(null);
        } else if (config.type === 'confirm') {
          resolve(false);
        } else {
          resolve(true);
        }
      }

      dialogStateRef.current = {
        isOpen: false,
        config: null,
        resolve: null,
      };
    };
  }, []);

  // 渲染对话框内容
  const renderDialogContent = () => {
    if (!dialogState.config || !dialogState.isOpen) return null;

    const { config } = dialogState;
    const title = config.title || getDefaultTitle(config.type);

    return (
      <View style={styles.dialogContainer}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* 内容 */}
        <View style={styles.body}>
          <Text style={styles.message}>{config.message}</Text>

          {/* Prompt 输入框 */}
          {config.type === 'prompt' && (
            <TextInput
              style={styles.input}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder={(config as PromptConfig).placeholder || ''}
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              autoFocus
              onSubmitEditing={() => handleConfirm(promptValue)}
            />
          )}
        </View>

        {/* 按钮 */}
        <View style={styles.footer}>
          {/* Alert: 只有确定按钮 */}
          {config.type === 'alert' && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => handleConfirm()}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                {(config as AlertConfig).okText ||
                  tOrDefault(t, 'common.ok', '确定')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Confirm/Prompt: 取消 + 确定 */}
          {(config.type === 'confirm' || config.type === 'prompt') && (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>
                  {(config as ConfirmConfig | PromptConfig).cancelText ||
                    tOrDefault(t, 'common.cancel', '取消')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  config.type === 'confirm' &&
                    (config as ConfirmConfig).danger &&
                    styles.dangerButton,
                ]}
                onPress={() => handleConfirm(promptValue)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    config.type === 'confirm' &&
                      (config as ConfirmConfig).danger &&
                      styles.dangerButtonText,
                  ]}
                >
                  {(config as ConfirmConfig | PromptConfig).okText ||
                    tOrDefault(t, 'common.ok', '确定')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <RNModal
      visible={dialogState.isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeDialog}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={closeDialog}>
          <View style={styles.overlayBackground} />
        </TouchableWithoutFeedback>
        {renderDialogContent()}
      </KeyboardAvoidingView>
    </RNModal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  message: {
    fontSize: 15,
    color: '#4a4a4a',
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    marginTop: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  primaryButton: {
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  dangerButton: {
    backgroundColor: 'transparent',
  },
  dangerButtonText: {
    color: '#FF3B30',
  },
});

export { Modal };
export default Modal;
