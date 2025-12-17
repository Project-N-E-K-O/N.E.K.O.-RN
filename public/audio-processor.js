// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        // 获取采样率信息
        const processorOptions = options.processorOptions || {};
        this.originalSampleRate = processorOptions.originalSampleRate || 48000;
        this.targetSampleRate = processorOptions.targetSampleRate || 16000;

        // 计算重采样比率
        this.resampleRatio = this.targetSampleRate / this.originalSampleRate;

        // 创建缓冲区 - 使用较小的缓冲区以实现低延迟
        // 128帧在16kHz下约为8ms，在48kHz下约为2.7ms
        // 我们使用512帧的缓冲区，在16kHz下约为32ms
        this.bufferSize = 512;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // 用于重采样的临时缓冲区
        this.tempBuffer = [];

        console.log(`AudioProcessor初始化: 原始采样率=${this.originalSampleRate}Hz, 目标采样率=${this.targetSampleRate}Hz`);
    }

    process(inputs, outputs, parameters) {
        // 获取输入数据 (假设是单声道)
        const input = inputs[0][0];

        if (!input || input.length === 0) {
            return true;
        }

        // 将输入数据添加到临时缓冲区
        this.tempBuffer = this.tempBuffer.concat(Array.from(input));

        // 当临时缓冲区足够大时，执行重采样
        const requiredSamples = Math.ceil(this.bufferSize / this.resampleRatio);
        if (this.tempBuffer.length >= requiredSamples) {
            // 执行重采样
            const samplesNeeded = Math.min(requiredSamples, this.tempBuffer.length);
            const samplesToProcess = this.tempBuffer.slice(0, samplesNeeded);
            this.tempBuffer = this.tempBuffer.slice(samplesNeeded);

            // 执行重采样
            const resampledData = this.resampleAudio(samplesToProcess);

            // 将重采样后的数据转换为Int16Array
            const pcmData = new Int16Array(resampledData.length);
            for (let i = 0; i < resampledData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, resampledData[i])) * 0x7FFF;
            }

            // 发送到主线程
            this.port.postMessage(pcmData);
        }

        return true;
    }

    // 简单的线性插值重采样
    resampleAudio(audioData) {
        const inputLength = audioData.length;
        const outputLength = Math.floor(inputLength * this.resampleRatio);
        const result = new Float32Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const position = i / this.resampleRatio;
            const index = Math.floor(position);
            const fraction = position - index;

            // 线性插值
            if (index + 1 < inputLength) {
                result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
            } else {
                result[i] = audioData[index];
            }
        }

        return result;
    }
}

registerProcessor('audio-processor', AudioProcessor);
