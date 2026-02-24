"use client";

import { useState } from "react";
import Link from "next/link";
import { authSendOtp, authVerifyOtp, authSignup } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import OtpInput from "@/components/OtpInput";

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

type Step = "details" | "otp" | "done";

export default function SignupPage() {
    const router = useRouter();
    const { setAuth } = useStore();

    const [step, setStep] = useState<Step>("details");
    const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "student" });
    const [otp, setOtp] = useState("");
    const [verifiedToken, setVerifiedToken] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // ── Step 1: Send OTP ─────────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (!form.displayName.trim()) { setError("Please enter your name."); return; }
        setLoading(true);
        try {
            await authSendOtp({ email: form.email, purpose: "signup" });
            setStep("otp");
            startResendCooldown();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const startResendCooldown = () => {
        setResendCooldown(60);
        const interval = setInterval(() => {
            setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
        }, 1000);
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError("");
        setLoading(true);
        try {
            await authSendOtp({ email: form.email, purpose: "signup" });
            setOtp("");
            startResendCooldown();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP & Create Account ──────────────────────
    const handleVerifyAndSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) { setError("Please enter the full 6-digit OTP."); return; }
        setError("");
        setLoading(true);
        try {
            const verified = await authVerifyOtp({ email: form.email, otp, purpose: "signup" });
            setVerifiedToken(verified.verified_token);

            const res = await authSignup({
                email: form.email,
                password: form.password,
                display_name: form.displayName,
                role: form.role,
                otp_token: verified.verified_token,
            });
            setAuth({ token: res.access_token, userId: form.email, displayName: form.displayName, role: res.role });
            setStep("done");
            setTimeout(() => router.push("/"), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Shared card wrapper ───────────────────────────────────────
    const cardStyle: React.CSSProperties = {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "var(--bg-base)",
    };

    const boxStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "440px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "20px",
        padding: "clamp(1.5rem, 5vw, 2.5rem)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
    };

    const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" };
    const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

    // ── Render OTP step ───────────────────────────────────────────
    if (step === "otp" || step === "done") {
        return (
            <div style={cardStyle}>
                <div style={boxStyle}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6d28d9,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                        </div>
                        {step === "done" ? (
                            <>
                                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "#16a34a" }}>✓ Account Created!</h1>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Redirecting you to the platform…</p>
                            </>
                        ) : (
                            <>
                                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Verify Your Email</h1>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                                    We sent a 6-digit OTP to<br />
                                    <strong style={{ color: "var(--text-primary)" }}>{form.email}</strong>
                                </p>
                            </>
                        )}
                    </div>

                    {step === "otp" && (
                        <form onSubmit={handleVerifyAndSignup}>
                            <div style={{ marginBottom: "2rem" }}>
                                <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                            </div>

                            {error && (
                                <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1.25rem", textAlign: "center" }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: "1rem" }}>
                                {loading ? "Verifying…" : "Verify & Create Account"}
                            </button>

                            <div style={{ textAlign: "center" }}>
                                <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading} style={{ background: "none", border: "none", cursor: resendCooldown > 0 ? "default" : "pointer", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--brand-600)", fontSize: "0.875rem", fontWeight: 600 }}>
                                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                                </button>
                            </div>

                            <div style={{ textAlign: "center", marginTop: "1rem" }}>
                                <button type="button" onClick={() => { setStep("details"); setOtp(""); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                    ← Change email
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ── Render Details step ───────────────────────────────────────
    return (
        <div style={cardStyle}>
            <div style={boxStyle}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6d28d9,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                    </div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem" }}>Create Account</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Join Izra — verified via email OTP</p>
                </div>

                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={labelStyle}>Full Name</label>
                        <input name="displayName" type="text" placeholder="Your name" value={form.displayName} onChange={handleChange} required className="input" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Email Address</label>
                        <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required className="input" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Password</label>
                        <div style={{ position: "relative" }}>
                            <input name="password" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={handleChange} required className="input" style={{ ...inputStyle, paddingRight: "3rem" }} />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                                <EyeIcon show={showPw} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>I am a…</label>
                        <select name="role" value={form.role} onChange={handleChange} className="input" style={inputStyle}>
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="university_admin">University Admin</option>
                        </select>
                    </div>

                    {error && (
                        <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.875rem", textAlign: "center" }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                        {loading ? "Sending OTP…" : "Continue →"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <Link href="/auth/login" style={{ color: "var(--brand-600)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
