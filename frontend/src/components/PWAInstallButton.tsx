"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallButton({ variant = "navbar" }: { variant?: "navbar" | "hero" }) {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);

    useEffect(() => {
        // Check if already running as PWA
        if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
            setInstalled(true);
            return;
        }

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setIsIOS(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", () => {
            setInstalled(true);
            setInstallPrompt(null);
        });

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (installed || !installPrompt) return null;

    const handleInstall = async () => {
        if (!installPrompt) return;
        setInstalling(true);
        try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice.outcome === "accepted") {
                setInstalled(true);
            }
        } finally {
            setInstalling(false);
        }
    };

    if (isIOS && !installed) {
        return (
            <div style={{ position: "relative" }}>
                <button
                    onClick={() => setShowIOSPrompt(!showIOSPrompt)}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: variant === "hero" ? "0.875rem 1.5rem" : "0.5rem 0.875rem",
                        borderRadius: "10px",
                        background: variant === "hero" ? "linear-gradient(135deg, var(--brand-600), var(--accent-500))" : "var(--bg-subtle)",
                        color: variant === "hero" ? "white" : "var(--brand-600)",
                        border: variant === "hero" ? "none" : "1px solid var(--border)",
                        fontSize: variant === "hero" ? "1.0625rem" : "0.875rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: variant === "hero" ? "var(--shadow-brand)" : "none",
                        transition: "all 0.2s ease"
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Install App
                </button>

                {showIOSPrompt && (
                    <div style={{
                        position: "absolute",
                        top: "120%",
                        right: 0,
                        width: "220px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        padding: "1rem",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        animation: "slideDown 0.2s ease",
                        textAlign: "left"
                    }}>
                        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            To install <b>Izra</b>: <br />
                            1. Tap the <b>Share</b> button <svg style={{ display: "inline", verticalAlign: "middle" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg><br />
                            2. Select <b>"Add to Home Screen"</b>
                        </p>
                        <button onClick={() => setShowIOSPrompt(false)} style={{ marginTop: "0.75rem", width: "100%", padding: "0.5rem", background: "var(--bg-subtle)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>Got it</button>
                    </div>
                )}
            </div>
        )
    }

    if (variant === "hero") {
        return (
            <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.875rem 1.5rem",
                    borderRadius: "12px",
                    background: "var(--brand-600)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1.0625rem",
                    cursor: "pointer",
                    border: "none",
                    boxShadow: "0 4px 14px 0 rgba(124, 58, 237, 0.39)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    marginTop: "1.5rem",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(124, 58, 237, 0.5)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px 0 rgba(124, 58, 237, 0.39)";
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {installing ? "Downloading App..." : "Download Izra App"}
            </button>
        );
    }

    return (
        <button
            id="pwa-install-btn"
            onClick={handleInstall}
            disabled={installing}
            title="Install Izra as an App"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.875rem",
                borderRadius: "8px",
                border: "1.5px solid var(--brand-600)",
                background: "transparent",
                color: "var(--brand-600)",
                fontWeight: 700,
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-600)";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--brand-600)";
            }}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {installing ? "Installing..." : "Install App"}
        </button>
    );
}
