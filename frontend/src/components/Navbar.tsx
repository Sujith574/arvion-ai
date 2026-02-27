"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PWAInstallButton from "@/components/PWAInstallButton";

// ΓöÇΓöÇ Icons (inline SVG to avoid extra deps) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const BrainIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
        <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
        <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
        <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
        <path d="M6 18a4 4 0 0 1-1.967-.516" />
        <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
);

const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
);

const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
);

const MenuIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
);

const XIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export default function Navbar() {
    const { theme, toggleTheme, isAuthenticated, displayName, role, logout } = useStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Sync theme on mount
    useEffect(() => {
        const saved = localStorage.getItem("arvix-theme") as "light" | "dark" | null;
        if (saved) document.documentElement.setAttribute("data-theme", saved);
    }, [theme]);

    const handleLogout = () => {
        logout();
        // Replace so back button cannot return to protected routes
        router.replace("/auth/login");
        setShowLogoutModal(false);
        setMenuOpen(false);
    };

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/#universities", label: "Universities" },
        { href: "/#features", label: "Features" },
        { href: "/#how-it-works", label: "How It Works" },
    ];

    return (
        <>
            <header
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    transition: "all 0.3s ease",
                    backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
                    WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
                    background: scrolled
                        ? "var(--surface)"
                        : "transparent",
                    borderBottom: scrolled
                        ? "1px solid var(--border)"
                        : "1px solid transparent",
                    boxShadow: scrolled ? "var(--shadow-sm)" : "none",
                    paddingTop: "env(safe-area-inset-top, 0px)",
                }}
            >
                <nav
                    style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        padding: "0 1.5rem",
                        height: "4rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                    }}
                >
                    {/* Logo */}
                    <Link
                        href="/"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            textDecoration: "none",
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: "var(--shadow-brand)",
                            }}
                        >
                            <BrainIcon />
                        </div>
                        <span
                            style={{
                                fontSize: "1.125rem",
                                fontWeight: 800,
                                fontFamily: "var(--font-plus-jakarta), sans-serif",
                                background: "linear-gradient(135deg, var(--brand-600), var(--accent-500))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            Arvix AI
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div
                        className="desktop-nav"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                        }}
                    >
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className={`nav-link ${pathname === link.href ? "active" : ""}`}
                            >
                                {link.label}
                            </a>
                        ))}
                        {(role === "university_admin" || role === "super_admin") && (
                            <Link href="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`} style={{ color: "var(--brand-600)", fontWeight: 700 }}>
                                Admin Dashboard
                            </Link>
                        )}
                    </div>

                    {/* Right side */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* PWA Install */}
                        <PWAInstallButton />
                        {/* Theme Toggle */}
                        <button
                            id="theme-toggle"
                            onClick={toggleTheme}
                            className="btn-ghost"
                            aria-label="Toggle theme"
                            style={{
                                width: "36px",
                                height: "36px",
                                padding: 0,
                                borderRadius: "10px",
                                border: "1.5px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                        </button>

                        {/* Desktop Auth */}
                        <div className="desktop-auth" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isAuthenticated ? (
                                <>
                                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                        {displayName?.split(" ")[0]}
                                    </span>
                                    <button
                                        onClick={() => setShowLogoutModal(true)}
                                        className="btn-secondary"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.875rem" }}
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth/login" className="btn-ghost" style={{ fontSize: "0.9rem" }}>Login</Link>
                                    <Link href="/auth/signup" className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu Button */}
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label="Menu"
                            style={{
                                width: "36px",
                                height: "36px",
                                padding: 0,
                                borderRadius: "10px",
                                border: "1.5px solid var(--border)",
                                background: "transparent",
                                color: "var(--text-primary)",
                                display: "none",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                            }}
                        >
                            {menuOpen ? <XIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu Drawer */}
                {menuOpen && (
                    <div
                        style={{
                            borderTop: "1px solid var(--border)",
                            background: "var(--surface)",
                            padding: "1rem 1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                        }}
                    >
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="nav-link"
                                onClick={() => setMenuOpen(false)}
                                style={{ display: "block", padding: "0.625rem 0.75rem" }}
                            >
                                {link.label}
                            </a>
                        ))}
                        {(role === "university_admin" || role === "super_admin") && (
                            <Link href="/admin" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "0.625rem 0.75rem", color: "var(--brand-600)", fontWeight: 700 }}>
                                Admin Dashboard
                            </Link>
                        )}

                        {/* Divider */}
                        <div style={{ height: "1px", background: "var(--border)", margin: "0.5rem 0" }} />

                        {!isAuthenticated ? (
                            <>
                                <Link href="/auth/login" className="nav-link" onClick={() => setMenuOpen(false)}>Login</Link>
                                <Link href="/auth/signup" className="btn-primary" style={{ marginTop: "0.5rem", textAlign: "center" }} onClick={() => setMenuOpen(false)}>
                                    Get Started
                                </Link>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    padding: "0.5rem 0.75rem",
                                    fontSize: "0.8125rem",
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                }}>
                                    Signed in as <strong style={{ color: "var(--text-primary)" }}>{displayName?.split(" ")[0]}</strong>
                                </div>
                                <button
                                    onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "10px",
                                        border: "1.5px solid #fecaca",
                                        background: "#fff1f2",
                                        color: "#be123c",
                                        fontWeight: 700,
                                        fontSize: "0.9375rem",
                                        cursor: "pointer",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    <LogoutIcon />
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                )}
            </header>

            {/* ΓöÇΓöÇ Logout Confirmation Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            {showLogoutModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.6)",
                        zIndex: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1.5rem",
                        backdropFilter: "blur(4px)",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutModal(false); }}
                >
                    <div
                        style={{
                            background: "var(--surface)",
                            borderRadius: "20px",
                            padding: "2rem",
                            maxWidth: "340px",
                            width: "100%",
                            textAlign: "center",
                            border: "1px solid var(--border)",
                            boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                            animation: "modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "16px",
                            background: "#fff1f2",
                            border: "1.5px solid #fecaca",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 1.25rem",
                            color: "#be123c",
                        }}>
                            <LogoutIcon />
                        </div>

                        <h3 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                            Log out?
                        </h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                            You will be signed out of your account and redirected to the login page.
                        </p>

                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    borderRadius: "12px",
                                    border: "1.5px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--text-secondary)",
                                    fontWeight: 600,
                                    fontSize: "0.9375rem",
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #ef4444, #be123c)",
                                    color: "white",
                                    fontWeight: 700,
                                    fontSize: "0.9375rem",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes modalIn {
                            from { opacity: 0; transform: scale(0.92) translateY(16px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-auth { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
        </>
    );
}
