"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function UniversityAuthLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isAuthenticated) {
            router.push("/auth/login"); // Or /auth/signup if that's preferred
        }
    }, [mounted, isAuthenticated, router]);

    if (!mounted || !isAuthenticated) {
        // Prevent flashing the unauthenticated content
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid var(--border)", borderTopColor: "var(--brand-500)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return <>{children}</>;
}
