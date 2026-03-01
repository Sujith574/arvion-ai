import { useState, useEffect } from "react";
import { getAuditLogs } from "@/lib/api";

interface AuditTabProps {
    token: string;
    universitySlug?: string;
}

export default function AuditTab({ token, universitySlug }: AuditTabProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(100);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs(token, universitySlug, limit);
            setLogs(res.logs || []);
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [universitySlug, limit]);

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading security audit logs...</div>;

    return (
        <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Security Audit Logs</h2>
                <button onClick={fetchLogs} className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>Refresh</button>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-subtle)", textAlign: "left" }}>
                            <th style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>TIME</th>
                            <th style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>ACTION</th>
                            <th style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>ENTITY & ID</th>
                            <th style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>UNIVERSITY</th>
                            <th style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>PERFORMED BY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>No audit logs found.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800,
                                            background: log.action === "CREATE" ? "#f0fdf4" : log.action === "DELETE" ? "#fee2e2" : "#eff6ff",
                                            color: log.action === "CREATE" ? "#16a34a" : log.action === "DELETE" ? "#ef4444" : "#2563eb"
                                        }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ fontWeight: 600 }}>{log.entity}</div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{log.entity_id}</div>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{ textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 700 }}>{log.tenant_id}</span>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ fontSize: "0.75rem" }}>UID: {log.performed_by?.substring(0, 8)}...</div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
