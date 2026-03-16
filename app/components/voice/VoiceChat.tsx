import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useVoiceChat, type TranscriptItem } from "~/hooks/useVoiceChat";

// ─── Icons (inline SVG to avoid adding another dependency) ───────────────────

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakingWave() {
  return (
    <div className="flex items-center gap-0.5" aria-label="Agent speaking">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block w-0.5 rounded-full bg-emerald-500"
          style={{
            height: `${8 + (i % 3) * 4}px`,
            animation: `voiceBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function TranscriptLine({ item }: { item: TranscriptItem }) {
  const time = item.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Try to detect role prefix like "assistant:" or "user:" in the item string
  let role = "Agent";
  let content = item.content;
  const lower = content.toLowerCase();
  if (lower.startsWith("user:")) {
    role = "You";
    content = content.slice(5).trim();
  } else if (lower.startsWith("assistant:") || lower.startsWith("agent:")) {
    role = "Agent";
    content = content.replace(/^(assistant|agent):/i, "").trim();
  }

  const isUser = role === "You";

  return (
    <div className={cn("flex flex-col gap-0.5", isUser ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium">{role}</span>
        <span>·</span>
        <span>{time}</span>
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {content}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VoiceChat() {
  const {
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
  } = useVoiceChat();

  const [textInput, setTextInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom on new messages
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const handleSendText = () => {
    const trimmed = textInput.trim();
    if (!trimmed || !isConnected) return;
    sendMessage(trimmed);
    setTextInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Flower logo mark */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-6 text-emerald-500"
          >
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <ellipse cx="12" cy="6" rx="2" ry="3.5" fill="currentColor" opacity="0.7" />
            <ellipse cx="12" cy="18" rx="2" ry="3.5" fill="currentColor" opacity="0.7" />
            <ellipse cx="6" cy="12" rx="3.5" ry="2" fill="currentColor" opacity="0.7" />
            <ellipse cx="18" cy="12" rx="3.5" ry="2" fill="currentColor" opacity="0.7" />
          </svg>
          <span className="font-semibold tracking-tight">FloraVoice</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <SpeakingWave />
              <span>Speaking</span>
            </div>
          )}

          {/* Connection status dot */}
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
            )}
            title={isConnected ? "Connected" : "Disconnected"}
          />

          {/* Connect / Disconnect */}
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            onClick={isConnected ? disconnect : connect}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex shrink-0 items-start gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <button
            onClick={dismissError}
            className="mt-0.5 opacity-70 hover:opacity-100"
            aria-label="Dismiss error"
          >
            <XIcon />
          </button>
        </div>
      )}

      {/* ── Transcript ── */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-label="Conversation transcript"
        aria-live="polite"
      >
        {transcript.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-10 opacity-20"
            >
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              <ellipse cx="12" cy="6" rx="2" ry="3.5" fill="currentColor" />
              <ellipse cx="12" cy="18" rx="2" ry="3.5" fill="currentColor" />
              <ellipse cx="6" cy="12" rx="3.5" ry="2" fill="currentColor" />
              <ellipse cx="18" cy="12" rx="3.5" ry="2" fill="currentColor" />
            </svg>
            <p className="max-w-[200px] text-sm">
              {isConnected
                ? "Say something or type a message to begin."
                : "Connect to start a conversation."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transcript.map((item) => (
              <TranscriptLine key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="shrink-0 border-t border-border bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-end gap-2">
          {/* Mic toggle */}
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={toggleListening}
            disabled={!isConnected}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={cn(
              "shrink-0 transition-colors",
              isListening && "bg-rose-500 hover:bg-rose-600 border-rose-500"
            )}
          >
            {isListening ? <MicIcon className="animate-pulse" /> : <MicOffIcon />}
          </Button>

          {/* Text input */}
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected ? "Type a message… (Enter to send)" : "Connect first"
            }
            disabled={!isConnected}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "min-h-[36px] max-h-[120px] overflow-y-auto"
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />

          {/* Send button */}
          <Button
            variant="default"
            size="icon"
            onClick={handleSendText}
            disabled={!isConnected || !textInput.trim()}
            aria-label="Send message"
            className="shrink-0"
          >
            <SendIcon />
          </Button>
        </div>

        {/* Listening status hint */}
        {isListening && (
          <p className="mt-1.5 text-center text-xs text-rose-500 dark:text-rose-400">
            Microphone active — audio is being sent
          </p>
        )}
      </div>

      {/* ── CSS for the speaking wave animation ── */}
      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}
