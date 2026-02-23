"use client";

import { type ChatMessage } from "@/lib/api";

interface ChatBubbleProps {
    message: ChatMessage;
    isNew?: boolean;
}

const BotIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="10" x="3" y="11" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4M8 15h0M16 15h0" />
    </svg>
);

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    admission: { bg: "#eff6ff", text: "#1d4ed8" },
    hostel: { bg: "#f0fdf4", text: "#15803d" },
    exams: { bg: "#fefce8", text: "#a16207" },
    fees: { bg: "#fdf4ff", text: "#7e22ce" },
    emergency: { bg: "#fff1f2", text: "#be123c" },
    scholarships: { bg: "#fff7ed", text: "#c2410c" },
    general: { bg: "#f9fafb", text: "#374151" },
};

export default function ChatBubble({ message, isNew }: ChatBubbleProps) {
    const isUser = message.role === "user";
    const catColors = CATEGORY_COLORS[message.category || "general"];

    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: "0.5rem",
                animation: isNew ? "fadeInUp 0.3s ease-out" : "none",
            }}
        >
            {/* Avatar */}
            {!isUser && (
                <div
                    style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        flexShrink: 0,
                    }}
                >
                    <BotIcon />
                </div>
            )}

            {/* Bubble */}
            <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: isUser ? "flex-end" : "flex-start" }}>
                {/* Category tag (AI only) */}
                {!isUser && message.category && message.category !== "general" && (
                    <span
                        style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "999px",
                            background: catColors.bg,
                            color: catColors.text,
                        }}
                    >
                        {message.category}
                    </span>
                )}

                {/* Message with simple markdown rendering */}
                <div className={isUser ? "bubble-user" : "bubble-ai"}>
                    <div
                        style={{
                            fontSize: "0.9375rem",
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                            color: isUser ? "white" : "var(--text-primary)",
                        }}
                        dangerouslySetInnerHTML={{
                            __html: message.content
                                // Bold: **text**
                                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                // Italic: _text_
                                .replace(/_(.+?)_/g, "<em>$1</em>")
                                // Newlines
                                .replace(/\n/g, "<br/>"),
                        }}
                    />
                </div>

                {/* Meta */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                    }}
                >
                    <span>{time}</span>
                    {!isUser && message.confidence !== undefined && message.confidence > 0 && (
                        <span
                            style={{
                                padding: "0.0625rem 0.375rem",
                                borderRadius: "4px",
                                background: message.confidence > 0.75 ? "#dcfce7" : "#fef3c7",
                                color: message.confidence > 0.75 ? "#16a34a" : "#d97706",
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                            }}
                        >
                            {Math.round(message.confidence * 100)}% match
                        </span>
                    )}
                    {!isUser && message.used_fallback && (
                        <span
                            style={{
                                padding: "0.0625rem 0.375rem",
                                borderRadius: "4px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                            }}
                        >
                            AI enhanced
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Typing Indicator ───────────────────────────────────────────
const BotIconSmall = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="10" x="3" y="11" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4M8 15h0M16 15h0" />
    </svg>
);

export function TypingIndicator() {
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", animation: "fadeInUp 0.3s ease-out" }}>
            <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", flexShrink: 0,
            }}>
                <BotIconSmall />
            </div>
            <div className="bubble-ai" style={{ padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", height: "18px" }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                </div>
            </div>
        </div>
    );
}
