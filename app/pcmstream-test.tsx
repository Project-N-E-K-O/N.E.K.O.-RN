import { Asset } from 'expo-asset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type {
    OnAudioFrameEventPayload,
    OnPlaybackProgressEventPayload,
    OnPlaybackStartEventPayload,
    OnPlaybackStopEventPayload
} from 'react-native-pcm-stream';
import PCMStream from 'react-native-pcm-stream';

// 本页面演示：使用 react-native-pcm-stream 在 Android 端播放打包在本地的 nihao.pcm

const SAMPLE_RATE = 16000; // 16kHz, 16-bit, mono
const BYTES_PER_SAMPLE = 2; // PCM16LE
const CHUNK_SAMPLES = 512; // 与主页面策略一致
const CHUNK_INTERVAL_MS = Math.round((CHUNK_SAMPLES / SAMPLE_RATE) * 1000); // ~32ms

export default function PCMStreamTest() {
    const [status, setStatus] = useState<string>('未加载');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordedData, setRecordedData] = useState<Uint8Array | null>(null);
    
    // 新增：播放统计状态
    const [playbackState, setPlaybackState] = useState<string>('IDLE');
    const [totalDuration, setTotalDuration] = useState<number>(0);
    const [playedDuration, setPlayedDuration] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);

    const audioBufferRef = useRef<Uint8Array | null>(null);
    const playOffsetRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // 录音相关状态
    const recordedChunksRef = useRef<Uint8Array[]>([]);
    const isRecordingRef = useRef<boolean>(false);
    const last_ts = useRef<number>(0);
    const delta_ts = useRef<number>(0);

    // 预加载 PCM 资源
    const loadPCMAsset = useCallback(async () => {
        try {
            setStatus('加载中...');
            // 确保资源路径存在：项目根目录应有 assets/nihao.pcm
            const asset = Asset.fromModule(require('../assets/nihao.pcm'));
            await asset.downloadAsync();

            // 将打包资源读取为 ArrayBuffer
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            audioBufferRef.current = new Uint8Array(arrayBuffer);
            setStatus(`已加载 (${arrayBuffer.byteLength} 字节)`);
        } catch (e) {
            console.error('加载本地PCM失败:', e);
            setStatus('加载失败');
            Alert.alert('错误', '加载本地PCM失败');
        }
    }, []);

    // 录音和播放事件监听
    useEffect(() => {
        if (Platform.OS === 'android') {
            console.log('🔧 设置事件监听器');
            
            // 录音事件
            const audioFrameSubscription = PCMStream.addListener('onAudioFrame', (event: OnAudioFrameEventPayload) => {
                if (isRecordingRef.current && event.pcm) {
                    recordedChunksRef.current.push(new Uint8Array(event.pcm));
                    if (event.ts) {
                        delta_ts.current = event.ts - last_ts.current;
                        last_ts.current = event.ts;
                    }
                    console.log(`🎤 录音数据: ${event.pcm.length} 字节, 总块数: ${recordedChunksRef.current.length}, 间隔: ${delta_ts.current}ms`);
                }
            });

            // 播放开始事件
            const playbackStartSubscription = PCMStream.addListener('onPlaybackStart', (event: OnPlaybackStartEventPayload) => {
                console.log('▶️ 播放开始, 状态:', event.state);
                setIsPlaying(true);
                setPlaybackState(event.state);
            });

            // 播放停止/完成事件
            const playbackStopSubscription = PCMStream.addListener('onPlaybackStop', (event: OnPlaybackStopEventPayload) => {
                console.log('⏹️ 播放完成, 状态:', event.state);
                console.log(`📊 最终统计 - 总时长: ${event.totalDuration.toFixed(2)}秒, 播放时长: ${event.playedDuration.toFixed(2)}秒`);
                setIsPlaying(false);
                setPlaybackState(event.state);
                setStatus(`播放完成 (${event.playedDuration.toFixed(2)}/${event.totalDuration.toFixed(2)}秒)`);
            });

            // 播放暂停事件
            const playbackPausedSubscription = PCMStream.addListener('onPlaybackPaused', (event: any) => {
                console.log('⏸️ 播放暂停, 状态:', event.state);
                setPlaybackState(event.state);
            });

            // 播放恢复事件
            const playbackResumedSubscription = PCMStream.addListener('onPlaybackResumed', (event: any) => {
                console.log('▶️ 播放恢复, 状态:', event.state);
                setPlaybackState(event.state);
            });

            // 播放进度更新事件（每秒触发）
            const playbackProgressSubscription = PCMStream.addListener('onPlaybackProgress', (event: OnPlaybackProgressEventPayload) => {
                setPlayedDuration(event.playedDuration);
                setTotalDuration(event.totalDuration);
                setProgress(event.progress);
                console.log(`⏱️ 播放进度: ${event.playedDuration.toFixed(2)}/${event.totalDuration.toFixed(2)}秒 (${(event.progress * 100).toFixed(1)}%)`);
            });

            // 错误事件
            const errorSubscription = PCMStream.addListener('onError', (event) => {
                console.error('❌ PCMStream错误:', event);
                setStatus(`错误: ${event.message}`);
            });

            return () => {
                console.log('🧹 清理事件监听器');
                audioFrameSubscription?.remove();
                playbackStartSubscription?.remove();
                playbackStopSubscription?.remove();
                playbackPausedSubscription?.remove();
                playbackResumedSubscription?.remove();
                playbackProgressSubscription?.remove();
                errorSubscription?.remove();
            };
        }
    }, []);

    useEffect(() => {
        loadPCMAsset();
        return () => {
            // 清理播放
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (Platform.OS === 'android') {
                PCMStream.stopPlayback();
                PCMStream.stopRecording();
            }
        };
    }, [loadPCMAsset]);

    /**
     * 手动停止播放
     * ⚠️ 注意：此函数仅用于用户主动停止播放的场景
     * 不应该在数据推送完成时调用，应该等待 native 播放器自动完成并通过事件通知
     */
    const stopPlayback = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (Platform.OS === 'android') {
            PCMStream.stopPlayback(); // 调用 stopAndReset()，清空队列并停止播放
        }
        setIsPlaying(false);
        setStatus('已手动停止');
    }, []);

    // 将整段 PCM 一次性传给原生，由原生切片入队（更高效）
    const appendFullBuffer = useCallback((repeat: number = 1) => {
        if (Platform.OS !== 'android') {
            Alert.alert('提示', '当前示例仅在 Android 上通过原生 PCM 播放');
            return;
        }
        const buffer = audioBufferRef.current;
        if (!buffer || buffer.byteLength === 0) {
            Alert.alert('错误', 'PCM 数据未就绪');
            return;
        }
        // 若未初始化过播放器，则先初始化
        if (!isPlaying) {
            try {
                PCMStream.initPlayer(SAMPLE_RATE);
            } catch (e) {
                console.warn('初始化播放器失败:', e);
            }
            setIsPlaying(true);
            setStatus('播放中(手动追加整段)');
        }
        for (let r = 0; r < repeat; r++) {
            try {
                PCMStream.playPCMChunk(buffer);
            } catch (e) {
                console.warn('推送整段PCM失败:', e);
                return;
            }
        }
        setStatus(`已追加整段 x${repeat}`);
    }, [isPlaying]);

    const startPlayback = useCallback(async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('提示', '当前示例仅在 Android 上通过原生 PCM 播放');
            return;
        }
        const data = audioBufferRef.current;
        if (!data || data.byteLength === 0) {
            Alert.alert('错误', 'PCM 数据未就绪');
            return;
        }

        try {
            PCMStream.initPlayer(SAMPLE_RATE);
            console.log('✅ 播放器已初始化');
        } catch (e) {
            console.warn('初始化播放器失败:', e);
        }

        // 重置偏移，从头播放
        playOffsetRef.current = 0;
        setStatus('正在推送数据...');

        // 以固定帧率分片推送，确保平滑播放
        const bytesPerChunk = CHUNK_SAMPLES * BYTES_PER_SAMPLE;
        timerRef.current = setInterval(() => {
            const buffer = audioBufferRef.current;
            if (!buffer) {
                // 数据丢失，清理定时器
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                return;
            }
            
            const start = playOffsetRef.current;
            const end = Math.min(start + bytesPerChunk, buffer.byteLength);
            
            if (start >= buffer.byteLength) {
                // ✅ 正确：推送完成，清理定时器，等待 native 播放器自己完成
                console.log('✅ 数据推送完成，等待 native 播放器完成播放...');
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                setStatus('数据推送完成，播放中...');
                return;
            }
            
            const chunk = buffer.subarray(start, end);
            playOffsetRef.current = end;
            
            try {
                PCMStream.playPCMChunk(chunk);
            } catch (e) {
                console.warn('推送PCM分片失败:', e);
                // 推送失败，清理定时器
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            }
        }, Math.max(1, CHUNK_INTERVAL_MS));
    }, []);

    // 开始录音
    const startRecording = useCallback(() => {
        if (Platform.OS !== 'android') {
            Alert.alert('提示', '当前示例仅在 Android 上通过原生 PCM 录音');
            return;
        }

        try {
            console.log('🎤 准备开始录音...');
            
            // 清空之前的录音数据
            recordedChunksRef.current = [];
            setRecordedData(null);
            
            console.log('📋 调用PCMStream.startRecording(48000, 1536, 16000)');
            // 开始录音：48kHz采样，1536帧，重采样到16kHz
            PCMStream.startRecording(48000, 1536, 16000);
            
            isRecordingRef.current = true;
            setIsRecording(true);
            setStatus('录音中...');
            
            console.log('✅ 录音已启动，等待onAudioFrame事件...');
            
            // 添加一个延迟检查，看看是否有事件
            setTimeout(() => {
                console.log('🔍 5秒后检查 - 录音状态:', isRecordingRef.current, '已接收数据块:', recordedChunksRef.current.length);
            }, 5000);
            
        } catch (e) {
            console.error('开始录音失败:', e);
            Alert.alert('错误', '开始录音失败');
        }
    }, []);

    // 停止录音
    const stopRecording = useCallback(() => {
        if (Platform.OS !== 'android') return;

        try {
            PCMStream.stopRecording();
            isRecordingRef.current = false;
            setIsRecording(false);
            
            // 合并录音数据
            const chunks = recordedChunksRef.current;
            if (chunks.length > 0) {
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const mergedData = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    mergedData.set(chunk, offset);
                    offset += chunk.length;
                }
                
                setRecordedData(mergedData);
                setStatus(`录音完成 (${mergedData.length} 字节)`);
                console.log(`🎤 录音完成: ${chunks.length} 个数据块, 总计 ${mergedData.length} 字节`);
            } else {
                setStatus('录音完成 (无数据)');
            }
        } catch (e) {
            console.error('停止录音失败:', e);
            Alert.alert('错误', '停止录音失败');
        }
    }, []);

    // 播放录音数据
    const playRecordedData = useCallback(() => {
        if (Platform.OS !== 'android') {
            Alert.alert('提示', '当前示例仅在 Android 上通过原生 PCM 播放');
            return;
        }

        const data = recordedData;
        if (!data || data.byteLength === 0) {
            Alert.alert('错误', '没有录音数据可播放');
            return;
        }

        try {
            PCMStream.initPlayer(SAMPLE_RATE);
            setStatus('正在推送录音数据...');

            // 以固定帧率分片推送录音数据
            const bytesPerChunk = CHUNK_SAMPLES * BYTES_PER_SAMPLE;
            let offset = 0;
            
            const playTimer = setInterval(() => {
                if (offset >= data.byteLength) {
                    // ✅ 正确：推送完成，清理定时器，等待 native 播放器自己完成
                    console.log('✅ 录音数据推送完成，等待 native 播放器完成播放...');
                    clearInterval(playTimer);
                    setStatus('录音数据推送完成，播放中...');
                    return;
                }
                
                const end = Math.min(offset + bytesPerChunk, data.byteLength);
                const chunk = data.subarray(offset, end);
                offset = end;
                
                try {
                    PCMStream.playPCMChunk(chunk);
                } catch (e) {
                    console.warn('播放录音分片失败:', e);
                    clearInterval(playTimer);
                    setStatus('播放失败');
                }
            }, Math.max(1, CHUNK_INTERVAL_MS));

        } catch (e) {
            console.error('播放录音失败:', e);
            Alert.alert('错误', '播放录音失败');
        }
    }, [recordedData]);

    // 获取播放统计信息
    const getPlaybackStats = useCallback(() => {
        if (Platform.OS !== 'android') {
            Alert.alert('提示', '当前示例仅在 Android 上可用');
            return;
        }

        try {
            const stats = PCMStream.getPlaybackStats();
            console.log('📊 播放统计:', stats);
            
            Alert.alert(
                '播放统计信息',
                `状态: ${stats.state}\n` +
                `正在播放: ${stats.isPlaying ? '是' : '否'}\n` +
                `总时长: ${stats.totalDuration.toFixed(2)}秒\n` +
                `已播放: ${stats.playedDuration.toFixed(2)}秒\n` +
                `剩余: ${stats.remainingDuration.toFixed(2)}秒\n` +
                `进度: ${(stats.progress * 100).toFixed(1)}%`
            );
        } catch (e) {
            console.error('获取播放统计失败:', e);
            Alert.alert('错误', '获取播放统计失败');
        }
    }, []);

    return (
        <View style={styles.container}>
            {/* Android 使用模块级播放器，无需渲染视图 */}
            <Text style={styles.title}>PCMStream 录音播放测试</Text>
            <Text style={styles.desc}>资源: assets/nihao.pcm</Text>
            <Text style={styles.status}>状态: {status}</Text>
            
            {/* 播放统计信息显示 */}
            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>播放统计</Text>
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>播放状态:</Text>
                    <Text style={[styles.statsValue, playbackState === 'PLAYING' && styles.statsValueActive]}>
                        {playbackState}
                    </Text>
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>播放进度:</Text>
                    <Text style={styles.statsValue}>
                        {playedDuration.toFixed(2)} / {totalDuration.toFixed(2)} 秒
                    </Text>
                </View>
                {totalDuration > 0 && (
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                        <Text style={styles.progressText}>{(progress * 100).toFixed(1)}%</Text>
                    </View>
                )}
            </View>
            
            {recordedData && (
                <Text style={styles.recordedInfo}>
                    录音数据: {recordedData.length} 字节 ({(recordedData.length / (SAMPLE_RATE * BYTES_PER_SAMPLE)).toFixed(1)}秒)
                </Text>
            )}

            {/* 本地文件播放区域 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>本地文件播放</Text>
                <TouchableOpacity style={[styles.button, styles.play]} onPress={startPlayback}>
                    <Text style={styles.buttonText}>开始播放</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.append]} onPress={() => appendFullBuffer(1)}>
                    <Text style={styles.buttonText}>追加整段</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.stop]} onPress={stopPlayback} disabled={!isPlaying}>
                    <Text style={styles.buttonText}>停止播放</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.stats]} onPress={getPlaybackStats}>
                    <Text style={styles.buttonText}>获取统计</Text>
                </TouchableOpacity>
            </View>

            {/* 录音区域 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>录音功能</Text>
                <TouchableOpacity 
                    style={[styles.button, styles.record]} 
                    onPress={startRecording} 
                    disabled={isRecording || isPlaying}
                >
                    <Text style={styles.buttonText}>开始录音</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.stopRecord]} 
                    onPress={stopRecording} 
                    disabled={!isRecording}
                >
                    <Text style={styles.buttonText}>停止录音</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.playRecord]} 
                    onPress={playRecordedData} 
                    disabled={!recordedData || isPlaying || isRecording}
                >
                    <Text style={styles.buttonText}>播放录音</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
        color: '#333',
    },
    desc: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 8,
    },
    status: {
        textAlign: 'center',
        color: '#444',
        marginBottom: 15,
    },
    statsContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsLabel: {
        fontSize: 14,
        color: '#666',
    },
    statsValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    statsValueActive: {
        color: '#34C759',
    },
    progressBarContainer: {
        marginTop: 10,
        height: 30,
        backgroundColor: '#e0e0e0',
        borderRadius: 15,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#34C759',
        borderRadius: 15,
    },
    progressText: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        zIndex: 1,
    },
    recordedInfo: {
        textAlign: 'center',
        color: '#007AFF',
        marginBottom: 15,
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        marginBottom: 30,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 15,
        color: '#333',
    },
    button: {
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    play: {
        backgroundColor: '#34C759',
    },
    stop: {
        backgroundColor: '#FF3B30',
    },
    append: {
        backgroundColor: '#007AFF',
    },
    record: {
        backgroundColor: '#FF9500',
    },
    stopRecord: {
        backgroundColor: '#FF3B30',
    },
    playRecord: {
        backgroundColor: '#5856D6',
    },
    stats: {
        backgroundColor: '#00C7BE',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});


