"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authSendOtp, authVerifyOtp, authResetPassword } from "@/lib/api";
import OtpInput from "@/components/OtpInput";

type Step = "email" | "otp" | "password" | "done";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [verifiedToken, setVerifiedToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const startResendCooldown = () => {
        setResendCooldown(60);
        const interval = setInterval(() => {
            setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
        }, 1000);
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authSendOtp({ email, purpose: "reset" });
            setStep("otp");
            startResendCooldown();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) { setError("Please enter the full 6-digit OTP."); return; }
        setError("");
        setLoading(true);
        try {
            const res = await authVerifyOtp({ email, otp, purpose: "reset" });
            setVerifiedToken(res.verified_token);
            setStep("password");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        setError("");
        setLoading(true);
        try {
            await authResetPassword({ email, new_password: newPassword, otp_token: verifiedToken });
            setStep("done");
            setTimeout(() => router.push("/auth/login"), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    const cardStyle: React.CSSProperties = {
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", background: "var(--bg-base)",
    };
    const boxStyle: React.CSSProperties = {
        width: "100%", maxWidth: "440px", background: "var(--bg-card)",
        border: "1px solid var(--border)", borderRadius: "20px",
        padding: "clamp(1.5rem, 5vw, 2.5rem)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
    };
    const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" };
    const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

    const Logo = () => (
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6d28d9,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
        </div>
    );

    const ErrorBanner = () => error ? (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1.25rem", textAlign: "center" }}>
            {error}
        </div>
    ) : null;

    if (step === "done") return (
        <div style={cardStyle}><div style={boxStyle}>
            <div style={{ textAlign: "center" }}>
                <Logo />
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginBottom: "0.5rem" }}>✓ Password Reset!</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Your password has been updated. Redirecting to login…</p>
            </div>
        </div></div>
    );

    if (step === "password") return (
        <div style={cardStyle}><div style={boxStyle}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <Logo />
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem" }}>Set New Password</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Create a strong new password for your account</p>
            </div>
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                    <label style={labelStyle}>New Password</label>
                    <div style={{ position: "relative" }}>
                        <input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required className="input" style={{ ...inputStyle, paddingRight: "3rem" }} />
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required className="input" style={inputStyle} />
                </div>
                <ErrorBanner />
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    {loading ? "Saving…" : "Set New Password"}
                </button>
            </form>
        </div></div>
    );

    if (step === "otp") return (
        <div style={cardStyle}><div style={boxStyle}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <Logo />
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem" }}>Check Your Email</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    We sent a 6-digit OTP to<br />
                    <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
                </p>
            </div>
            <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: "2rem" }}>
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                </div>
                <ErrorBanner />
                <button type="submit" disabled={loading || otp.length < 6} className="btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: "1rem" }}>
                    {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <div style={{ textAlign: "center" }}>
                    <button type="button" onClick={async () => { if (resendCooldown > 0) return; setOtp(""); await handleResendOtp(); }} disabled={resendCooldown > 0 || loading} style={{ background: "none", border: "none", cursor: resendCooldown > 0 ? "default" : "pointer", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--brand-600)", fontSize: "0.875rem", fontWeight: 600 }}>
                        {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                </div>
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                    <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        ← Change email
                    </button>
                </div>
            </form>
        </div></div>
    );

    async function handleResendOtp() {
        setError(""); setLoading(true);
        try { await authSendOtp({ email, purpose: "reset" }); startResendCooldown(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to resend."); }
        finally { setLoading(false); }
    }

    return (
        <div style={cardStyle}><div style={boxStyle}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <Logo />
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem" }}>Forgot Password?</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Enter your email and we&apos;ll send a verification code</p>
            </div>
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="input" style={inputStyle} />
                </div>
                <ErrorBanner />
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    {loading ? "Sending OTP…" : "Send Verification Code"}
                </button>
            </form>
            <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Remember your password?{" "}
                <Link href="/auth/login" style={{ color: "var(--brand-600)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
        </div></div>
    );
}
