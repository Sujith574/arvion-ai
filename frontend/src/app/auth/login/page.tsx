"use client";

import { useState } from "react";
import Link from "next/link";
import { authLogin } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

/**
 * Clean Sweep Login Page
 * Simplified for maximum reliability and adblocker bypass.
 */
export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setError("");
        setLoading(true);

        try {
            // Force trim to prevent hidden whitespace issues
            const cleanEmail = email.trim();
            const cleanPassword = password; // Do not trim password

            const res = await authLogin({ email: cleanEmail, password: cleanPassword });

            if (!res.access_token) {
                throw new Error("Server authentication failed (no token).");
            }

            setAuth({
                token: res.access_token,
                userId: res.access_token.split(".")[1] || cleanEmail,
                role: res.role,
                displayName: res.display_name,
                universityId: res.university_id,
            });

            // Navigate to university dashboard or home
            const target = res.university_id ? `/university/${res.university_id}` : "/";
            router.push(target);

        } catch (err: any) {
            console.error("[LoginError]", err);
            // Handle common fetch errors specifically
            const msg = err.message || "";
            if (msg.includes("Failed to fetch") || msg.includes("TypeError")) {
                setError("Connection lost. Please check your internet or try again in a moment.");
            } else {
                setError(msg || "Invalid email or password.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            background: "var(--bg)",
            fontFamily: "var(--font-inter)"
        }}>
            {/* Minimalist Design */}
            <div style={{ width: "100%", maxWidth: "400px" }}>
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <h1 style={{
                            fontSize: "2rem",
                            fontWeight: 900,
                            color: "var(--brand-600)",
                            letterSpacing: "-1px"
                        }}>
                            Izra
                        </h1>
                    </Link>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                        Sign in to continue to your dashboard
                    </p>
                </div>

                <div className="card" style={{ padding: "2rem", borderRadius: "20px" }}>
                    {error && (
                        <div style={{
                            padding: "0.875rem 1rem",
                            borderRadius: "12px",
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            fontSize: "0.875rem",
                            marginBottom: "1.5rem",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>Email Address</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="name@example.com"
                                style={{ height: "48px" }}
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                                <Link href="/auth/reset-password" style={{ fontSize: "0.8125rem", color: "var(--brand-600)", fontWeight: 600, textDecoration: "none" }}>
                                    Forgot?
                                </Link>
                            </div>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                style={{ height: "48px" }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                marginTop: "0.75rem",
                                height: "50px",
                                fontSize: "1rem",
                                fontWeight: 700,
                                borderRadius: "12px"
                            }}
                        >
                            {loading ? "Authorizing..." : "Sign In"}
                        </button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        New to Izra?{" "}
                        <Link href="/auth/signup" style={{ color: "var(--brand-600)", fontWeight: 700, textDecoration: "none" }}>
                            Create account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
