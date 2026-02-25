"use client";
import { useState, useEffect, useRef } from "react";
import {
    listAllUniversities,
    uploadDataFile,
    getDataFiles,
    deleteAllEntries,
    updateUniversity,
    deleteUniversity,
    addUniversity,
} from "@/lib/api";
import type { University } from "@/lib/api";

interface FileInfo {
    filename: string;
    entries: number;
    uploaded_at: string;
}

interface UniState {
    uni: University & { active?: boolean; location?: string; description?: string };
    files: FileInfo[];
    total: number;
    expanded: boolean;
}

export default function DataTab({ token }: { token: string }) {
    const [unis, setUnis] = useState<UniState[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<{ slug: string; msg: string; ok: boolean } | null>(null);

    // New university form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newSlug, setNewSlug] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadSlug, setActiveUploadSlug] = useState<string | null>(null);
    const [replaceMode, setReplaceMode] = useState<{ [slug: string]: boolean }>({});
    const [uploading, setUploading] = useState<{ [slug: string]: boolean }>({});
    const [editMode, setEditMode] = useState<{ [slug: string]: boolean }>({});
    const [editData, setEditData] = useState<{ [slug: string]: any }>({});
    const [showSuccessModal, setShowSuccessModal] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const { universities } = await listAllUniversities(token);
            const states: UniState[] = universities.map((uni: any) => ({
                uni,
                files: uni.uploaded_files || [],
                total: (uni.uploaded_files || []).reduce((acc: number, f: any) => acc + (f.entries || 0), 0),
                expanded: false,
            }));
            setUnis(states);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showStatus = (slug: string, msg: string, ok = true) => {
        setStatus({ slug, msg, ok });
        setTimeout(() => setStatus(null), 5000);
    };

    const handleUpload = async (slug: string, file: File) => {
        setUploading((u) => ({ ...u, [slug]: true }));
        try {
            const res = await uploadDataFile(slug, file, replaceMode[slug] || false, token);
            setShowSuccessModal({ show: true, msg: `All files uploaded successfully for ${slug}! Added ${res.created} entries.` });
            fetchData();
        } catch (err: any) {
            showStatus(slug, `❌ ${err.message}`, false);
        } finally {
            setUploading((u) => ({ ...u, [slug]: false }));
            setActiveUploadSlug(null);
        }
    };

    const handleFileInput = (slug: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(slug, file);
        e.target.value = "";
    };

    const handleDeleteEntries = async (slug: string) => {
        if (!confirm(`Delete ALL knowledge entries for '${slug}'? The university profile stays but all Q&A data will be removed.`)) return;
        try {
            const res = await deleteAllEntries(slug, token);
            showStatus(slug, `✅ ${res.message}`, true);
            fetchData();
        } catch (err: any) {
            showStatus(slug, `❌ ${err.message}`, false);
        }
    };

    const handleDeleteUni = async (slug: string, name: string) => {
        if (!confirm(`Permanently delete '${name}' and ALL its data? This cannot be undone.`)) return;
        try {
            const res = await deleteUniversity(slug, token);
            showStatus(slug, `✅ ${res.message}`, true);
            fetchData();
        } catch (err: any) {
            showStatus(slug, `❌ ${err.message}`, false);
        }
    };

    const handleUpdate = async (slug: string) => {
        try {
            await updateUniversity(slug, editData[slug] || {}, token);
            showStatus(slug, "✅ University details updated", true);
            setEditMode((m) => ({ ...m, [slug]: false }));
            fetchData();
        } catch (err: any) {
            showStatus(slug, `❌ ${err.message}`, false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await addUniversity({ name: newName, slug: newSlug, description: newDesc }, token);
            showStatus(newSlug, `✅ University '${newName}' created! Now upload its data file.`, true);
            setShowNewForm(false);
            setNewName(""); setNewSlug(""); setNewDesc("");
            fetchData();
        } catch (err: any) {
            showStatus("_", `❌ ${err.message}`, false);
        } finally {
            setCreating(false);
        }
    };

    const toggleExpand = (slug: string) => {
        setUnis((prev) => prev.map((u) => u.uni.slug === slug ? { ...u, expanded: !u.expanded } : u));
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Hidden global file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => activeUploadSlug && handleFileInput(activeUploadSlug, e)}
            />

            {/* Header + new university button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.25rem" }}>University Data Management</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        Upload data files to power the AI chat for each university. Supports JSON, CSV, TXT, XLSX.
                    </p>
                </div>
                <button
                    onClick={() => setShowNewForm((v) => !v)}
                    style={{ padding: "0.625rem 1rem", borderRadius: "10px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                    + Add University
                </button>
            </div>

            {/* Global status - for create form errors */}
            {status?.slug === "_" && (
                <div style={{ padding: "0.875rem", borderRadius: "8px", background: status.ok ? "#f0fdf4" : "#fef2f2", color: status.ok ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: "0.875rem" }}>
                    {status.msg}
                </div>
            )}

            {/* New University Form */}
            {showNewForm && (
                <div className="card" style={{ padding: "1.75rem", border: "2px solid var(--brand-600)" }}>
                    <h3 style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Create New University</h3>
                    <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>University Name *</label>
                            <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. IIT Bombay" style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>URL Slug (unique ID) *</label>
                            <input required value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="e.g. iit-bombay" style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Description</label>
                            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Optional brief description" style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", resize: "vertical" }} />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setShowNewForm(false)} style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>
                            <button type="submit" disabled={creating} style={{ padding: "0.625rem 1.5rem", borderRadius: "8px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: creating ? "not-allowed" : "pointer" }}>
                                {creating ? "Creating..." : "Create & Publish"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* University Cards */}
            {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading universities...</div>
            ) : unis.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: "12px", border: "2px dashed var(--border)" }}>
                    No universities yet. Click "+ Add University" to get started.
                </div>
            ) : (
                unis.map(({ uni, files, total, expanded }) => (
                    <div key={uni.slug} className="card" style={{ padding: 0, overflow: "hidden" }}>
                        {/* Card header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", cursor: "pointer", background: "var(--surface)" }} onClick={() => toggleExpand(uni.slug)}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1.125rem" }}>
                                    {uni.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{uni.name}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/{uni.slug} · {total} knowledge entries · {files.length} files uploaded</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span style={{ padding: "0.2rem 0.625rem", borderRadius: "100px", fontSize: "0.6875rem", fontWeight: 700, background: total > 0 ? "#f0fdf4" : "#fef3c7", color: total > 0 ? "#16a34a" : "#b45309", border: `1px solid ${total > 0 ? "#bbf7d0" : "#fde68a"}` }}>
                                    {total > 0 ? `${total} entries` : "No data"}
                                </span>
                                <span style={{ color: "var(--text-muted)", fontSize: "1.25rem", lineHeight: 1 }}>{expanded ? "▲" : "▼"}</span>
                            </div>
                        </div>

                        {/* Per-university status */}
                        {status?.slug === uni.slug && (
                            <div style={{ margin: "0 1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", background: status.ok ? "#f0fdf4" : "#fef2f2", color: status.ok ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: "0.875rem" }}>
                                {status.msg}
                            </div>
                        )}

                        {/* Expanded details */}
                        {expanded && (
                            <div style={{ padding: "1.25rem 1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                {/* LEFT: Data upload */}
                                <div>
                                    <h4 style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "0.9375rem" }}>📂 Data Files</h4>

                                    <div style={{ padding: "1.25rem", borderRadius: "10px", border: "2px dashed var(--border)", textAlign: "center", marginBottom: "1rem" }}>
                                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>☁️</div>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                                            Drop any format: <strong>JSON, CSV, TXT, XLSX</strong>
                                        </p>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                <input type="checkbox" checked={replaceMode[uni.slug] || false} onChange={(e) => setReplaceMode((m) => ({ ...m, [uni.slug]: e.target.checked }))} />
                                                Replace existing data
                                            </label>
                                        </div>
                                        <button
                                            disabled={uploading[uni.slug]}
                                            onClick={() => { setActiveUploadSlug(uni.slug); fileInputRef.current?.click(); }}
                                            style={{ padding: "0.625rem 1.5rem", borderRadius: "8px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: uploading[uni.slug] ? "not-allowed" : "pointer" }}
                                        >
                                            {uploading[uni.slug] ? "Uploading..." : "Choose File & Upload"}
                                        </button>
                                    </div>

                                    {/* Uploaded files list */}
                                    {files.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {files.map((f, i) => (
                                                <div key={i} style={{ padding: "0.625rem 0.875rem", borderRadius: "8px", background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>📄 {f.filename}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{f.entries} entries · {new Date(f.uploaded_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDeleteEntries(uni.slug)}
                                        style={{ marginTop: "0.75rem", width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
                                    >
                                        🗑 Delete All Knowledge Entries
                                    </button>
                                </div>

                                {/* RIGHT: Edit info + Danger zone */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                            <h4 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>✏️ University Info</h4>
                                            <button onClick={() => setEditMode((m) => ({ ...m, [uni.slug]: !m[uni.slug] }))} style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600 }}>
                                                {editMode[uni.slug] ? "Cancel" : "Edit"}
                                            </button>
                                        </div>
                                        {editMode[uni.slug] ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                {[
                                                    { key: "name", label: "Name" },
                                                    { key: "description", label: "Description" },
                                                    { key: "location", label: "Location" },
                                                    { key: "established", label: "Established Year" },
                                                    { key: "students_count", label: "Students Count" },
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.2rem" }}>{label}</label>
                                                        <input
                                                            defaultValue={(uni as any)[key] || ""}
                                                            onChange={(e) => setEditData((d) => ({ ...d, [uni.slug]: { ...(d[uni.slug] || {}), [key]: e.target.value } }))}
                                                            style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", fontSize: "0.875rem" }}
                                                        />
                                                    </div>
                                                ))}
                                                <button onClick={() => handleUpdate(uni.slug)} style={{ padding: "0.625rem", borderRadius: "8px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: "pointer" }}>
                                                    Save Changes
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                                {uni.description && <div><strong>Description:</strong> {uni.description}</div>}
                                                {(uni as any).location && <div><strong>Location:</strong> {(uni as any).location}</div>}
                                                {(uni as any).established && <div><strong>Established:</strong> {(uni as any).established}</div>}
                                                {(uni as any).students_count && <div><strong>Students:</strong> {(uni as any).students_count}</div>}
                                                {!uni.description && !(uni as any).location && <div style={{ color: "var(--text-muted)" }}>No details yet. Click Edit to add.</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Danger zone */}
                                    <div style={{ padding: "1rem", borderRadius: "10px", border: "1px solid #fecaca", background: "#fff1f2", marginTop: "auto" }}>
                                        <div style={{ fontWeight: 700, color: "#be123c", marginBottom: "0.5rem", fontSize: "0.875rem" }}>⚠️ Danger Zone</div>
                                        <button
                                            onClick={() => handleDeleteUni(uni.slug, uni.name)}
                                            style={{ width: "100%", padding: "0.625rem", borderRadius: "8px", border: "1px solid #fecaca", background: "white", color: "#be123c", fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", wordBreak: "break-word", textAlign: "center" }}
                                        >
                                            Delete &apos;{uni.name}&apos; Permanently
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
            {/* Success Modal Popup */}
            {showSuccessModal.show && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1.5rem" }}>
                    <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "2.5rem", textAlign: "center", animation: "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
                        <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Upload Complete!</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                            {showSuccessModal.msg}
                        </p>
                        <button
                            onClick={() => setShowSuccessModal({ show: false, msg: "" })}
                            style={{ width: "100%", padding: "0.875rem", borderRadius: "12px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
                        >
                            Got it, thanks!
                        </button>
                    </div>
                    <style>{`
                        @keyframes popIn {
                            from { opacity: 0; transform: scale(0.9) translateY(20px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
