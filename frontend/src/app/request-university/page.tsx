"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "idle" | "loading" | "success" | "error";

export default function RequestUniversityPage() {
    const [form, setForm] = useState({
        university_name: "",
        university_location: "",
        requester_name: "",
        requester_email: "",
        requester_role: "student",
        message: "",
    });
    const [status, setStatus] = useState<Status>("idle");
    const [responseMessage, setResponseMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        try {
            const res = await fetch(`${API_BASE}/api/universities/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to submit request.");
            setStatus("success");
            setResponseMessage(data.message);
        } catch (err: unknown) {
            setStatus("error");
            setResponseMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        }
    };

    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: "0.875rem", fontWeight: 600,
        color: "var(--text-secondary)", marginBottom: "0.375rem",
    };
    const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

    return (
        <>
            <Navbar />
            <main style={{ paddingTop: "5rem", minHeight: "100vh", background: "var(--bg-base)" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", padding: "3rem 1.5rem", color: "white", textAlign: "center" }}>
                    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🏛️</div>
                        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 800, margin: "0 0 0.75rem", color: "white" }}>
                            Request a University
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1rem", lineHeight: 1.7, margin: 0 }}>
                            Don&apos;t see your university on Izra AI? Submit a request and we&apos;ll work on onboarding it.
                            Our team reviews every submission within 2–3 business days.
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div style={{ maxWidth: "680px", margin: "2.5rem auto", padding: "0 1.25rem 4rem" }}>

                    {status === "success" ? (
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid #bbf7d0", borderRadius: "20px",
                            padding: "3rem", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                        }}>
                            <div style={{ fontSize: "3.5rem", marginBottom: "1.25rem" }}>🎉</div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#15803d", marginBottom: "0.75rem" }}>
                                Request Submitted!
                            </h2>
                            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "2rem" }}>
                                {responseMessage}
                            </p>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                                <button
                                    onClick={() => { setStatus("idle"); setForm({ university_name: "", university_location: "", requester_name: "", requester_email: "", requester_role: "student", message: "" }); }}
                                    className="btn-secondary"
                                >
                                    Submit Another
                                </button>
                                <Link href="/" className="btn-primary">← Back to Home</Link>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: "20px", padding: "clamp(1.5rem, 4vw, 2.5rem)",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                        }}>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>University Details</h2>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
                                Fill in the university and your contact information below.
                            </p>

                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={labelStyle}>University Name *</label>
                                        <input
                                            name="university_name" type="text" value={form.university_name}
                                            onChange={handleChange} required
                                            placeholder="e.g. Amity University, Chandigarh"
                                            className="input" style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={labelStyle}>University Location *</label>
                                        <input
                                            name="university_location" type="text" value={form.university_location}
                                            onChange={handleChange} required
                                            placeholder="City, State"
                                            className="input" style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-secondary)" }}>Your Information</h3>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label style={labelStyle}>Your Name *</label>
                                        <input
                                            name="requester_name" type="text" value={form.requester_name}
                                            onChange={handleChange} required placeholder="Full name"
                                            className="input" style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Your Role</label>
                                        <select name="requester_role" value={form.requester_role} onChange={handleChange} className="input" style={inputStyle}>
                                            <option value="student">Student</option>
                                            <option value="parent">Parent</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="admin">University Admin</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={labelStyle}>Your Email *</label>
                                        <input
                                            name="requester_email" type="email" value={form.requester_email}
                                            onChange={handleChange} required placeholder="you@example.com"
                                            className="input" style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Additional Message (Optional)</label>
                                    <textarea
                                        name="message" value={form.message} onChange={handleChange}
                                        placeholder="Tell us why you need this university, or share any relevant information..."
                                        rows={4} className="input"
                                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                                    />
                                </div>

                                {status === "error" && (
                                    <div style={{ padding: "0.875rem 1rem", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.875rem" }}>
                                        ⚠️ {responseMessage}
                                    </div>
                                )}

                                <button type="submit" disabled={status === "loading"} className="btn-primary" style={{ justifyContent: "center", padding: "0.875rem" }}>
                                    {status === "loading" ? (
                                        <>
                                            <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                                            Submitting…
                                        </>
                                    ) : "Submit Request 🚀"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Info boxes */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
                        {[
                            { icon: "⚡", title: "Fast Review", desc: "We review requests within 2–3 business days" },
                            { icon: "🔔", title: "Get Notified", desc: "Receive an email update when your university goes live" },
                            { icon: "🆓", title: "Always Free", desc: "Izra AI is free for students and parents" },
                        ].map((item) => (
                            <div key={item.title} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem", textAlign: "center" }}>
                                <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{item.title}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </>
    );
}
