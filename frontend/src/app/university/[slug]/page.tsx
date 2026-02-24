"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUniversity, type University } from "@/lib/api";

const icons = {
    chat: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    alert: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    book: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
    calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>,
    arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
    mappin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>,
    scholarship: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>,
    phone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
};

const QUICK_ACTIONS = [
    { id: "chat", label: "Ask AI Assistant", desc: "Get instant answers", icon: icons.chat, color: "#3b82f6", bg: "#eff6ff", href: "chat" },
    { id: "emergency", label: "Emergency", desc: "Quick help contacts", icon: icons.alert, color: "#ef4444", bg: "#fff1f2", href: "emergency" },
    { id: "admission", label: "Admission Guide", desc: "Step-by-step process", icon: icons.book, color: "#8b5cf6", bg: "#f5f3ff", href: "chat?cat=admission" },
    { id: "deadlines", label: "Deadlines", desc: "Important dates & schedules", icon: icons.calendar, color: "#f59e0b", bg: "#fffbeb", href: "chat?cat=exams" },
    { id: "scholarships", label: "Scholarships", desc: "Funding & financial aid", icon: icons.scholarship, color: "#10b981", bg: "#ecfdf5", href: "chat?cat=scholarships" },
    { id: "fees", label: "Fee Structure", desc: "Tuition & hostel fees", icon: icons.book, color: "#ec4899", bg: "#fdf2f8", href: "chat?cat=fees" },
];

const LPU_INFO = {
    departments: [
        { name: "Engineering & Technology", programs: "B.Tech, M.Tech, Ph.D." },
        { name: "Business & Management", programs: "BBA, MBA, PGDM" },
        { name: "Computer Applications", programs: "BCA, MCA, B.Sc. CS" },
        { name: "Design & Architecture", programs: "B.Des, M.Arch, B.Arch" },
        { name: "Agriculture Sciences", programs: "B.Sc. Agri, M.Sc. Agri" },
        { name: "Law & Legal Studies", programs: "BA LLB, BBA LLB, LLM" },
    ],
    contacts: [
        { label: "General & Admissions", phone: "01824-517000", available: "24/7 Enquiry" },
        { label: "WhatsApp Support", phone: "+91 98525 69000", available: "Message Anytime" },
        { label: "Medical Emergency", phone: "01824-444079", available: "24/7 Hospital" },
        { label: "Security Emergency", phone: "95018-10448", available: "24/7 Security" },
    ],
};


export default function UniversityDashboard() {
    const params = useParams();
    const slug = params.slug as string;

    const [university, setUniversity] = useState<University | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "departments" | "contacts">("overview");

    useEffect(() => {
        getUniversity(slug)
            .then((res) => setUniversity(res.university))
            .catch(() => {
                // Demo fallback for LPU
                if (slug === "lpu") {
                    setUniversity({
                        id: "lpu", slug: "lpu",
                        name: "Lovely Professional University",
                        location: "Phagwara, Punjab — NH-1",
                        description: "India's largest private university with 30,000+ students across 200+ programs, autonomous since 2018.",
                        established: "2005",
                        students_count: "30,000+",
                    });
                }
            })
            .finally(() => setLoading(false));
    }, [slug]);

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "departments", label: "Departments" },
        { id: "contacts", label: "Contacts" },
    ] as const;

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "4rem" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", border: "3px solid var(--border)", borderTopColor: "var(--brand-500)", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 0.8s linear infinite" }} />
                        <p style={{ color: "var(--text-muted)" }}>Loading university data…</p>
                    </div>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </>
        );
    }

    if (!university) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "4rem" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏫</div>
                        <h2 style={{ marginBottom: "0.5rem" }}>University not found</h2>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>This university may not be active yet.</p>
                        <Link href="/" className="btn-primary">← Back to Home</Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main style={{ paddingTop: "4rem", minHeight: "100vh" }}>

                {/* ── Header ─────────────────────────────────────── */}
                <div style={{
                    background: "linear-gradient(135deg, var(--brand-700) 0%, var(--brand-900) 60%, #1e1b4b 100%)",
                    padding: "3rem 1.5rem 2rem",
                    color: "white",
                }}>
                    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "rgb(255 255 255 / 0.7)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                            {icons.back} Back to Home
                        </Link>
                        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                            <div style={{
                                width: "64px", height: "64px", borderRadius: "16px",
                                background: "rgb(255 255 255 / 0.15)", backdropFilter: "blur(8px)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "1.75rem", fontWeight: 900, border: "1px solid rgb(255 255 255 / 0.2)",
                            }}>
                                {university.name.charAt(0)}
                            </div>
                            <div>
                                <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, margin: 0, color: "white" }}>
                                    {university.name}
                                </h1>
                                {university.location && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "rgb(255 255 255 / 0.75)", fontSize: "0.9375rem", marginTop: "0.375rem" }}>
                                        {icons.mappin} {university.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Quick Actions ───────────────────────────────── */}
                <div style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)", padding: "1.5rem" }}>
                    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.625rem" }}>
                            {QUICK_ACTIONS.map((action) => (
                                <Link
                                    key={action.id}
                                    href={`/university/${slug}/${action.href}`}
                                    style={{ textDecoration: "none" }}
                                >
                                    <div
                                        style={{
                                            background: "var(--surface)",
                                            border: "1.5px solid var(--border)",
                                            borderRadius: "14px",
                                            padding: "1.125rem",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.borderColor = action.color;
                                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px -4px ${action.color}30`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                                        }}
                                    >
                                        <div style={{
                                            width: "36px", height: "36px", borderRadius: "10px",
                                            background: action.bg, color: action.color,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            marginBottom: "0.75rem",
                                        }}>
                                            {action.icon}
                                        </div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>{action.label}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{action.desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Tabs ───────────────────────────────────────── */}
                <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
                    {/* Tab Bar */}
                    <div style={{ display: "flex", gap: "0.25rem", marginBottom: "2rem", background: "var(--bg-subtle)", borderRadius: "12px", padding: "0.25rem", border: "1px solid var(--border)", width: "fit-content" }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: "0.5rem 1.125rem",
                                    borderRadius: "10px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s ease",
                                    background: activeTab === tab.id ? "var(--surface)" : "transparent",
                                    color: activeTab === tab.id ? "var(--brand-600)" : "var(--text-secondary)",
                                    boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="tab-grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
                            <div className="card" style={{ padding: "1.75rem", gridColumn: "1 / -1" }}>
                                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.875rem" }}>About {university.name}</h2>
                                <p style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>{university.description}</p>
                                <div style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                                    {university.established && (
                                        <div><div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>{university.established}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "0.125rem" }}>Established</div></div>
                                    )}
                                    {university.students_count && (
                                        <div><div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>{university.students_count}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "0.125rem" }}>Students</div></div>
                                    )}
                                    <div><div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>200+</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "0.125rem" }}>Programs</div></div>
                                    <div><div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>NAAC A+</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "0.125rem" }}>Accreditation</div></div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: "1.75rem" }}>
                                <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Quick Chat Topics</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {["What are the hostel fees?", "How do I apply for admission?", "What scholarships are available?", "When is the last date to pay fees?"].map((q) => (
                                        <Link key={q} href={`/university/${slug}/chat`} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                padding: "0.625rem 0.875rem", borderRadius: "10px",
                                                border: "1px solid var(--border)", background: "var(--bg-subtle)",
                                                fontSize: "0.875rem", color: "var(--text-secondary)",
                                                cursor: "pointer", transition: "all 0.15s ease",
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                            }}>
                                                {q} {icons.arrow}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div className="card" style={{ padding: "1.75rem" }}>
                                <h3 style={{ fontWeight: 700, marginBottom: "1rem", color: "#ef4444" }}>Emergency Quick Access</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                    {[
                                        { label: "🏥 Medical Emergency", href: `/university/${slug}/emergency#medical` },
                                        { label: "🛡️ Security Emergency", href: `/university/${slug}/emergency#security` },
                                        { label: "🏠 Hostel Issue", href: `/university/${slug}/emergency#hostel` },
                                        { label: "🪪 Lost ID Card", href: `/university/${slug}/emergency#lost_id` },
                                    ].map((item) => (
                                        <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                padding: "0.625rem 0.875rem", borderRadius: "10px",
                                                border: "1px solid #fecaca", background: "#fff1f2",
                                                fontSize: "0.875rem", color: "#be123c", fontWeight: 600,
                                                cursor: "pointer",
                                            }}>
                                                {item.label}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments Tab */}
                    {activeTab === "departments" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "1.25rem" }}>
                            {LPU_INFO.departments.map((dept, i) => (
                                <div key={i} className="card" style={{ padding: "1.5rem" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "0.875rem", marginBottom: "0.875rem" }}>
                                        {i + 1}
                                    </div>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.375rem" }}>{dept.name}</h3>
                                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{dept.programs}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Contacts Tab */}
                    {activeTab === "contacts" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "1.25rem" }}>
                            {LPU_INFO.contacts.map((contact, i) => (
                                <div key={i} className="card" style={{ padding: "1.5rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--brand-600)", marginBottom: "0.625rem" }}>
                                        {icons.phone}
                                        <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>Contact</span>
                                    </div>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.375rem" }}>{contact.label}</h3>
                                    <a href={`tel:${contact.phone}`} style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--brand-600)", textDecoration: "none", display: "block", marginBottom: "0.375rem" }}>
                                        {contact.phone}
                                    </a>
                                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{contact.available}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
