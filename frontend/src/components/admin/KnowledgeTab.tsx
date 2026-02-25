import { useEffect, useState } from "react";
import { getKnowledgeEntries, addKnowledgeEntry, deleteKnowledgeEntry } from "@/lib/api";

export default function KnowledgeTab({ token, universitySlug }: { token: string; universitySlug: string }) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [category, setCategory] = useState("general");

    const fetchKnowledge = () => {
        setLoading(true);
        getKnowledgeEntries(universitySlug, token)
            .then((res) => setEntries(res.entries))
            .catch((err) => console.error("Failed to load knowledge", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchKnowledge();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [universitySlug, token]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addKnowledgeEntry({
                university_id: universitySlug,
                question,
                answer,
                category
            }, token);
            setQuestion("");
            setAnswer("");
            fetchKnowledge();
        } catch (error) {
            console.error(error);
            alert("Failed to add entry");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this entry?")) return;
        try {
            await deleteKnowledgeEntry(id, universitySlug, token);
            fetchKnowledge();
        } catch (error) {
            console.error(error);
            alert("Failed to delete entry");
        }
    };

    return (
        <div className="admin-two-col">
            {/* Form side */}
            <div className="card" style={{ padding: "1.75rem", alignSelf: "start" }}>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "1.25rem" }}>Add Knowledge Entry</h2>
                <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                        >
                            <option value="general">General</option>
                            <option value="admission">Admission</option>
                            <option value="fees">Fees</option>
                            <option value="hostel">Hostel</option>
                            <option value="placements">Placements</option>
                            <option value="scholarships">Scholarships</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
                            Question (Trigger)
                        </label>
                        <input
                            required
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g. What are the hostel fees?"
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
                            Detailed Answer
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Provide a comprehensive answer..."
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", resize: "vertical" }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{ padding: "0.75rem", borderRadius: "8px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
                    >
                        {submitting ? "Saving..." : "Save Entry"}
                    </button>
                </form>
            </div>

            {/* List side */}
            <div className="card" style={{ padding: "1.75rem" }}>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", justifyContent: "space-between" }}>
                    <span>Existing Knowledge</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>{entries.length} records</span>
                </h2>

                {loading ? (
                    <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>Loading entries...</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "600px", overflowY: "auto", paddingRight: "0.5rem" }}>
                        {entries.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>No entries found.</p>
                        ) : (
                            entries.map(entry => (
                                <div key={entry.id} style={{ padding: "1rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", background: "var(--brand-100)", color: "var(--brand-700)", borderRadius: "99px", textTransform: "uppercase" }}>
                                            {entry.category}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Q: {entry.question}</h3>
                                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        A: {entry.answer}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
