import { useState, useEffect } from "react";
import { addUniversity, getUniversityRequests, approveUniversityRequest, rejectUniversityRequest } from "@/lib/api";

export default function UniversityTab({ token }: { token: string }) {
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [desc, setDesc] = useState("");
    const [message, setMessage] = useState("");

    const [requests, setRequests] = useState<any[]>([]);
    const [loadingReqs, setLoadingReqs] = useState(true);

    const fetchRequests = async () => {
        setLoadingReqs(true);
        try {
            const res = await getUniversityRequests(token);
            setRequests(res.requests || []);
        } catch (err) {
            console.error("Failed to load requests", err);
        } finally {
            setLoadingReqs(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage("");
        try {
            const res = await addUniversity({ name, slug, description: desc }, token);
            setMessage(`✅ ${res.message}`);
            setName("");
            setSlug("");
            setDesc("");
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message || "Failed to create"}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: string, uniName: string) => {
        if (!confirm(`Approve and publish '${uniName}'?`)) return;
        try {
            await approveUniversityRequest(id, token);
            alert(`Approved successfully! ${uniName} is now live.`);
            fetchRequests();
        } catch (err: any) {
            alert(`Error approving: ${err.message}`);
        }
    };

    const handleReject = async (id: string, uniName: string) => {
        if (!confirm(`Reject request for '${uniName}'?`)) return;
        try {
            await rejectUniversityRequest(id, token);
            alert(`Request for ${uniName} has been rejected.`);
            fetchRequests();
        } catch (err: any) {
            alert(`Error rejecting: ${err.message}`);
        }
    };

    return (
        <div className="admin-two-col">

            {/* ── Pending Requests ────────────────────── */}
            <div className="card" style={{ padding: "2rem", alignSelf: "start" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Pending Approvals</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Universities requested by users. Click Approve to automatically generate their workspace and publish them.
                </p>

                {loadingReqs ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</div>
                ) : requests.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
                        No pending university requests right now.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {requests.map(req => (
                            <div key={req.id} style={{ padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>{req.university_name}</h3>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button
                                            onClick={() => handleReject(req.id, req.university_name)}
                                            style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req.id, req.university_name)}
                                            style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none", background: "var(--brand-600)", color: "white", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                                        >
                                            Approve &amp; Publish
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                    <div><strong>Requested by:</strong> {req.requester_name || "Anonymous"}</div>
                                    <div><strong>Contact:</strong> {req.requester_email || "N/A"}</div>
                                    <div style={{ marginTop: "0.25rem" }}><strong>Date:</strong> {req.created_at ? new Date(req.created_at).toLocaleDateString() : "Pending"}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Manual Add Form ────────────────────── */}
            <div className="card" style={{ padding: "2rem", alignSelf: "start" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Register Manually</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Instantly set up a university by generating their chat and dashboard workspaces yourself.
                </p>

                {message && (
                    <div style={{ padding: "1rem", borderRadius: "8px", background: message.includes("✅") ? "#f0fdf4" : "#fef2f2", color: message.includes("✅") ? "#16a34a" : "#dc2626", marginBottom: "1.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--text-secondary)" }}>
                            University Name
                        </label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Lovely Professional University"
                            style={{ width: "100%", padding: "0.875rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--text-secondary)" }}>
                            URL Slug (Must be unique)
                        </label>
                        <input
                            required
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="e.g. lpu"
                            style={{ width: "100%", padding: "0.875rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                        />
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>This will be used in the URL: /university/<strong>{slug || "slug"}</strong></p>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--text-secondary)" }}>
                            Short Description
                        </label>
                        <textarea
                            rows={3}
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Optional brief description..."
                            style={{ width: "100%", padding: "0.875rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", resize: "vertical" }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{ padding: "0.875rem", borderRadius: "8px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", marginTop: "0.5rem" }}
                    >
                        {submitting ? "Publishing..." : "Publish University"}
                    </button>
                </form>
            </div>
        </div>
    );
}
