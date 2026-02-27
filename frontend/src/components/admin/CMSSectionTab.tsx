import { useState, useEffect } from "react";
import { getCMSEntries, createCMSEntry, updateCMSEntry, deleteCMSEntry, getCMSSections, getCMSAuditLogs } from "@/lib/api";

interface CMSSectionTabProps {
    token: string;
    universitySlug: string;
}

export default function CMSSectionTab({ token, universitySlug }: CMSSectionTabProps) {
    const [sections, setSections] = useState<any[]>([]);
    const [activeSectionId, setActiveSectionId] = useState<string>("");
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [showAudit, setShowAudit] = useState(false);

    // Form state
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState(0);
    const [metaKey, setMetaKey] = useState("");
    const [metaValue, setMetaValue] = useState("");
    const [metadata, setMetadata] = useState<Record<string, any>>({});

    const fetchSections = async () => {
        try {
            const res = await getCMSSections(universitySlug);
            setSections(res.sections);
            if (res.sections.length > 0 && !activeSectionId) {
                setActiveSectionId(res.sections[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchEntries = async () => {
        if (!activeSectionId) return;
        setLoading(true);
        try {
            const res = await getCMSEntries(universitySlug, activeSectionId, token);
            setEntries(res.entries);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await getCMSAuditLogs(universitySlug, token);
            setAuditLogs(res.logs);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSections();
    }, [universitySlug]);

    useEffect(() => {
        fetchEntries();
        if (showAudit) fetchAuditLogs();
    }, [activeSectionId, universitySlug, showAudit]);

    const resetForm = () => {
        setEditId(null);
        setTitle("");
        setContent("");
        setPriority(0);
        setMetadata({});
        setMetaKey("");
        setMetaValue("");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = {
                section_id: activeSectionId,
                university_id: universitySlug,
                title,
                content,
                priority,
                metadata
            };

            if (editId) {
                await updateCMSEntry(universitySlug, activeSectionId, editId, data, token);
            } else {
                await createCMSEntry(universitySlug, activeSectionId, data, token);
            }
            resetForm();
            fetchEntries();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (entry: any) => {
        setEditId(entry.id);
        setTitle(entry.title);
        setContent(entry.content);
        setPriority(entry.priority || 0);
        setMetadata(entry.metadata || {});
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this entry? (Soft delete)")) return;
        try {
            await deleteCMSEntry(universitySlug, activeSectionId, id, token);
            fetchEntries();
        } catch (err: any) {
            alert("Delete failed: " + err.message);
        }
    };

    const addMeta = () => {
        if (!metaKey) return;
        setMetadata(prev => ({ ...prev, [metaKey]: metaValue }));
        setMetaKey("");
        setMetaValue("");
    };

    const removeMeta = (key: string) => {
        const next = { ...metadata };
        delete next[key];
        setMetadata(next);
    };

    const activeSection = sections.find(s => s.id === activeSectionId);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Horizontal Sections Nav */}
            <div style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid var(--border)"
            }}>
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => { setActiveSectionId(s.id); resetForm(); }}
                        style={{
                            padding: "0.6rem 1rem",
                            borderRadius: "99px",
                            border: "1px solid var(--border)",
                            background: activeSectionId === s.id ? "var(--brand-600)" : "var(--surface)",
                            color: activeSectionId === s.id ? "white" : "var(--text-secondary)",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem"
                        }}
                    >
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                    </button>
                ))}
            </div>

            <div className="admin-two-col">
                {/* Editor Card */}
                <div className="card" style={{ padding: "1.75rem", alignSelf: "start" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                            {editId ? "Edit Entry" : "Add Content"}
                        </h2>
                        {editId && <button onClick={resetForm} style={{ color: "var(--brand-600)", border: "none", background: "none", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}>Cancel Edit</button>}
                    </div>

                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>HEADING / TITLE</label>
                            <input
                                required
                                className="input"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Admission Deadline 2026"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>PRIMARY CONTENT</label>
                            <textarea
                                required
                                rows={4}
                                className="input"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={{ resize: "vertical" }}
                                placeholder="Describe the information clearly..."
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>PRIORITY (Higher first)</label>
                                <input type="number" className="input" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} />
                            </div>
                        </div>

                        {/* Metadata Builder */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.6rem" }}>ADDITIONAL FIELDS (Key-Value)</label>

                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <input placeholder="Key (e.g. Phone)" className="input" style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }} value={metaKey} onChange={e => setMetaKey(e.target.value)} />
                                <input placeholder="Value" className="input" style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }} value={metaValue} onChange={e => setMetaValue(e.target.value)} />
                                <button type="button" onClick={addMeta} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--bg-subtle)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" }}>Add</button>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {Object.entries(metadata).map(([k, v]) => (
                                    <div key={k} style={{
                                        padding: "0.4rem 0.75rem",
                                        borderRadius: "6px",
                                        background: "var(--brand-50)",
                                        border: "1px solid var(--brand-100)",
                                        fontSize: "0.75rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem"
                                    }}>
                                        <span style={{ fontWeight: 800, color: "var(--brand-700)" }}>{k}:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                                        <button type="button" onClick={() => removeMeta(k)} style={{ border: "none", background: "none", color: "#f43f5e", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary"
                            style={{ padding: "0.875rem", borderRadius: "12px", width: "100%", border: "none" }}
                        >
                            {submitting ? "Processing..." : (editId ? "Update Entry" : "Publish to Section")}
                        </button>
                    </form>
                </div>

                {/* List Card */}
                <div className="card" style={{ padding: "1.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{activeSection?.name || "Entries"}</h2>
                            <button
                                onClick={() => setShowAudit(!showAudit)}
                                style={{ background: "none", border: "none", color: "var(--brand-600)", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600 }}
                            >
                                {showAudit ? "⬅️ Back to Entries" : "📊 View Activity Log"}
                            </button>
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{entries.length} published items</p>
                    </div>

                    {loading ? (
                        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading content...</div>
                    ) : showAudit ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {auditLogs.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No activity recorded.</div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div key={log.id} style={{ padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontWeight: 700, textTransform: "uppercase", color: log.action === "soft_delete" ? "#ef4444" : "var(--brand-600)" }}>{log.action.replace("_", " ")}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
                                            Entry ID: {log.entry_id} | Section: {log.section_id}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : entries.length === 0 ? (
                        <div style={{ padding: "4rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            No entries in this section yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {entries.map(entry => (
                                <div key={entry.id} style={{
                                    padding: "1.25rem",
                                    borderRadius: "12px",
                                    border: "1px solid var(--border)",
                                    background: "var(--bg-subtle)",
                                    position: "relative"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", paddingRight: "4rem" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{entry.title}</h3>
                                        <span style={{
                                            fontSize: "0.65rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "4px", textTransform: "uppercase",
                                            background: entry.status === "approved" ? "rgba(16, 185, 129, 0.1)" : entry.status === "pending" || entry.status === "pending_delete" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                            color: entry.status === "approved" ? "#10B981" : entry.status === "pending" || entry.status === "pending_delete" ? "#F59E0B" : "#EF4444"
                                        }}>
                                            {entry.status || "approved"}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{entry.content}</p>

                                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
                                            {Object.entries(entry.metadata).map(([k, v]) => (
                                                <div key={k} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px" }}>
                                                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{k}:</span> {String(v)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", gap: "0.5rem" }}>
                                        {entry.status !== "pending_delete" && (
                                            <>
                                                <button onClick={() => handleEdit(entry)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--border)", background: "white", cursor: "pointer" }}>✏️</button>
                                                <button onClick={() => handleDelete(entry.id)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", cursor: "pointer" }}>🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
