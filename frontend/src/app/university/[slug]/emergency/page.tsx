"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getEmergencyContacts, type EmergencyCategory } from "@/lib/api";

const EMERGENCY_META: Record<string, { color: string; bg: string; borderColor: string; pulse: boolean }> = {
    medical: { color: "#dc2626", bg: "#fff1f2", borderColor: "#fecaca", pulse: true },
    hostel: { color: "#d97706", bg: "#fffbeb", borderColor: "#fde68a", pulse: false },
    fee: { color: "#7c3aed", bg: "#f5f3ff", borderColor: "#ddd6fe", pulse: false },
    lost_id: { color: "#2563eb", bg: "#eff6ff", borderColor: "#bfdbfe", pulse: false },
    exam: { color: "#16a34a", bg: "#f0fdf4", borderColor: "#bbf7d0", pulse: false },
};

const icons = {
    phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
    mappin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>,
};

export default function EmergencyPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [emergency, setEmergency] = useState<Record<string, EmergencyCategory>>({});
    const [loading, setLoading] = useState(true);
    const [activeCard, setActiveCard] = useState<string | null>(null);

    useEffect(() => {
        getEmergencyContacts(slug)
            .then((res) => setEmergency(res.emergency))
            .catch(() => {
                // Inline fallback
                setEmergency({
                    medical: {
                        title: "Medical Emergency",
                        icon: "🏥",
                        contacts: [
                            { name: "LPU Hospital", phone: "01824-517000", available: "24/7" },
                            { name: "Ambulance", phone: "18001803838", available: "24/7" },
                        ],
                        location: "Block 32, LPU Campus",
                        steps: ["Call ambulance immediately", "Go to LPU Hospital Block 32", "Contact hostel warden"],
                    },
                    hostel: {
                        title: "Hostel Issue",
                        icon: "🏠",
                        contacts: [
                            { name: "Hostel Helpdesk", phone: "01824-404404", available: "8AM–10PM" },
                            { name: "Chief Warden", phone: "01824-517001", available: "24/7" },
                        ],
                        location: "Hostel Administrative Block",
                        steps: ["Contact floor warden", "Call central hostel helpdesk", "Escalate to Chief Warden if urgent"],
                    },
                    fee: {
                        title: "Fee Deadline Issue",
                        icon: "💳",
                        contacts: [
                            { name: "Fee Counter", phone: "01824-404777", available: "9AM–5PM (Mon–Sat)" },
                            { name: "Finance Helpdesk", phone: "01824-404778", available: "9AM–5PM" },
                        ],
                        location: "Admin Block, Ground Floor",
                        steps: ["Collect fee receipt / bank slip", "Visit fee counter with ID", "Request extension form if needed"],
                    },
                    lost_id: {
                        title: "Lost ID Card",
                        icon: "🪪",
                        contacts: [{ name: "Smart Card Office", phone: "01824-404500", available: "9AM–5PM (Mon–Sat)" }],
                        location: "Block 25, Ground Floor",
                        steps: ["Report loss to security office", "Fill duplicate ID form", "Pay ₹200 replacement fee", "Collect new ID within 3 working days"],
                    },
                    exam: {
                        title: "Exam Emergency",
                        icon: "📝",
                        contacts: [
                            { name: "Exam Controller", phone: "01824-404600", available: "9AM–5PM" },
                            { name: "Dean Academics", phone: "01824-404601", available: "9AM–5PM" },
                        ],
                        location: "UNI Block, 3rd Floor",
                        steps: ["Inform invigilator immediately", "Contact exam controller", "Submit medical certificate within 24 hours if applicable"],
                    },
                });
            })
            .finally(() => setLoading(false));
    }, [slug]);

    const categories = Object.entries(emergency);

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "4rem" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", border: "3px solid var(--border)", borderTopColor: "#ef4444", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 0.8s linear infinite" }} />
                        <p style={{ color: "var(--text-muted)" }}>Loading emergency contacts…</p>
                    </div>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main style={{ paddingTop: "4rem", minHeight: "100vh" }}>
                {/* ── Header ─────────────────────────────────── */}
                <div style={{
                    background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)",
                    padding: "2.5rem 1.5rem",
                    color: "white",
                    textAlign: "center",
                }}>
                    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
                        <Link href={`/university/${slug}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "rgb(255 255 255 / 0.7)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                            {icons.back} Back to Dashboard
                        </Link>
                        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚨</div>
                        <h1 style={{ fontSize: "clamp(1.625rem, 4vw, 2.25rem)", fontWeight: 900, color: "white", marginBottom: "0.75rem" }}>
                            Emergency Support
                        </h1>
                        <p style={{ color: "rgb(255 255 255 / 0.8)", fontSize: "1rem", maxWidth: "460px", margin: "0 auto" }}>
                            Verified contacts and procedures for your campus emergency. Tap a card to expand details.
                        </p>
                    </div>
                </div>

                {/* ── Emergency Cards ─────────────────────────── */}
                <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.25rem" }}>
                        {categories.map(([key, data]) => {
                            const meta = EMERGENCY_META[key] || { color: "#64748b", bg: "#f9fafb", borderColor: "#e2e8f0", pulse: false };
                            const isOpen = activeCard === key;

                            return (
                                <div
                                    key={key}
                                    id={key}
                                    style={{
                                        border: `2px solid ${isOpen ? meta.color : meta.borderColor}`,
                                        borderRadius: "16px",
                                        background: isOpen ? meta.bg : "var(--surface)",
                                        overflow: "hidden",
                                        cursor: "pointer",
                                        transition: "all 0.25s ease",
                                        boxShadow: isOpen ? `0 12px 32px -4px ${meta.color}25` : "var(--shadow-sm)",
                                    }}
                                    onClick={() => setActiveCard(isOpen ? null : key)}
                                >
                                    {/* Card Header */}
                                    <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                                            <div style={{
                                                width: "48px", height: "48px", borderRadius: "12px",
                                                background: meta.bg, border: `2px solid ${meta.borderColor}`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "1.5rem", position: "relative",
                                            }}>
                                                {data.icon}
                                                {meta.pulse && (
                                                    <span style={{
                                                        position: "absolute", top: "-3px", right: "-3px",
                                                        width: "12px", height: "12px", borderRadius: "50%",
                                                        background: meta.color, border: "2px solid white",
                                                        animation: "pulse-dot 1.5s ease-in-out infinite",
                                                    }} />
                                                )}
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: isOpen ? meta.color : "var(--text-primary)", margin: 0 }}>{data.title}</h2>
                                                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.125rem 0 0" }}>
                                                    {data.contacts.length} verified contact{data.contacts.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ color: isOpen ? meta.color : "var(--text-muted)", transition: "transform 0.25s ease", transform: isOpen ? "rotate(180deg)" : "none", fontSize: "1.25rem" }}>
                                            ▾
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isOpen && (
                                        <div style={{ padding: "0 1.5rem 1.5rem", animation: "fadeInUp 0.2s ease-out" }}>
                                            {/* Contacts */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
                                                {data.contacts.map((c, i) => (
                                                    <a
                                                        key={i}
                                                        href={`tel:${c.phone}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            padding: "0.875rem 1rem",
                                                            borderRadius: "10px",
                                                            background: "var(--surface)",
                                                            border: `1.5px solid ${meta.borderColor}`,
                                                            textDecoration: "none",
                                                            transition: "transform 0.15s ease",
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>{c.name}</div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
                                                                {icons.clock} {c.available}
                                                            </div>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: "flex", alignItems: "center", gap: "0.375rem",
                                                                padding: "0.5rem 0.875rem", borderRadius: "999px",
                                                                background: meta.color, color: "white",
                                                                fontWeight: 700, fontSize: "0.875rem",
                                                            }}
                                                        >
                                                            {icons.phone} {c.phone}
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>

                                            {/* Location */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                                                {icons.mappin}
                                                <span style={{ fontWeight: 500 }}>{data.location}</span>
                                            </div>

                                            {/* Steps */}
                                            <div>
                                                <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>What to do</p>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                                    {data.steps.map((step, i) => (
                                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                                            <div style={{
                                                                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                                                                background: meta.color, color: "white",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                fontSize: "0.6875rem", fontWeight: 800,
                                                            }}>
                                                                {i + 1}
                                                            </div>
                                                            {step}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Also chat */}
                    <div style={{
                        marginTop: "2rem", padding: "1.5rem", textAlign: "center",
                        border: "1.5px solid var(--border)", borderRadius: "16px",
                        background: "var(--bg-subtle)",
                    }}>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "0.875rem" }}>
                            Not finding what you need? Ask our AI assistant for guidance.
                        </p>
                        <Link href={`/university/${slug}/chat?cat=emergency`} className="btn-primary">
                            Ask AI for Emergency Help
                        </Link>
                    </div>
                </div>
            </main>

            <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
        </>
    );
}
