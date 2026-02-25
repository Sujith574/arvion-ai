/**
 * Zustand Global Store
 * =====================
 * Three slices: authSlice, chatSlice, uniSlice
 *
 * Auth slice   — JWT token, user info, role
 * Chat slice   — messages for current session, loading state
 * Uni slice    — selected university, list of universities
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, University } from "@/lib/api";

// ── Auth Slice ─────────────────────────────────────────────────
interface AuthState {
    token: string | null;
    userId: string | null;
    role: string | null;
    displayName: string | null;
    universityId: string | null;
    isAuthenticated: boolean;

    setAuth: (data: {
        token: string;
        userId: string;
        role: string;
        displayName?: string;
        universityId?: string;
    }) => void;
    logout: () => void;
}

// ── Chat Slice ─────────────────────────────────────────────────
interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    sessionId: string;
    categoryFilter: string | null;

    addMessage: (msg: ChatMessage) => void;
    setLoading: (v: boolean) => void;
    clearMessages: () => void;
    setCategoryFilter: (cat: string | null) => void;
}

// ── University Slice ───────────────────────────────────────────
interface UniState {
    selectedUniversity: University | null;
    universities: University[];
    theme: "light" | "dark";

    setSelectedUniversity: (uni: University) => void;
    setUniversities: (unis: University[]) => void;
    toggleTheme: () => void;
}

// ── Combined Store ─────────────────────────────────────────────
type Store = AuthState & ChatState & UniState;

export const useStore = create<Store>()(
    persist(
        (set, get) => ({
            // ── Auth ─────────────────────────────────────────────────
            token: null,
            userId: null,
            role: null,
            displayName: null,
            universityId: null,
            isAuthenticated: false,

            setAuth: ({ token, userId, role, displayName, universityId }) =>
                set({
                    token,
                    userId,
                    role,
                    displayName: displayName ?? null,
                    universityId: universityId ?? null,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    token: null,
                    userId: null,
                    role: null,
                    displayName: null,
                    universityId: null,
                    isAuthenticated: false,
                }),

            // ── Chat ─────────────────────────────────────────────────
            messages: [],
            isLoading: false,
            sessionId: Math.random().toString(36).slice(2),
            categoryFilter: null,

            addMessage: (msg) =>
                set((state) => ({ messages: [...state.messages, msg] })),

            setLoading: (v) => set({ isLoading: v }),

            clearMessages: () =>
                set({ messages: [], sessionId: Math.random().toString(36).slice(2) }),

            setCategoryFilter: (cat) => set({ categoryFilter: cat }),

            // ── Universities ──────────────────────────────────────────
            selectedUniversity: null,
            universities: [],
            theme: "light",

            setSelectedUniversity: (uni) => set({ selectedUniversity: uni }),

            setUniversities: (unis) => set({ universities: unis }),

            toggleTheme: () => {
                const next = get().theme === "light" ? "dark" : "light";
                set({ theme: next });
                document.documentElement.setAttribute("data-theme", next);
                try { localStorage.setItem("arvix-theme", next); } catch { }
            },
        }),
        {
            name: "arvix-store",
            // Only persist auth + theme (not chat messages)
            partialize: (state) => ({
                token: state.token,
                userId: state.userId,
                role: state.role,
                displayName: state.displayName,
                universityId: state.universityId,
                isAuthenticated: state.isAuthenticated,
                theme: state.theme,
            }),
        }
    )
);
