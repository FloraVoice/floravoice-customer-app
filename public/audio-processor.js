/**
 * AudioWorklet processor — runs in the audio rendering thread.
 * Accumulates Float32 samples, converts them to PCM16 (Int16),
 * and posts the buffer to the main thread for WebSocket transmission.
 *
 * Audio format: PCM16, mono, 24 kHz (OpenAI Realtime API default).
 * The backend uses OpenAI server-side VAD — stream continuously.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._chunks = [];
    this._accumulated = 0;
    // ~85 ms of audio at 24 kHz
    this._chunkSize = 2048;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    // Convert Float32 [-1, 1] → Int16 [-32768, 32767]
    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this._chunks.push(int16);
    this._accumulated += channel.length;

    if (this._accumulated >= this._chunkSize) {
      const merged = new Int16Array(this._accumulated);
      let offset = 0;
      for (const chunk of this._chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.port.postMessage(merged.buffer, [merged.buffer]);
      this._chunks = [];
      this._accumulated = 0;
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
