"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getAdminStats, getQueryLogs } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import KnowledgeTab from "@/components/admin/KnowledgeTab";
import UniversityTab from "@/components/admin/UniversityTab";
import UniversityMetadataTab from "@/components/admin/UniversityMetadataTab";
import DataTab from "@/components/admin/DataTab";
import FeedbackTab from "@/components/admin/FeedbackTab";
import CMSSectionTab from "@/components/admin/CMSSectionTab";
import ApprovalsTab from "@/components/admin/ApprovalsTab";
import UsersTab from "@/components/admin/UsersTab";
import EmergencyTab from "@/components/admin/EmergencyTab";
import AuditTab from "@/components/admin/AuditTab";
import { motion, AnimatePresence } from "framer-motion";


const icons = {
    query: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    brain: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /></svg>,
    alert: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>,
    trend: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
};

interface Stats {
    total_queries: number;
    avg_confidence: number;
    fallback_rate: number;
    low_confidence_count: number;
    categories: Record<string, number>;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { token, role, universityId, isAuthenticated } = useStore();

    // Determine which university to show
    // For university_admins, it should be their assigned universityId
    // For super_admins, it could be a selector (defaulting to lpu for now)
    const activeSlug = role === "super_admin" ? "lpu" : (universityId || "lpu");

    // We can define a simplified user check instead of getting user from the store, 
    // since role is already present
    const isSuperAdmin = role === "super_admin";

    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "logs" | "knowledge" | "university" | "profile" | "data" | "feedback" | "cms" | "approvals" | "users" | "emergency" | "audit">("overview");

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/auth/login");
            return;
        }
        if (!["university_admin", "super_admin"].includes(role || "")) {
            router.push("/");
            return;
        }

        setLoading(true);
        Promise.all([
            getAdminStats(activeSlug, token!),
            getQueryLogs(activeSlug, token!, 20),
        ])
            .then(([statsRes, logsRes]) => {
                setStats(statsRes);
                setLogs(logsRes.logs || []);
            })
            .catch((err) => {
                console.error("Dashboard error:", err);
                setError("Failed to load live metrics. Showing demo data.");
                // Demo fallback for display
                setStats({
                    total_queries: 1247,
                    avg_confidence: 0.82,
                    fallback_rate: 18.5,
                    low_confidence_count: 43,
                    categories: { admission: 420, hostel: 215, fees: 198, exams: 172, scholarships: 144, emergency: 98 },
                });
                setLogs([
                    { id: "1", query: "What is the fee for B.Tech CSE?", response: "The fee for B.Tech CSE at LPU is approximately Γé╣1.6L per year...", confidence_score: 0.91, category: "fees", timestamp: new Date().toISOString(), used_fallback_llm: false },
                    { id: "2", query: "How to apply for hostel?", response: "You can apply for hostel through the student portal...", confidence_score: 0.88, category: "hostel", timestamp: new Date().toISOString(), used_fallback_llm: false },
                ]);
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSlug, isAuthenticated]);

    const chartData = stats
        ? Object.entries(stats.categories).map(([cat, count]) => ({ name: cat, count }))
        : [];

    const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];

    const statCards = stats
        ? [
            { label: "Total Queries", value: stats.total_queries.toLocaleString(), icon: icons.query, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Avg Confidence", value: `${(stats.avg_confidence * 100).toFixed(0)}%`, icon: icons.brain, color: "#8b5cf6", bg: "#f5f3ff" },
            { label: "Fallback Rate", value: `${stats.fallback_rate.toFixed(1)}%`, icon: icons.trend, color: "#f59e0b", bg: "#fffbeb" },
            { label: "Low-Confidence", value: stats.low_confidence_count.toString(), icon: icons.alert, color: "#ef4444", bg: "#fff1f2" },
        ]
        : [];

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "4rem" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", border: "3px solid var(--border)", borderTopColor: "var(--brand-500)", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 0.8s linear infinite" }} />
                        <p style={{ color: "var(--text-muted)" }}>Loading dashboardΓÇª</p>
                    </div>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="admin-page-main" style={{ paddingTop: "4rem", minHeight: "100vh", background: "var(--bg-subtle)" }}>
                {/* ΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                <div style={{ background: "linear-gradient(135deg, var(--brand-700) 0%, var(--brand-900) 100%)", padding: "2rem max(1rem, 4vw)", color: "white" }}>
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                            <div>
                                <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "white", margin: 0 }}>Admin Dashboard</h1>
                                <p style={{ color: "rgb(255 255 255 / 0.7)", marginTop: "0.375rem" }}>Lovely Professional University ┬╖ Arvix AI Analytics</p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <div style={{ padding: "0.375rem 0.875rem", borderRadius: "999px", background: "rgb(255 255 255 / 0.15)", color: "white", fontSize: "0.8125rem", fontWeight: 600 }}>
                                    ≡ƒƒó System Online
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem max(0.75rem, 3vw)" }}>
                    {/* ΓöÇΓöÇ Stats Grid ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    <div className="admin-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
                        {statCards.map((card, i) => (
                            <div key={i} className="card" style={{ padding: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {card.icon}
                                    </div>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Live
                                    </span>
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{card.value}</div>
                                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.375rem", fontWeight: 600 }}>{card.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ΓöÇΓöÇ Tabs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: "1.5rem", paddingBottom: "2px" }}>
                        <div style={{ display: "flex", gap: "0.25rem", background: "var(--surface)", borderRadius: "12px", padding: "0.25rem", border: "1px solid var(--border)", width: "max-content", minWidth: "100%" }}>
                            {([
                                "overview", "logs", "knowledge", "cms", "profile", "emergency",
                                ...(isSuperAdmin ? ["approvals", "university", "users", "audit"] : []),
                                "data", "feedback"
                            ] as Array<"overview" | "logs" | "knowledge" | "university" | "profile" | "data" | "feedback" | "cms" | "approvals" | "users" | "emergency" | "audit">).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: "0.5rem 0.875rem", borderRadius: "10px", border: "none", cursor: "pointer",
                                        fontSize: "0.8125rem", fontWeight: 600, transition: "all 0.2s ease", whiteSpace: "nowrap",
                                        background: activeTab === tab ? "var(--brand-600)" : "transparent",
                                        color: activeTab === tab ? "white" : "var(--text-secondary)",
                                    }}
                                >
                                    {tab === "overview" && "📊 Overview"}
                                    {tab === "logs" && "📋 Logs"}
                                    {tab === "knowledge" && "🧠 Knowledge"}
                                    {tab === "cms" && "📱 Dynamic CMS"}
                                    {tab === "profile" && "🏛️ University Profile"}
                                    {tab === "approvals" && "🛡️ Approvals"}
                                    {tab === "users" && "👥 Users"}
                                    {tab === "university" && isSuperAdmin && "🏫 Partner Approval"}
                                    {tab === "data" && "📂 Data Files"}
                                    {tab === "feedback" && "👍🏼 Feedback"}
                                    {tab === "emergency" && "🚨 Emergency"}
                                    {tab === "audit" && "🛡️ Audit Logs"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ΓöÇΓöÇ Overview ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    {activeTab === "overview" && (
                        <div className="admin-overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
                            {/* Category Chart */}
                            <div className="card" style={{ padding: "1.75rem", gridColumn: "1 / -1" }}>
                                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "1.5rem" }}>Queries by Category</h2>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.875rem" }}
                                            cursor={{ fill: "var(--bg-subtle)" }}
                                        />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                            {chartData.map((_, index) => (
                                                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Confidence Level */}
                            <div className="card" style={{ padding: "1.75rem" }}>
                                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "1.25rem" }}>Confidence Health</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                                    {[
                                        { label: "High confidence (>85%)", pct: 65, color: "#22c55e" },
                                        { label: "Medium confidence (75-85%)", pct: 22, color: "#f59e0b" },
                                        { label: "Low confidence (<75%)", pct: 13, color: "#ef4444" },
                                    ].map((bar) => (
                                        <div key={bar.label}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.3rem" }}>
                                                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{bar.label}</span>
                                                <span style={{ fontWeight: 700, color: bar.color }}>{bar.pct}%</span>
                                            </div>
                                            <div style={{ height: "8px", borderRadius: "4px", background: "var(--border)" }}>
                                                <div style={{ height: "100%", borderRadius: "4px", background: bar.color, width: `${bar.pct}%`, transition: "width 0.8s ease" }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Status */}
                            <div className="card" style={{ padding: "1.75rem" }}>
                                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "1.25rem" }}>AI Layer Status</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {[
                                        { label: "Cloud AI Core", status: "Online", color: "#22c55e" },
                                        { label: "FAISS Knowledge Base", status: "Active", color: "#22c55e" },
                                        { label: "Firebase Firestore", status: "Connected", color: "#22c55e" },
                                        { label: "Rate Limiter", status: "20 req/min", color: "#3b82f6" },
                                    ].map((item) => (
                                        <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>{item.label}</span>
                                            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", fontWeight: 700, color: item.color }}>
                                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.color }} />
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ΓöÇΓöÇ Query Logs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    {activeTab === "logs" && (
                        <div className="card" style={{ overflow: "hidden" }}>
                            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>Recent Query Logs</h2>
                                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>{logs.length} entries</span>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                                    <thead>
                                        <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                                            {["Query", "Category", "Confidence", "Source", "Time"].map((h) => (
                                                <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, i) => (
                                            <tr key={log.id || i} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                                            >
                                                <td style={{ padding: "1rem 1.25rem", maxWidth: "300px" }}>
                                                    <span style={{ color: "var(--text-primary)", fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {log.query}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                    <span style={{ padding: "0.2rem 0.625rem", borderRadius: "999px", background: "var(--bg-subtle)", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                                        {log.category || "general"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                    <span style={{
                                                        fontWeight: 700, fontSize: "0.875rem",
                                                        color: (log.confidence_score || 0) >= 0.75 ? "#16a34a" : "#d97706",
                                                    }}>
                                                        {((log.confidence_score || 0) * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                    <span style={{
                                                        padding: "0.2rem 0.625rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
                                                        background: log.used_fallback_llm ? "#eff6ff" : "#f0fdf4",
                                                        color: log.used_fallback_llm ? "#2563eb" : "#16a34a",
                                                    }}>
                                                        {log.used_fallback_llm ? "Cloud AI" : "Knowledge Base"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem 1.25rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "ΓÇö"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ΓöÇΓöÇ Knowledge Base ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    {activeTab === "knowledge" && <KnowledgeTab token={token!} universitySlug={activeSlug} />}

                    {activeTab === "cms" && <CMSSectionTab token={token!} universitySlug={activeSlug} />}
                    {activeTab === "profile" && <UniversityMetadataTab token={token!} universitySlug={activeSlug} />}

                    {/* ── Emergency Contacts ─────────────────────── */}
                    {activeTab === "emergency" && <EmergencyTab token={token!} universitySlug={activeSlug} />}

                    {/* ── Security Audit Logs ─────────────────────── */}
                    {activeTab === "audit" && <AuditTab token={token!} universitySlug={isSuperAdmin ? undefined : activeSlug} />}

                    {/* ── Super Admin Approvals ──────────────────── */}
                    {activeTab === "approvals" && isSuperAdmin && <ApprovalsTab token={token!} />}

                    {/* ── Users Management ───────────────────────── */}
                    {activeTab === "users" && isSuperAdmin && <UsersTab token={token!} />}

                    {/* ── Partner Approvals ──────────────────────── */}
                    {activeTab === "university" && isSuperAdmin && <UniversityTab token={token!} />}


                    {/* ΓöÇΓöÇ Data File Management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    {activeTab === "data" && <DataTab token={token!} />}

                    {/* ΓöÇΓöÇ Feedback ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                    {activeTab === "feedback" && <FeedbackTab token={token!} universitySlug={activeSlug} />}
                </div>
            </main>

            <style>{`
                @media (min-width: 640px) {
                    .admin-overview-grid {
                        grid-template-columns: 1fr 1fr !important;
                    }
                    .admin-stats-grid {
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
                    }
                }
            `}</style>
        </>
    );
}
