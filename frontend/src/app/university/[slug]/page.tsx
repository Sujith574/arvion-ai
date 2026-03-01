"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUniversity, getCMSEntries, type University } from "@/lib/api";

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


export default function UniversityDashboard() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [university, setUniversity] = useState<University | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "courses" | "contacts">("overview");
    const [cmsData, setCmsData] = useState<{ courses: any[]; emergency: any[]; notices: any[] }>({
        courses: [], emergency: [], notices: []
    });

    useEffect(() => {
        getUniversity(slug)
            .then((res) => setUniversity(res.university))
            .catch(() => { })
            .finally(() => setLoading(false));

        // Fetch dynamic CMS sections for this university
        Promise.all([
            getCMSEntries(slug, "courses"),
            getCMSEntries(slug, "emergency"),
            getCMSEntries(slug, "notices"),
        ]).then(([coursesRes, emergencyRes, noticesRes]) => {
            setCmsData({
                courses: coursesRes.entries || [],
                emergency: emergencyRes.entries || [],
                notices: noticesRes.entries || [],
            });
        }).catch(() => { });
    }, [slug]);

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "courses", label: "Courses" },
        { id: "contacts", label: "Contacts" },
    ] as const;

    const handleAction = (entry: any) => {
        const { redirect_type, redirect_value } = entry.metadata || {};
        if (!redirect_type || redirect_type === "none") return;

        if (redirect_type === "chatbot") {
            router.push(`/university/${slug}/chat?query=${encodeURIComponent(redirect_value || entry.title)}`);
        } else if (redirect_type === "url" || redirect_type === "file") {
            window.open(redirect_value, "_blank");
        } else if (redirect_type === "whatsapp") {
            window.open(`https://wa.me/${redirect_value.replace(/[^0-9]/g, '')}`, "_blank");
        } else if (redirect_type === "call") {
            window.location.href = `tel:${redirect_value}`;
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "4rem" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", border: "3px solid var(--border)", borderTopColor: "var(--brand-500)", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 0.8s linear infinite" }} />
                        <p style={{ color: "var(--text-muted)" }}>Loading university data...</p>
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
                    background: university.hero_image_url ? `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url(${university.hero_image_url})` : "linear-gradient(135deg, var(--brand-700) 0%, var(--brand-900) 60%, #1e1b4b 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    padding: "4rem 1.5rem 3rem",
                    color: "white",
                }}>
                    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "white", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem", background: "rgba(255,255,255,0.1)", padding: "0.4rem 0.75rem", borderRadius: "8px", backdropFilter: "blur(4px)" }}>
                            {icons.back} Back to Home
                        </Link>
                        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                            {university.logo_url ? (
                                <img src={university.logo_url} style={{ width: "80px", height: "80px", borderRadius: "20px", background: "white", padding: "10px", objectFit: "contain", border: "1px solid rgba(255,255,255,0.2)" }} alt="Logo" />
                            ) : (
                                <div style={{
                                    width: "80px", height: "80px", borderRadius: "20px",
                                    background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "2.25rem", fontWeight: 900, border: "1px solid rgba(255, 255, 255, 0.2)",
                                }}>
                                    {university.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.5rem)", fontWeight: 800, margin: 0, color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                                    {university.name}
                                </h1>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                                    {university.location && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9375rem" }}>
                                            {icons.mappin} {university.location}
                                        </div>
                                    )}
                                    {university.website_url && (
                                        <a href={university.website_url} target="_blank" rel="noreferrer" style={{ color: "white", fontSize: "0.875rem", textDecoration: "underline", opacity: 0.9 }}>
                                            Visit Website
                                        </a>
                                    )}
                                </div>
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
                                    href={action.id === "chat" ? `/university/${slug}/chat` : `/university/${slug}/${action.href}`}
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
                    <div style={{ display: "flex", gap: "0.25rem", marginBottom: "2rem", background: "rgba(0,0,0,0.05)", borderRadius: "12px", padding: "0.25rem", border: "1px solid var(--border)", width: "fit-content" }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: "0.5rem 1.25rem",
                                    borderRadius: "10px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
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
                        <div className="tab-grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
                            <div className="card" style={{ padding: "2rem", gridColumn: "1 / -1" }}>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem", color: "var(--text-primary)" }}>About {university.name}</h2>
                                <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1rem" }}>{university.description}</p>

                                <div style={{ display: "flex", gap: "2.5rem", marginTop: "2rem", flexWrap: "wrap" }}>
                                    {university.established && (
                                        <div><div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--brand-600)" }}>{university.established}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 700, marginTop: "0.125rem", textTransform: "uppercase" }}>Established</div></div>
                                    )}
                                    {university.students_count && (
                                        <div><div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--brand-600)" }}>{university.students_count}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 700, marginTop: "0.125rem", textTransform: "uppercase" }}>Students</div></div>
                                    )}
                                    {university.programs_count && (
                                        <div><div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--brand-600)" }}>{university.programs_count}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 700, marginTop: "0.125rem", textTransform: "uppercase" }}>Programs</div></div>
                                    )}

                                    {/* Dynamic Stats Cards from Admin */}
                                    {university.stats?.map((stat, i) => (
                                        <div key={i}><div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--brand-600)" }}>{stat.value}</div><div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 700, marginTop: "0.125rem", textTransform: "uppercase" }}>{stat.label}</div></div>
                                    ))}
                                </div>
                            </div>

                            <div className="card" style={{ padding: "2rem" }}>
                                <h3 style={{ fontWeight: 800, marginBottom: "1.25rem", fontSize: "1.125rem" }}>⚡ Quick Chat Topics</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                    {["What are the admission requirements?", "Tell me about hostel life", "Available scholarships?", "Fees for International students?"].map((q) => (
                                        <Link key={q} href={`/university/${slug}/chat?query=${encodeURIComponent(q)}`} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                padding: "0.75rem 1rem", borderRadius: "12px",
                                                border: "1px solid var(--border)", background: "var(--bg-subtle)",
                                                fontSize: "0.875rem", color: "var(--text-secondary)",
                                                cursor: "pointer", transition: "all 0.15s ease",
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                fontWeight: 500
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-300)")}
                                                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                                            >
                                                {q} {icons.arrow}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="card" style={{ padding: "2rem" }}>
                                <h3 style={{ fontWeight: 800, marginBottom: "1.25rem", color: "#ef4444", fontSize: "1.125rem" }}>🚨 Emergency & Support</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {[
                                        { label: "🚑 Medical Assistance", href: `/university/${slug}/emergency#medical` },
                                        { label: "👮 Campus Security", href: `/university/${slug}/emergency#security` },
                                        { label: "📞 Support Helpline", href: `tel:${university.social_links?.phone || ""}` },
                                    ].map((item) => (
                                        <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                                            <div style={{
                                                padding: "0.75rem 1rem", borderRadius: "12px",
                                                border: "1px solid #fee2e2", background: "#fef2f2",
                                                fontSize: "0.875rem", color: "#ef4444", fontWeight: 700,
                                                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                                            }}>
                                                {item.label} {icons.arrow}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Courses Tab - Fully Dynamic */}
                    {activeTab === "courses" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {cmsData.courses.length === 0 ? (
                                <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
                                    <p style={{ fontSize: "1.125rem" }}>No courses published yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "1.5rem" }}>
                                    {cmsData.courses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="card"
                                            style={{ padding: "2rem", cursor: course.metadata?.redirect_type !== "none" ? "pointer" : "default", borderLeft: "4px solid var(--brand-500)" }}
                                            onClick={() => handleAction(course)}
                                        >
                                            <h3 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--text-primary)" }}>{course.title}</h3>
                                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>{course.content}</p>

                                            {/* Attributes */}
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
                                                {Object.entries(course.metadata || {}).filter(([k]) => !["redirect_type", "redirect_value"].includes(k)).map(([k, v]) => (
                                                    <span key={k} style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.6rem", borderRadius: "6px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                                                        {k}: {String(v)}
                                                    </span>
                                                ))}
                                            </div>

                                            {course.metadata?.redirect_type && course.metadata.redirect_type !== "none" && (
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: 800, color: "var(--brand-600)" }}>
                                                    {course.metadata.redirect_type === "chatbot" ? "Ask AI about this" : "View Details"} {icons.arrow}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contacts Tab - Dynamic */}
                    {activeTab === "contacts" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "1.5rem" }}>
                                {cmsData.emergency.map((contact) => (
                                    <div
                                        key={contact.id}
                                        className="card"
                                        style={{ padding: "2rem", transition: "transform 0.2s" }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--brand-600)", marginBottom: "1rem" }}>
                                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--brand-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                {icons.phone}
                                            </div>
                                            <span style={{ fontWeight: 800, fontSize: "0.9375rem", textTransform: "uppercase", letterSpacing: "0.02em" }}>Office / Support</span>
                                        </div>
                                        <h3 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.5rem" }}>{contact.title}</h3>
                                        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>{contact.content}</p>

                                        <button
                                            onClick={() => handleAction(contact)}
                                            style={{ width: "100%", padding: "0.875rem", borderRadius: "12px", border: "none", background: "var(--brand-600)", color: "white", fontWeight: 700, cursor: "pointer", transition: "filter 0.2s" }}
                                            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                                            onMouseLeave={e => (e.currentTarget.style.filter = "none")}
                                        >
                                            Get in Touch
                                        </button>
                                    </div>
                                ))}

                                {/* If no CMS contacts, show link to emergency page */}
                                {cmsData.emergency.length === 0 && (
                                    <div className="card" style={{ padding: "3rem", textAlign: "center", gridColumn: "1 / -1" }}>
                                        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>No standard contacts listed. Please visit the emergency directory.</p>
                                        <Link href={`/university/${slug}/emergency`} className="btn-primary" style={{ padding: "0.75rem 2rem", borderRadius: "10px", textDecoration: "none" }}>Emergency Directory</Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
