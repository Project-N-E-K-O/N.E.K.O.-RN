import { AndroidPCMStreamService, AUDIO_CONFIG } from '@/services/android.pcmstream.native';
import { WSService } from '@/services/wsService';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AudioTestProps { }

const AudioTest: React.FC<AudioTestProps> = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('未连接');
    const [receivedDataCount, setReceivedDataCount] = useState(0);
    const [messages, setMessages] = useState<Array<{ id: string; text: string; sender: string; timestamp: string }>>([]);

    
    const androidPCMStreamServiceRef = useRef<AndroidPCMStreamService | null>(null);
    const wsServiceRef = useRef<WSService | null>(null);

    // const WS_HOST = '192.168.88.38';
    const WS_HOST = '192.168.50.66';
    const WS_PORT = 48911;
    const WS_CHARACTER_NAME = 'test';

    // 初始化音频配置
    const initializeAudio = async () => {
        try {
            androidPCMStreamServiceRef.current = new AndroidPCMStreamService(wsServiceRef.current!);
            androidPCMStreamServiceRef.current.init();
            await androidPCMStreamServiceRef.current.configureRecordingAudioSession();
        } catch (error) {
            console.error('音频初始化失败:', error);
            Alert.alert('错误', '音频初始化失败');
        }
    };

    // 初始化WebSocket连接
    const initWebSocket = () => {
        try {
            wsServiceRef.current = new WSService({
                host: WS_HOST,
                port: WS_PORT,
                characterName: WS_CHARACTER_NAME,
                onOpen: () => {
                    setIsConnected(true);
                    setConnectionStatus('已连接');
                },
                onMessage: (event) => {
                    console.log('收到WebSocket消息:', typeof event.data);
                    setReceivedDataCount(prev => prev + 1);
                    onMessage(event);
                },
                onError: (error) => {
                    setConnectionStatus('连接错误');
                },
                onClose: (event) => {
                    setIsConnected(false);
                    setConnectionStatus('连接已关闭');
                }
            });
            wsServiceRef.current.init();

            const onMessage = async (event: MessageEvent) => {
                console.log('收到WebSocket消息:', typeof event.data);

                // 处理二进制PCM数据
                if (event.data instanceof Blob) {
                    try {
                        const arrayBuffer = await event.data.arrayBuffer();
                        console.log('收到Blob音频数据:', arrayBuffer.byteLength, '字节');
                        await androidPCMStreamServiceRef.current?.playPCMData(arrayBuffer);
                    } catch (e) {
                        console.warn('处理Blob音频失败:', e);
                    }
                    return;
                } else if (event.data instanceof ArrayBuffer) {
                    console.log('收到ArrayBuffer音频数据:', event.data.byteLength, '字节');
                    await androidPCMStreamServiceRef.current?.playPCMData(event.data);
                    return;
                }

                if (typeof event.data === 'string') {
                    try {
                        const parsed = JSON.parse(event.data);
                        console.log('收到文本消息:', parsed);

                        if (parsed.type === 'gemini_response') {
                            const isNewMessage = parsed.isNewMessage || false;
                            console.log(`🎀 处理Gemini响应: isNewMessage=${isNewMessage}, text="${parsed.text}"`);
                            appendMessage(parsed.text, 'gemini', isNewMessage);
                            if (isNewMessage) {
                                console.log('新消息开始，清空音频队列');
                                androidPCMStreamServiceRef.current?.clearAudioQueue();
                            }
                        } else if (parsed.type === 'user_activity') {
                            console.log('🎤 检测到用户语音活动，执行语音打断处理');
                            androidPCMStreamServiceRef.current?.handleUserSpeechDetection();
                        } else if (parsed.type === 'cozy_audio') {
                            console.log('收到Cozy音频:', parsed);
                        } else if (parsed.type === 'status') {
                            console.log('收到状态消息:', parsed);
                        } else if (parsed.type === 'system' && parsed.data === 'turn end') {
                            console.log('收到turn end事件，开始情感分析');
                            // 消息完成时进行情感分析
                            const lastGeminiMessage = messages.filter(msg => msg.sender === 'gemini').pop();
                            if (lastGeminiMessage) {
                                const fullText = lastGeminiMessage.text.replace(/^\[\d{2}:\d{2}:\d{2}\] 🎀 /, '');
                                console.log('fullText:', fullText);
                                // setTimeout(async () => {
                                // const emotionResult = await analyzeEmotion(fullText);
                                // if (emotionResult && emotionResult.emotion) {
                                // console.log('消息完成，情感分析结果:', emotionResult);
                                // applyEmotion(emotionResult.emotion);
                                // }
                                // }, 100);
                            }
                        }
                    } catch (e) {
                        console.log('收到普通文本消息');
                    }
                }
            };

        } catch (error) {
            console.error('WebSocket初始化失败:', error);
            Alert.alert('错误', 'WebSocket连接失败');
        }
    };

    // 切换录音状态
    const toggleRecording = async() => {
        const currentlyRecording = androidPCMStreamServiceRef.current?.getIsRecording();
        // 如果当前未录音，准备开始录音，先开始会话；若当前在录音，准备停止，则结束会话
        if (!currentlyRecording) {
            startSession();
        } else {
            endSession();
        }
        await androidPCMStreamServiceRef.current?.toggleRecording();
        // 同步本地状态以触发重渲染
        setIsRecording(!!androidPCMStreamServiceRef.current?.getIsRecording());
    };

    // 初始化会话
    const startSession = () => {
        const sessionMessage = {
            action: 'start_session',
            input_type: 'audio'
        };

        wsServiceRef.current?.send(JSON.stringify(sessionMessage));
        console.log('已发送start_session');
    };

    // 结束会话
    const endSession = () => {
        const sessionMessage = {
            action: 'end_session'
        };

        wsServiceRef.current?.send(JSON.stringify(sessionMessage));
        console.log('已发送end_session');
    };

    // 清空消息记录
    const clearMessages = () => {
        setMessages([]);
        androidPCMStreamServiceRef.current?.clearAudioQueue(); // 同时清空音频队列
        console.log('消息记录和音频队列已清空');
    };

    const appendMessage = (text: string, sender: string, isNewMessage: boolean) => {
        const getCurrentTimeString = () => {
            return new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        if (sender === 'gemini' && !isNewMessage) {
            // 追加到现有的Gemini消息
            setMessages(prevMessages => {
                // 查找最后一个gemini消息
                const lastGeminiIndex = prevMessages.map(msg => msg.sender).lastIndexOf('gemini');
                if (lastGeminiIndex !== -1) {
                    console.log(`📝 追加消息到索引 ${lastGeminiIndex}: "${text}"`);
                    return prevMessages.map((msg, index) =>
                        index === lastGeminiIndex
                            ? { ...msg, text: msg.text + text }
                            : msg
                    );
                } else {
                    // 如果没有找到gemini消息，创建新消息
                    console.log(`⚠️ 没有找到gemini消息，创建新消息: "${text}"`);
                    const newMessage = {
                        id: Date.now().toString(),
                        text: `[${getCurrentTimeString()}] 🎀 ${text}`,
                        sender,
                        timestamp: getCurrentTimeString()
                    };
                    return [...prevMessages, newMessage];
                }
            });
        } else {
            // 创建新消息
            const newMessage = {
                id: Date.now().toString(),
                text: `[${getCurrentTimeString()}] ${sender === 'gemini' ? '🎀' : '👤'} ${text}`,
                sender,
                timestamp: getCurrentTimeString()
            };

            console.log(`✨ 创建新消息 ID ${newMessage.id}: "${text}"`);
            setMessages(prevMessages => [...prevMessages, newMessage]);
        }
    };

    // 组件初始化
    useEffect(() => {
        initWebSocket();
        initializeAudio();

        // Android 播放器将在首次播放时自动初始化（按需初始化）
        // 不提前预热，避免干扰录音状态

        return () => {
            // 清理音频资源
            androidPCMStreamServiceRef.current?.uninitializeAudio();
            if (wsServiceRef.current) {
                wsServiceRef.current.close();
            }
            setIsRecording(false);
        };
    }, []);

    const audioStats = androidPCMStreamServiceRef.current?.getStats();

    return (
        <View style={styles.container}>
            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>连接状态: {connectionStatus}</Text>
                <Text style={styles.statusText}>已收集音频块: {audioStats?.audioChunksCount}</Text>
                <Text style={styles.statusText}>已发送数据包: {audioStats?.sendCount}</Text>
                <Text style={styles.statusText}>临时缓冲区: {audioStats?.tempBufferLength}/{AUDIO_CONFIG.STREAM_THRESHOLD_SAMPLES}</Text>
                <Text style={styles.statusText}>流式处理: {audioStats?.isStreaming ? '🔄 活跃' : '⏸️ 暂停'}</Text>
                <Text style={styles.statusText}>已接收数据: {receivedDataCount}</Text>
                <Text style={styles.statusText}>播放状态: {audioStats?.isPlaying ? '🔊 正在播放' : '静默'}</Text>
                <Text style={styles.statusText}>反馈控制: {audioStats?.feedbackControlStatus}</Text>
                <Text style={styles.statusText}>语音检测: {audioStats?.isSpeechDetected ? '🎤 用户说话中' : '静默'}</Text>
                <Text style={styles.statusText}>消息数量: {messages.length}</Text>
                {((audioStats?.playbackTotalDuration ?? 0) > 0) && (
                    <>
                        <Text style={styles.statsTitle}>播放统计</Text>
                        <Text style={styles.statusText}>
                            播放进度: {audioStats?.playbackPlayedDuration?.toFixed(2)} / {audioStats?.playbackTotalDuration?.toFixed(2)} 秒
                        </Text>
                        <Text style={styles.statusText}>
                            完成度: {((audioStats?.playbackProgress ?? 0) * 100).toFixed(1)}%
                        </Text>
                    </>
                )}
            </View>

            {/* 麦克风控制按钮 */}
            <TouchableOpacity
                style={[styles.button, styles.micButton, isRecording ? styles.micActiveButton : styles.micInactiveButton]}
                onPress={toggleRecording}
                disabled={!isConnected}
            >
                <Text style={[styles.buttonText, styles.micButtonText]}>
                    {isRecording ? '🎤 停止录音' : '🎤 开始录音'}
                </Text>
            </TouchableOpacity>

            {/* 消息显示区域 */}
            <View style={styles.messagesContainer}>
                <View style={styles.messagesHeader}>
                    <Text style={styles.messagesTitle}>消息记录:</Text>
                    <View style={styles.messageButtonsContainer}>
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={clearMessages}
                            disabled={messages.length === 0}
                        >
                            <Text style={[styles.clearButtonText, { opacity: messages.length === 0 ? 0.5 : 1 }]}>
                                清空
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView style={styles.messagesScrollView} showsVerticalScrollIndicator={false}>
                    {messages.length === 0 ? (
                        <Text style={styles.noMessagesText}>暂无消息</Text>
                    ) : (
                        messages.map((message) => (
                            <View key={message.id} style={[
                                styles.messageItem,
                                message.sender === 'gemini' ? styles.geminiMessage :
                                    message.sender === 'system' ? styles.systemMessage : styles.userMessage
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    message.sender === 'gemini' ? styles.geminiMessageText :
                                        message.sender === 'system' ? styles.systemMessageText : styles.userMessageText
                                ]}>
                                    {message.text}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
    },
    statusContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusText: {
        fontSize: 16,
        marginBottom: 5,
        color: '#666',
    },
    statsTitle: {
        fontSize: 16,
        marginTop: 10,
        marginBottom: 5,
        fontWeight: '600',
        color: '#333',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    sessionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    sessionButton: {
        flex: 0.48,
        backgroundColor: '#FF9500',
    },
    micButton: {
        paddingVertical: 20,
        marginBottom: 30,
    },
    micActiveButton: {
        backgroundColor: '#FF3B30',
    },
    micInactiveButton: {
        backgroundColor: '#007AFF',
    },
    micButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    messagesContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 20,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    messagesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    messagesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    messageButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#ff6b6b',
        borderRadius: 6,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    messagesScrollView: {
        maxHeight: 150,
        padding: 10,
    },
    noMessagesText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        padding: 20,
    },
    messageItem: {
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        maxWidth: '85%',
    },
    geminiMessage: {
        backgroundColor: '#e3f2fd',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    userMessage: {
        backgroundColor: '#f3e5f5',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    systemMessage: {
        backgroundColor: '#fff3e0',
        alignSelf: 'center',
        borderRadius: 8,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 18,
    },
    geminiMessageText: {
        color: '#1976d2',
    },
    userMessageText: {
        color: '#7b1fa2',
    },
    systemMessageText: {
        color: '#e65100',
        fontStyle: 'italic',
    },
});

export default AudioTest;
