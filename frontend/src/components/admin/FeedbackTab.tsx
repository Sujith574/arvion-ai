import { useEffect, useState } from "react";
import { getChatFeedback } from "@/lib/api";

export default function FeedbackTab({ token, universitySlug }: { token: string; universitySlug: string }) {
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedback = () => {
        setLoading(true);
        getChatFeedback(universitySlug, token)
            .then((res) => setFeedback(res.feedback))
            .catch((err) => console.error("Failed to load feedback", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchFeedback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [universitySlug, token]);

    return (
        <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>User Feedback</h2>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Monitor satisfaction and identify knowledge gaps.
                    </p>
                </div>
                <button
                    onClick={fetchFeedback}
                    className="btn-ghost"
                    style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>Loading feedback...</p>
            ) : feedback.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-subtle)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🙊</p>
                    <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>No feedback received yet.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {feedback.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                padding: "1.25rem",
                                background: "var(--surface)",
                                borderRadius: "12px",
                                border: "1px solid var(--border)",
                                boxShadow: "var(--shadow-sm)"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <span style={{
                                        padding: "0.25rem 0.625rem",
                                        borderRadius: "99px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        background: item.rating === 1 ? "#dcfce7" : "#fee2e2",
                                        color: item.rating === 1 ? "#16a34a" : "#dc2626",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem"
                                    }}>
                                        {item.rating === 1 ? "👍 Helpful" : "👎 Unhelpful"}
                                    </span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        {new Date(item.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                {item.query_details?.category && (
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--brand-600)", background: "var(--brand-50)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                                        {item.query_details.category.toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                <div style={{ background: "var(--bg-subtle)", padding: "0.875rem", borderRadius: "8px" }}>
                                    <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem", textTransform: "uppercase" }}>User Query</p>
                                    <p style={{ fontSize: "0.9375rem", color: "var(--text-primary)", fontWeight: 500 }}>{item.query_details?.query || "Unknown query"}</p>
                                </div>

                                <div style={{ padding: "0 0.875rem" }}>
                                    <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem", textTransform: "uppercase" }}>AI Response</p>
                                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                        {item.query_details?.response || "No response recorded"}
                                    </p>
                                </div>

                                {item.comment && (
                                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                                        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem", textTransform: "uppercase" }}>User Comment</p>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontStyle: "italic" }}>
                                            "{item.comment}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
