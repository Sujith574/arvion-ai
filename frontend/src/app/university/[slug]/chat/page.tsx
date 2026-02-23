"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatBubble, { TypingIndicator } from "@/components/ChatBubble";
import { sendChatMessage, type ChatMessage } from "@/lib/api";
import { useStore } from "@/store/useStore";

const CATEGORIES = [
    { id: null, label: "All", emoji: "💬" },
    { id: "admission", label: "Admission", emoji: "🎓" },
    { id: "hostel", label: "Hostel", emoji: "🏠" },
    { id: "exams", label: "Exams", emoji: "📝" },
    { id: "fees", label: "Fees", emoji: "💳" },
    { id: "emergency", label: "Emergency", emoji: "🚨" },
    { id: "scholarships", label: "Scholarships", emoji: "🏆" },
];

const QUICK_QUESTIONS: Record<string, string[]> = {
    all: ["What programs does LPU offer?", "What are hostel fees?", "How to apply for admission?"],
    admission: ["What is the last date to apply?", "What documents are needed?", "What is the merit cutoff?"],
    hostel: ["What are the hostel fee ranges?", "Is AC hostel available?", "How do I book a hostel room?"],
    exams: ["When is the exam schedule released?", "How to apply for re-exam?", "What is the passing criteria?"],
    fees: ["What is the tuition fee for B.Tech?", "Is there an EMI option for fees?", "How to get a fee receipt?"],
    emergency: ["I have a medical emergency", "I lost my ID card", "There is a hostel issue"],
    scholarships: ["What scholarships are available?", "How to apply for LPU scholarship?", "Merit scholarship criteria?"],
};

const icons = {
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>,
    back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>,
    memory: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>,
};

export default function ChatPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    const { messages, isLoading, addMessage, setLoading, clearMessages, sessionId, setCategoryFilter, categoryFilter, token, userId, isAuthenticated, universities } = useStore();

    const [input, setInput] = useState("");
    const [cat, setCat] = useState<string | null>(searchParams.get("cat") || categoryFilter);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const didInit = useRef(false);

    // Add welcome message on first load (ref guard prevents Strict Mode double-fire)
    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;

        // Match the university name from store or fallback to title-cased slug
        const uniName = universities?.find(u => u.slug === slug)?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (messages.length === 0) {
            addMessage({
                role: "assistant",
                content: `Hello! 👋 I'm Izra AI, your personal assistant for **${uniName}**.\n\nI can help you with admissions, hostel details, fees, scholarships, exam schedules, and emergencies. What would you like to know?`,
                timestamp: new Date().toISOString(),
                confidence: 1,
            } as ChatMessage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleCategoryChange = (newCat: string | null) => {
        setCat(newCat);
        setCategoryFilter(newCat);
        inputRef.current?.focus();
    };

    const handleSend = async (queryText?: string) => {
        const text = (queryText ?? input).trim();
        if (!text || isLoading) return;

        setInput("");

        // Add user message
        const userMsg: ChatMessage = {
            role: "user",
            content: text,
            timestamp: new Date().toISOString(),
        };
        addMessage(userMsg);
        setLoading(true);

        try {
            const res = await sendChatMessage({
                university_slug: slug,
                query: text,
                session_id: sessionId,
                category_filter: cat || undefined,
                user_id: userId || "anonymous",
            }, token || undefined);

            addMessage({
                role: "assistant",
                content: res.answer,
                category: res.category,
                confidence: res.confidence,
                sources: res.sources,
                used_fallback: res.used_fallback,
                timestamp: new Date().toISOString(),
            } as ChatMessage);
        } catch (err: any) {
            // Show a more meaningful error — check if it's an API error or a network error
            const msg = err?.message?.includes("fetch")
                ? "⚠️ Cannot reach the server. Please make sure the backend is running on port 8000."
                : err?.message || "Something went wrong. Please try again.";
            addMessage({
                role: "assistant",
                content: msg,
                timestamp: new Date().toISOString(),
                confidence: 0,
            } as ChatMessage);
            console.error("[Chat] Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const catQuestions = QUICK_QUESTIONS[(cat ?? "all")] ?? QUICK_QUESTIONS.all;

    return (
        <>
            <Navbar />
            <main
                style={{
                    paddingTop: "4rem",
                    height: "100dvh", // Dynamic Viewport Height for mobile browsers
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--bg)",
                    overflow: "hidden", // Prevent outer scroll
                }}
            >
                {/* ── Chat Header ──────────────────────────────── */}
                <div
                    style={{
                        borderBottom: "1px solid var(--border)",
                        background: "var(--surface)",
                        padding: "0.875rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        boxShadow: "var(--shadow-sm)",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                        <Link
                            href={`/university/${slug}`}
                            className="btn-ghost"
                            style={{ padding: "0.375rem 0.625rem", width: "34px", height: "34px" }}
                        >
                            {icons.back}
                        </Link>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 800,
                                fontSize: "0.875rem",
                            }}
                        >
                            AI
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Izra AI — LPU</div>
                            <div style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                                Online · AI powered
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {/* Memory indicator */}
                        {isAuthenticated && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: "0.3rem",
                                padding: "0.25rem 0.625rem", borderRadius: "999px",
                                background: "#eff6ff", color: "#2563eb", fontSize: "0.6875rem", fontWeight: 600,
                            }}>
                                {icons.memory} Memory Active
                            </div>
                        )}
                        <button
                            onClick={clearMessages}
                            className="btn-ghost"
                            style={{ width: "34px", height: "34px", padding: 0, color: "var(--text-muted)" }}
                            title="Clear chat"
                        >
                            {icons.trash}
                        </button>
                    </div>
                </div>

                {/* ── Category Filters ─────────────────────────── */}
                <div
                    style={{
                        padding: "0.625rem 1rem",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--bg-subtle)",
                        overflowX: "auto",
                        flexShrink: 0,
                        display: "flex",
                        gap: "0.375rem",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                    }}
                >
                    {CATEGORIES.map((c) => (
                        <button
                            key={String(c.id)}
                            onClick={() => handleCategoryChange(c.id)}
                            className="chip"
                            style={{
                                background: cat === c.id ? "var(--brand-600)" : "var(--surface)",
                                color: cat === c.id ? "white" : "var(--text-secondary)",
                                borderColor: cat === c.id ? "var(--brand-600)" : "var(--border)",
                                fontSize: "0.8125rem",
                            }}
                        >
                            {c.emoji} {c.label}
                        </button>
                    ))}
                </div>

                {/* ── Messages ─────────────────────────────────── */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "1rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <div style={{ maxWidth: "780px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                        {messages.map((msg, i) => (
                            <ChatBubble
                                key={i}
                                message={msg}
                                isNew={i === messages.length - 1}
                            />
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* ── Quick Questions ───────────────────────────── */}
                {messages.length <= 1 && (
                    <div
                        style={{
                            padding: "0.625rem 1rem",
                            borderTop: "1px solid var(--border)",
                            background: "var(--bg-subtle)",
                            overflowX: "auto",
                            flexShrink: 0,
                            display: "flex",
                            gap: "0.5rem",
                            scrollbarWidth: "none",
                        }}
                    >
                        {catQuestions.map((q) => (
                            <button
                                key={q}
                                onClick={() => handleSend(q)}
                                style={{
                                    padding: "0.5rem 0.875rem",
                                    borderRadius: "999px",
                                    border: "1.5px solid var(--border)",
                                    background: "var(--surface)",
                                    color: "var(--text-secondary)",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease",
                                    fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLButtonElement).style.borderColor = "var(--brand-400)";
                                    (e.target as HTMLButtonElement).style.color = "var(--brand-600)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                                    (e.target as HTMLButtonElement).style.color = "var(--text-secondary)";
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Input Bar ────────────────────────────────── */}
                <div
                    style={{
                        padding: "0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom))",
                        borderTop: "1px solid var(--border)",
                        background: "var(--surface)",
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            maxWidth: "780px",
                            margin: "0 auto",
                            display: "flex",
                            alignItems: "flex-end",
                            gap: "0.625rem",
                            background: "var(--bg-subtle)",
                            border: "1.5px solid var(--border)",
                            borderRadius: "14px",
                            padding: "0.5rem 0.625rem 0.5rem 1rem",
                            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onFocusCapture={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--brand-500)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-glow)";
                        }}
                        onBlurCapture={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            id="chat-input"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={`Ask anything about ${slug.toUpperCase()}…`}
                            disabled={isLoading}
                            rows={1}
                            style={{
                                flex: 1,
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                resize: "none",
                                fontSize: "0.9375rem",
                                fontFamily: "inherit",
                                color: "var(--text-primary)",
                                lineHeight: 1.5,
                                padding: "0.375rem 0",
                                maxHeight: "120px",
                                overflow: "hidden",
                            }}
                        />
                        <button
                            id="send-message"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "10px",
                                border: "none",
                                background: input.trim() && !isLoading
                                    ? "linear-gradient(135deg, var(--brand-600), var(--brand-700))"
                                    : "var(--bg-subtle)",
                                color: input.trim() && !isLoading ? "white" : "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                boxShadow: input.trim() && !isLoading ? "var(--shadow-brand)" : "none",
                            }}
                        >
                            {icons.send}
                        </button>
                    </div>
                    <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                        Answers are AI-generated, verify critical info with the university
                    </p>
                </div>
            </main>

            <style>{`
                @media (max-width: 640px) {
                    .chat-bubble-container {
                        padding: 0.5rem !important;
                    }
                    .mobile-hide {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    );
}
