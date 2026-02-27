import { useState, useEffect } from "react";
import { getPendingCMS, approveCMSEntry, rejectCMSEntry } from "@/lib/api";

interface ApprovalsTabProps {
    token: string;
}

export default function ApprovalsTab({ token }: ApprovalsTabProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await getPendingCMS(token);
            setEntries(res.entries);
        } catch (err) {
            console.error("Failed to load approvals", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, [token]);

    const handleApprove = async (id: string) => {
        if (!confirm("Are you sure you want to approve this entry?")) return;
        try {
            await approveCMSEntry(id, token);
            alert("Entry approved.");
            fetchPending();
        } catch (err: any) {
            alert(err.message || "Failed to approve");
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure you want to reject this entry?")) return;
        try {
            await rejectCMSEntry(id, token);
            alert("Entry rejected.");
            fetchPending();
        } catch (err: any) {
            alert(err.message || "Failed to reject");
        }
    };

    if (loading) {
        return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading pending approvals...</div>;
    }

    if (entries.length === 0) {
        return (
            <div className="card" style={{ padding: "4rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Pending Approvals</h3>
                <p style={{ color: "var(--text-secondary)" }}>All caught up! There are no CMS changes waiting for approval.</p>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--brand-700)" }}>CMS Approvals Queue</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {entries.map(entry => (
                    <div key={entry.id} style={{
                        padding: "1.25rem",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        background: entry.status === "pending_delete" ? "#fff1f2" : "var(--surface)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
                                    {entry.title}
                                    <span style={{
                                        marginLeft: "1rem",
                                        fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "6px", textTransform: "uppercase",
                                        background: entry.status === "pending_delete" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                        color: entry.status === "pending_delete" ? "#EF4444" : "#F59E0B"
                                    }}>
                                        {entry.status === "pending_delete" ? "DELETE REQUEST" : "NEW/EDIT REQUEST"}
                                    </span>
                                </h3>
                                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                    University ID: <strong style={{ color: "var(--text-secondary)" }}>{entry.university_id}</strong> | Section: <strong style={{ color: "var(--text-secondary)" }}>{entry.section_id}</strong>
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                    onClick={() => handleApprove(entry.id)}
                                    style={{
                                        padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.8125rem", border: "none", cursor: "pointer",
                                        background: "#10b981", color: "white"
                                    }}>
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(entry.id)}
                                    style={{
                                        padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.8125rem", border: "none", cursor: "pointer",
                                        background: "#ef4444", color: "white"
                                    }}>
                                    Reject
                                </button>
                            </div>
                        </div>

                        <div style={{ background: "var(--bg-subtle)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginTop: "1rem" }}>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{entry.content}</p>
                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
                                    {Object.entries(entry.metadata).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", background: "white", border: "1px solid var(--border)", borderRadius: "6px" }}>
                                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{k}:</span> {String(v)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
