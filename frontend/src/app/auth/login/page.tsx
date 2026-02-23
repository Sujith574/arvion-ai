"use client";

import { useState } from "react";
import Link from "next/link";
import { authLogin } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

const EyeIcon = ({ show }: { show: boolean }) => show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await authLogin({ email, password });
            setAuth({
                token: res.access_token,
                userId: res.access_token.split(".")[1] || email,
                role: res.role,
                displayName: res.display_name,
                universityId: res.university_id,
            });
            router.push(res.university_id ? `/university/${res.university_id}` : "/");
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", background: "var(--bg)" }}>
            {/* BG Blob */}
            <div style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "500px", background: "radial-gradient(ellipse, rgb(59 130 246 / 0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

            <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1, animation: "fadeInUp 0.4s ease-out" }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <Link href="/" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
                        <div style={{
                            width: "52px", height: "52px", borderRadius: "14px",
                            background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1.5rem", boxShadow: "var(--shadow-brand)",
                        }}>
                            🧠
                        </div>
                        <span style={{ fontSize: "1.375rem", fontWeight: 800, background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            Izra AI
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: "2rem" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, textAlign: "center", marginBottom: "0.375rem" }}>Welcome back</h1>
                    <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
                        Sign in to your Izra AI account
                    </p>

                    {error && (
                        <div style={{
                            padding: "0.75rem 1rem", borderRadius: "10px",
                            background: "#fff1f2", border: "1px solid #fecaca",
                            color: "#be123c", fontSize: "0.875rem", marginBottom: "1.25rem",
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                            <label htmlFor="email" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.375rem" }}>
                                <label htmlFor="password" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                    Password
                                </label>
                                <Link href="/auth/reset-password" style={{ fontSize: "0.75rem", color: "var(--brand-600)", fontWeight: 600, textDecoration: "none" }}>
                                    Forgot password?
                                </Link>
                            </div>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="password"
                                    type={showPw ? "text" : "password"}
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingRight: "3rem" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    style={{
                                        position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)",
                                        background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0,
                                    }}
                                    aria-label="Toggle password visibility"
                                >
                                    <EyeIcon show={showPw} />
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: "100%", marginTop: "0.5rem", padding: "0.875rem", fontSize: "1rem" }}
                        >
                            {loading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                        Don't have an account?{" "}
                        <Link href="/auth/signup" style={{ color: "var(--brand-600)", fontWeight: 700, textDecoration: "none" }}>
                            Sign up free
                        </Link>
                    </p>
                </div>

                <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    By signing in, you agree to our{" "}
                    <a href="#" style={{ color: "var(--brand-600)" }}>Terms</a>
                    {" & "}
                    <a href="#" style={{ color: "var(--brand-600)" }}>Privacy Policy</a>
                </p>
            </div>
        </div>
    );
}
