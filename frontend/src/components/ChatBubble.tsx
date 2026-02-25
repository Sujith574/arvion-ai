"use client";

import { useState } from "react";
import { type ChatMessage, sendChatFeedback } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

const FeedbackIcon = ({ type, active }: { type: "up" | "down", active?: boolean }) => {
    if (type === "up") {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
    );
};

export default function ChatBubble({ message, isNew }: ChatBubbleProps) {
    const params = useParams();
    const slug = params?.slug as string;
    const { token } = useStore();
    const [rating, setRating] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isUser = message.role === "user";
    const catColors = CATEGORY_COLORS[message.category || "general"];

    const handleFeedback = async (val: number) => {
        if (rating !== null || isSubmitting || !message.query_id) return;

        setIsSubmitting(true);
        try {
            await sendChatFeedback({
                query_id: message.query_id,
                rating: val,
                university_slug: slug,
            }, token || undefined);
            setRating(val);
        } catch (err) {
            console.error("[Feedback] Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.3
            }}
            style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: "0.5rem",
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

                    {/* Feedback Buttons */}
                    {!isUser && message.query_id && (
                        <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                            <button
                                onClick={() => handleFeedback(1)}
                                className="btn-ghost"
                                style={{
                                    padding: "4px",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "4px",
                                    color: rating === 1 ? "#16a34a" : "var(--text-muted)",
                                    opacity: rating !== null && rating !== 1 ? 0.3 : 1
                                }}
                                disabled={rating !== null || isSubmitting}
                            >
                                <FeedbackIcon type="up" active={rating === 1} />
                            </button>
                            <button
                                onClick={() => handleFeedback(-1)}
                                className="btn-ghost"
                                style={{
                                    padding: "4px",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "4px",
                                    color: rating === -1 ? "#dc2626" : "var(--text-muted)",
                                    opacity: rating !== null && rating !== -1 ? 0.3 : 1
                                }}
                                disabled={rating !== null || isSubmitting}
                            >
                                <FeedbackIcon type="down" active={rating === -1} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}
        >
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
        </motion.div>
    );
}
