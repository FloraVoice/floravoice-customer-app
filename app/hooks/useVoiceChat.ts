import { useState, useRef, useCallback } from "react";

const WS_URL = "ws://localhost:8000/ws";
const SAMPLE_RATE = 24_000;
// Silence gap after last audio packet before we declare the agent done speaking.
const SPEAKING_TIMEOUT_MS = 600;

export interface TranscriptItem {
  id: string;
  content: string;
  timestamp: Date;
}

export function useVoiceChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Audio context ────────────────────────────────────────────────────────

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    return audioCtxRef.current;
  }, []);

  // ─── Playback ─────────────────────────────────────────────────────────────

  const scheduleAudio = useCallback(
    (buffer: ArrayBuffer) => {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const int16 = new Int16Array(buffer);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32_768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Schedule seamlessly after the previous chunk.
      const startAt = Math.max(
        ctx.currentTime + 0.05,
        nextPlayTimeRef.current
      );
      source.start(startAt);
      nextPlayTimeRef.current = startAt + audioBuffer.duration;

      // Speaking indicator
      setIsSpeaking(true);
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = setTimeout(
        () => setIsSpeaking(false),
        SPEAKING_TIMEOUT_MS
      );
    },
    [getAudioContext]
  );

  // ─── Microphone capture ───────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      mediaStreamRef.current = stream;

      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      await ctx.audioWorklet.addModule("/audio-processor.js");

      const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(workletNode);

      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
    }
  }, [isListening, getAudioContext]);

  const stopListening = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    setIsListening(false);
  }, []);

  // ─── WebSocket ────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setError(null);
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsSpeaking(false);
      stopListening();
    };

    ws.onerror = () => {
      setError("WebSocket error — is the server running at " + WS_URL + "?");
    };

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        scheduleAudio(event.data);
        return;
      }

      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "history_added") {
          setTranscript((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              content: String(msg.item),
              timestamp: new Date(),
            },
          ]);
        } else if (msg.type === "error") {
          setError(String(msg.error));
        }
      } catch {
        // non-JSON text — ignore
      }
    };
  }, [scheduleAudio, stopListening]);

  const disconnect = useCallback(() => {
    stopListening();
    wsRef.current?.close();
    wsRef.current = null;
    nextPlayTimeRef.current = 0;
  }, [stopListening]);

  // ─── Text message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback((content: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "message", content }));
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    connect,
    disconnect,
    toggleListening,
    sendMessage,
    dismissError,
  };
}
