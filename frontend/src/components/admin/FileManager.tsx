import { useState, useEffect } from "react";
import { uploadUniversityFile, listUniversityFiles, deleteUniversityFile, type UniversityFile } from "@/lib/api";

interface FileManagerProps {
    token: string;
    universitySlug: string;
    onSelect?: (file: UniversityFile) => void;
}

export default function FileManager({ token, universitySlug, onSelect }: FileManagerProps) {
    const [files, setFiles] = useState<UniversityFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await listUniversityFiles(universitySlug, token);
            setFiles(res.files);
        } catch (err) {
            console.error("Failed to fetch files", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [universitySlug, token]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadUniversityFile(universitySlug, file, token);
            fetchFiles();
        } catch (err: any) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm("Delete this file permanently?")) return;
        try {
            await deleteUniversityFile(fileId, token);
            fetchFiles();
        } catch (err: any) {
            alert("Delete failed: " + err.message);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Media & Files</h3>
                <label className="btn-primary" style={{ cursor: "pointer", fontSize: "0.8125rem", padding: "0.5rem 1rem", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    {uploading ? "Uploading..." : "➕ Upload File"}
                    <input type="file" hidden onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading files...</div>
            ) : files.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed var(--border)", borderRadius: "12px", color: "var(--text-muted)" }}>
                    No files uploaded yet.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                    {files.map((file) => (
                        <div key={file.id} className="card" style={{ padding: "0.75rem", position: "relative" }}>
                            <div style={{ height: "100px", background: "var(--bg-subtle)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem", overflow: "hidden" }}>
                                {file.content_type.startsWith("image/") ? (
                                    <img src={file.url} alt={file.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <span style={{ fontSize: "2rem" }}>
                                        {file.filename.endsWith(".pdf") ? "📕" : file.filename.endsWith(".doc") || file.filename.endsWith(".docx") ? "📘" : "📄"}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={file.filename}>
                                {file.filename}
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatSize(file.size)}</div>

                            <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                                {onSelect && (
                                    <button
                                        onClick={() => onSelect(file)}
                                        style={{ flex: 1, padding: "0.3rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--brand-200)", background: "var(--brand-50)", color: "var(--brand-700)", cursor: "pointer", fontWeight: 700 }}
                                    >
                                        Select
                                    </button>
                                )}
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ flex: 1, textAlign: "center", padding: "0.3rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", textDecoration: "none", fontWeight: 700 }}
                                >
                                    View
                                </a>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", cursor: "pointer" }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
