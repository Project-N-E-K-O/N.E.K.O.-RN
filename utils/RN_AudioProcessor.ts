// RN_AudioProcessor.ts - React Native Android 音频处理器
import { Buffer } from 'buffer';

interface AudioProcessorOptions {
    originalSampleRate?: number;
    targetSampleRate?: number;
    bufferSize?: number;
    onAudioFrame?: (pcmData: Int16Array) => void;
}

export default class AudioProcessor {
    private resampleRatio: number;
    private bufferSize: number;
    private tempBuffer: number[];
    private onAudioFrame?: (pcmData: Int16Array) => void;
    private isDestroyed: boolean = false;

    constructor(options: AudioProcessorOptions = {}) {
        const {
            originalSampleRate = 48000,
            targetSampleRate = 16000,
            bufferSize = 512,
            onAudioFrame
        } = options;

        this.resampleRatio = targetSampleRate / originalSampleRate;
        this.bufferSize = bufferSize;
        this.tempBuffer = [];
        this.onAudioFrame = onAudioFrame;

        console.log(`RN_AudioProcessor 初始化: 原始采样率=${originalSampleRate}Hz, 目标采样率=${targetSampleRate}Hz, 缓冲区=${bufferSize}帧`);
    }

    // 处理 base64 PCM 输入（Android 优化版）
    pushAudioChunk(base64Data: string): void {
        if (this.isDestroyed || !base64Data || !this.onAudioFrame) return;

        try {
            const pcm = this.base64ToPCM(base64Data);
            if (!pcm || pcm.length === 0) return;

            // 转成 Float32 [-1,1]，Android 优化：避免过度归一化
            const float32 = Float32Array.from(pcm, x => Math.max(-1, Math.min(1, x / 32768)));
            this.tempBuffer = this.tempBuffer.concat(Array.from(float32));

            const requiredSamples = Math.ceil(this.bufferSize / this.resampleRatio);

            // Android 优化：限制处理循环次数，避免阻塞主线程
            let processCount = 0;
            const maxProcessCount = 10; // 限制单次处理的最大循环次数

            while (this.tempBuffer.length >= requiredSamples && processCount < maxProcessCount) {
                const samplesToProcess = this.tempBuffer.slice(0, requiredSamples);
                this.tempBuffer = this.tempBuffer.slice(requiredSamples);

                if (samplesToProcess.length === 0) break;

                // 重采样并转成 Int16 PCM
                const resampledData = this.resampleAudio(samplesToProcess);
                if (!resampledData || resampledData.length === 0) {
                    processCount++;
                    continue;
                }

                const pcmData = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                    // Android 优化：确保数值在有效范围内
                    const clampedValue = Math.max(-1, Math.min(1, resampledData[i]));
                    pcmData[i] = Math.round(clampedValue * 0x7FFF);
                }

                this.onAudioFrame(pcmData);
                processCount++;
            }

            // Android 优化：如果缓冲区过大，清理部分数据避免内存泄漏
            if (this.tempBuffer.length > requiredSamples * 10) {
                this.tempBuffer = this.tempBuffer.slice(-requiredSamples * 5);
            }
        } catch (error) {
            console.error('RN_AudioProcessor pushAudioChunk 错误:', error);
        }
    }

    // base64 → Int16Array（Android 优化版）
    private base64ToPCM(base64: string): Int16Array {
        try {
            if (!base64 || base64.length % 4 !== 0) return new Int16Array(0);

            const buffer = Buffer.from(base64, 'base64');
            if (!buffer || buffer.length === 0 || buffer.length % 2 !== 0) return new Int16Array(0);

            // Android 优化：使用更高效的 ArrayBuffer 创建方式
            const result = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

            // Android 优化：验证数据完整性
            if (result.length === 0) return new Int16Array(0);

            return result;
        } catch (error) {
            console.error('RN_AudioProcessor base64ToPCM 错误:', error);
            return new Int16Array(0);
        }
    }

    // 线性插值重采样（Android 优化版）
    private resampleAudio(audioData: number[]): Float32Array {
        try {
            if (!audioData || audioData.length === 0 || this.resampleRatio <= 0) {
                return new Float32Array(0);
            }

            const inputLength = audioData.length;
            const outputLength = Math.floor(inputLength * this.resampleRatio);
            if (outputLength <= 0) return new Float32Array(0);

            const result = new Float32Array(outputLength);

            // Android 优化：使用更高效的循环和数值处理
            for (let i = 0; i < outputLength; i++) {
                const position = i / this.resampleRatio;
                const index = Math.floor(position);
                const fraction = position - index;

                if (index + 1 < inputLength) {
                    // 线性插值，Android 优化：减少函数调用
                    const val1 = audioData[index];
                    const val2 = audioData[index + 1];
                    result[i] = val1 + (val2 - val1) * fraction;
                } else if (index < inputLength) {
                    result[i] = audioData[index];
                } else {
                    result[i] = 0;
                }
            }

            return result;
        } catch (error) {
            console.error('RN_AudioProcessor resampleAudio 错误:', error);
            return new Float32Array(0);
        }
    }

    // 清空缓冲区（Android 优化版）
    clearBuffer(): void {
        this.tempBuffer = [];
    }

    // 设置音频帧回调（Android 优化版）
    setAudioFrameCallback(callback?: (pcmData: Int16Array) => void): void {
        this.onAudioFrame = callback;
    }

    // 获取缓冲区状态（Android 调试用）
    getBufferStatus(): { length: number; bufferSize: number; isDestroyed: boolean } {
        return {
            length: this.tempBuffer.length,
            bufferSize: this.bufferSize,
            isDestroyed: this.isDestroyed
        };
    }

    // 销毁处理器（Android 优化版）
    destroy(): void {
        this.isDestroyed = true;
        this.tempBuffer = [];
        this.onAudioFrame = undefined;
    }
}
