"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getUniversities, requestUniversity, type University } from "@/lib/api";
import { useStore } from "@/store/useStore";
import PWAInstallButton from "@/components/PWAInstallButton";

// ── Icons ─────────────────────────────────────────────────────
const icons = {
  spark: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
  brain: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  arrow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  graduation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  mappin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
};

// ── Data ──────────────────────────────────────────────────────
const features = [
  {
    icon: icons.brain,
    color: "#3b82f6",
    bg: "#eff6ff",
    title: "AI-Powered Answers",
    desc: "RAG-enhanced responses with semantic search over verified university data. Every answer is grounded in fact.",
  },
  {
    icon: icons.clock,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "24/7 Availability",
    desc: "Instant support round the clock. No waiting in queues, no office hours. Get answers when you need them.",
  },
  {
    icon: icons.shield,
    color: "#10b981",
    bg: "#ecfdf5",
    title: "Emergency Support",
    desc: "One-tap access to verified emergency contacts, office locations, and escalation routes when it matters most.",
  },
  {
    icon: icons.spark,
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "High-Speed AI Core",
    desc: "Powered by Gemini 1.5 Flash, the platform delivers incredibly fast and accurate reasoning based on your university's data.",
  },
  {
    icon: icons.graduation,
    color: "#ec4899",
    bg: "#fdf2f8",
    title: "Admission Guidance",
    desc: "Step-by-step guidance through the admission process with deadlines, document checklists, and fee info.",
  },
  {
    icon: icons.heart,
    color: "#ef4444",
    bg: "#fff1f2",
    title: "Student-First Design",
    desc: "Built for students, parents, and seekers — clean, mobile-first, and accessible to everyone.",
  },
];

const steps = [
  { step: "01", title: "Select Your University", desc: "Choose from our growing list of partner universities." },
  { step: "02", title: "Ask Your Question", desc: "Type naturally — our AI understands context, not just keywords." },
  { step: "03", title: "Get Verified Answers", desc: "Receive factual, source-backed responses in seconds." },
  { step: "04", title: "Take Action", desc: "Follow up with emergency contacts, deadlines, or admissions steps." },
];

const stats = [
  { value: "24/7", label: "Availability" },
  { value: "< 2s", label: "Response Time" },
  { value: "95%+", label: "Accuracy Rate" },
  { value: "0", label: "Waiting Time" },
];

// ── Component ─────────────────────────────────────────────────
export default function HomePage() {
  const [universities, setUniversityList] = useState<University[]>([]);
  const [selectedUni, setSelectedUni] = useState("");
  const { setUniversities, role } = useStore();

  const [reqMode, setReqMode] = useState(false);
  const [reqForm, setReqForm] = useState({ name: "", email: "" });
  const [reqStatus, setReqStatus] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqStatus("Submitting...");
    try {
      await requestUniversity({ university_name: reqForm.name, email: reqForm.email });
      setReqStatus("Requested successfully!");
      setReqForm({ name: "", email: "" });
      setTimeout(() => {
        setReqMode(false);
        setReqStatus("");
      }, 2000);
    } catch (err: any) {
      setReqStatus("Error: " + (err.message || "Failed"));
    }
  };

  useEffect(() => {
    getUniversities()
      .then((res) => {
        setUniversityList(res.universities);
        setUniversities(res.universities); // store
      })
      .catch(() => {
        // Demo fallback
        const demo: University[] = [
          {
            id: "lpu",
            slug: "lpu",
            name: "Lovely Professional University",
            location: "Phagwara, Punjab",
            description: "India's largest private university with 30,000+ students across 200+ programs.",
            established: "2005",
            students_count: "30,000+",
          },
        ];
        setUniversityList(demo);
        setUniversities(demo);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />

      <main style={{ overflowX: "hidden" }}>
        {/* ── Hero Section ─────────────────────────────────── */}
        <section
          id="hero"
          className="hero-section"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8rem 1.5rem 5rem",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* BG gradient blobs */}
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "800px",
              height: "600px",
              background:
                "radial-gradient(ellipse, rgb(59 130 246 / 0.12) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "5%",
              right: "-10%",
              width: "400px",
              height: "400px",
              background:
                "radial-gradient(ellipse, rgb(139 92 246 / 0.1) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 1rem",
                borderRadius: "999px",
                background: "var(--brand-50)",
                border: "1px solid var(--brand-200)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--brand-700)",
                marginBottom: "1.5rem",
                animation: "fadeInUp 0.5s ease-out",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Now live · Lovely Professional University
            </div>

            {/* Headline */}
            <h1
              className="hero-headline"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                marginBottom: "1.5rem",
                animation: "fadeInUp 0.5s ease-out 0.1s both",
              }}
            >
              Your{" "}
              <span className="gradient-text">AI-Powered</span>
              <br />
              University Guide
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: "clamp(1.0625rem, 2.5vw, 1.25rem)",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                maxWidth: "540px",
                margin: "0 auto 2.5rem",
                animation: "fadeInUp 0.5s ease-out 0.2s both",
              }}
            >
              Get instant, verified answers about admissions, hostel, fees, scholarships, and emergencies — tailored to your university.
            </p>

            {/* University Selector */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                maxWidth: "480px",
                margin: "0 auto 2.5rem",
                animation: "fadeInUp 0.5s ease-out 0.3s both",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <select
                  id="university-select"
                  value={selectedUni}
                  onChange={(e) => setSelectedUni(e.target.value)}
                  className="input"
                  style={{ flex: 1, minWidth: "200px" }}
                >
                  <option value="">Select your university…</option>
                  {universities.map((u) => (
                    <option key={u.slug} value={u.slug}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Link
                  href={selectedUni ? `/university/${selectedUni}` : "#"}
                  className="btn-primary"
                  style={{ flexShrink: 0 }}
                  onClick={(e) => { if (!selectedUni) e.preventDefault(); }}
                >
                  Explore {icons.arrow}
                </Link>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                More universities coming soon —{" "}
                <a href="#" style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 500 }}>
                  Request yours
                </a>
              </p>
            </div>

            {/* Quick CTAs */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
                animation: "fadeInUp 0.5s ease-out 0.35s both",
              }}
            >
              {[
                { label: "For Students", icon: icons.graduation, href: "/#features" },
                { label: "For Parents", icon: icons.heart, href: "/#features" },
                { label: "For Admissions", icon: icons.chat, href: "/#features" },
              ].map((cta) => (
                <a
                  key={cta.label}
                  href={cta.href}
                  className="btn-secondary mobile-cta-btn"
                  style={{ gap: "0.375rem", fontSize: "0.875rem", padding: "0.5rem 1.125rem", whiteSpace: "nowrap" }}
                >
                  {cta.icon} {cta.label}
                </a>
              ))}
            </div>

            {/* Hero App Download Button */}
            <div style={{ textAlign: "center", animation: "fadeInUp 0.5s ease-out 0.4s both", paddingBottom: "1rem" }}>
              <PWAInstallButton variant="hero" />
            </div>

            {/* Request University CTA */}
            <div style={{ textAlign: "center", paddingBottom: "2rem", animation: "fadeInUp 0.5s ease-out 0.5s both" }}>
              <a href="/request-university" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none", borderBottom: "1px dashed var(--text-muted)", paddingBottom: "1px" }}>
                🏛️ Don&apos;t see your university? Request it →
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              animation: "fadeIn 1s ease-out 1s both",
            }}
          >
            <span>Scroll to explore</span>
            <div style={{
              width: "20px", height: "32px", border: "2px solid var(--border)",
              borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{
                width: "3px", height: "8px", background: "var(--brand-500)", borderRadius: "2px",
                animation: "typing-dot 1.5s ease-in-out infinite"
              }} />
            </div>
          </div>
        </section>

        {/* ── Stats Bar ─────────────────────────────────────── */}
        <section style={{ background: "linear-gradient(135deg, var(--brand-600) 0%, var(--accent-500) 100%)", padding: "2.5rem 1.5rem" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2rem", textAlign: "center" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontSize: "0.875rem", color: "rgb(255 255 255 / 0.75)", fontWeight: 500, marginTop: "0.25rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <style>{`@media(max-width:640px){section .grid-2{grid-template-columns: repeat(2,1fr) !important}}`}</style>
        </section>

        {/* ── Universities ──────────────────────────────────── */}
        <section id="universities" style={{ padding: "6rem 1.5rem", background: "var(--bg-subtle)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-600)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Partner Universities</p>
              <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 2.75rem)", fontWeight: 800 }}>Your Campus, Supercharged with AI</h2>
              <p style={{ color: "var(--text-secondary)", marginTop: "1rem", maxWidth: "500px", margin: "1rem auto 0", fontSize: "1.0625rem" }}>
                We partner exclusively with universities to maintain verified, accurate information.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {universities.length === 0 ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="card" style={{ padding: "1.75rem", animation: "pulse-ring 1.5s infinite", opacity: 0.6 }}>
                      <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "var(--border)", marginBottom: "1.25rem" }} />
                      <div style={{ height: "20px", width: "70%", background: "var(--border)", borderRadius: "4px", marginBottom: "0.75rem" }} />
                      <div style={{ height: "14px", width: "50%", background: "var(--border)", borderRadius: "4px", marginBottom: "1rem" }} />
                      <div style={{ height: "14px", width: "40%", background: "var(--border)", borderRadius: "4px", marginBottom: "1.25rem" }} />
                      <div style={{ height: "36px", width: "100px", background: "var(--border)", borderRadius: "8px" }} />
                    </div>
                  ))}
                </>
              ) : (
                universities.map((uni) => (
                  <Link
                    key={uni.slug}
                    href={`/university/${uni.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      className="card"
                      style={{ padding: "1.75rem", cursor: "pointer" }}
                    >
                      {/* Logo placeholder */}
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "14px",
                        background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 800, fontSize: "1.25rem", marginBottom: "1.25rem",
                      }}>
                        {uni.name.charAt(0)}
                      </div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>{uni.name}</h3>
                      {uni.location && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                          {icons.mappin} {uni.location}
                        </div>
                      )}
                      {uni.students_count && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                          {icons.users} {uni.students_count} students
                        </div>
                      )}
                      {uni.description && (
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                          {uni.description}
                        </p>
                      )}
                      <span className="btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
                        Explore {icons.arrow}
                      </span>
                    </div>
                  </Link>
                ))
              )}

              {/* Request card - visible to all users */}
              <div className="card" style={{ padding: "1.75rem", border: "2px dashed var(--border)", boxShadow: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1rem", minHeight: "260px" }}>
                {!reqMode ? (

                  <>
                    <div style={{ fontSize: "2.5rem" }}>🏫</div>
                    <div>
                      <h3 style={{ fontWeight: 700, marginBottom: "0.375rem" }}>Don't see your university?</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Submit a request and our team will onboard it within 48 hours.</p>
                    </div>
                    <button onClick={() => setReqMode(true)} className="btn-secondary" style={{ fontSize: "0.875rem", padding: "0.6rem 1.25rem", cursor: "pointer", border: "none" }}>Request University</button>
                  </>
                ) : (
                  <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", alignItems: "stretch", textAlign: "left" }}>
                    <h3 style={{ fontWeight: 700, textAlign: "center" }}>Request University</h3>
                    {reqStatus && (
                      <div style={{ fontSize: "0.8rem", textAlign: "center", color: reqStatus.includes("Error") ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                        {reqStatus}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="University Name"
                      required
                      value={reqForm.name}
                      onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })}
                      style={{ padding: "0.625rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="email"
                      placeholder="Your Email"
                      required
                      value={reqForm.email}
                      onChange={(e) => setReqForm({ ...reqForm, email: e.target.value })}
                      style={{ padding: "0.625rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <button type="button" onClick={() => setReqMode(false)} className="btn-ghost" style={{ flex: 1, padding: "0.625rem", fontSize: "0.875rem" }}>Cancel</button>
                      <button type="submit" className="btn-primary" style={{ flex: 1, padding: "0.625rem", fontSize: "0.875rem", border: "none" }}>Submit</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section id="features" style={{ padding: "6rem 1.5rem" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-600)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Why Izra AI</p>
              <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 2.75rem)", fontWeight: 800 }}>Everything You Need, Instantly</h2>
            </div>
            <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ padding: "1.75rem", animationDelay: `${i * 0.05}s` }}
                >
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "12px",
                    background: f.bg, color: f.color, border: `1px solid ${f.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "1rem",
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: "6rem 1.5rem", background: "var(--bg-subtle)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-600)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>How It Works</p>
            <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 2.75rem)", fontWeight: 800, marginBottom: "3.5rem" }}>Get Answers in 4 Steps</h2>
            <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "2rem", textAlign: "left" }}>
              {steps.map((s, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <div style={{
                    fontSize: "2.5rem", fontWeight: 900, color: "var(--brand-200)",
                    fontFamily: "var(--font-plus-jakarta), sans-serif",
                    lineHeight: 1, marginBottom: "0.875rem",
                  }}>
                    {s.step}
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div style={{
                      position: "absolute", top: "1.25rem", right: "-1rem",
                      color: "var(--border)", display: "flex",
                    }}>
                      {icons.arrow}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section style={{ padding: "6rem 1.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 900, marginBottom: "1.25rem" }}>
              Ready to get{" "}
              <span className="gradient-text">smarter answers?</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.0625rem", marginBottom: "2.5rem", lineHeight: 1.7 }}>
              Join thousands of students and parents who use Izra AI every day.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn-primary" style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
                Start for Free {icons.arrow}
              </Link>
              {universities[0] && (
                <Link href={`/university/${universities[0].slug}`} className="btn-secondary" style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
                  Try Live Demo
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "2.5rem 1.5rem",
          background: "var(--bg-subtle)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.875rem",
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "1rem" }}>
            <a href="https://www.linkedin.com/in/sujith-lavudu-24l094/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseOver={(e: any) => e.target.style.color = "#0a66c2"} onMouseOut={(e: any) => e.target.style.color = "var(--text-muted)"}>
              {icons.linkedin}
            </a>
            <a href="https://www.facebook.com/profile.php?id=61552815710275" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseOver={(e: any) => e.target.style.color = "#1877f2"} onMouseOut={(e: any) => e.target.style.color = "var(--text-muted)"}>
              {icons.facebook}
            </a>
            <a href="https://www.instagram.com/sujith_lavudu/?hl=en" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseOver={(e: any) => e.target.style.color = "#E1306C"} onMouseOut={(e: any) => e.target.style.color = "var(--text-muted)"}>
              {icons.instagram}
            </a>
          </div>
          <p>© 2026 Izra AI. Built for students, by builders.</p>
        </footer>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* ── Mobile First Overrides ── */
        @media (max-width: 768px) {
          .hero-headline {
            font-size: clamp(2.25rem, 8vw, 3rem) !important;
          }
          .hero-section {
            padding: 6rem 1rem 4rem !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
          .mobile-cta-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
