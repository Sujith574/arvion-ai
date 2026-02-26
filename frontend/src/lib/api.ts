/**
 * API Client for Arvix AI Backend
 * ====================================
 * Typed wrapper around all backend REST endpoints.
 */

const envUrl = process.env.NEXT_PUBLIC_API_URL;
let base = (envUrl && envUrl !== "undefined")
    ? envUrl
    : "https://arvion-backend-348624065149.us-central1.run.app";

// Normalize: remove trailing slash
export const API_BASE = base.endsWith("/") ? base.slice(0, -1) : base;

// ── Types ──────────────────────────────────────────────────────
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    category?: string;
    confidence?: number;
    sources?: string[];
    used_fallback?: boolean;
    timestamp: string;
    query_id?: string;
}

export interface University {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    location?: string;
    description?: string;
    established?: string;
    students_count?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    role: string;
    university_id?: string;
    display_name?: string;
}

export interface EmergencyCategory {
    title: string;
    icon: string;
    contacts: Array<{ name: string; phone: string; available: string }>;
    location: string;
    steps: string[];
}

// ── Helpers ────────────────────────────────────────────────────
function getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));

        let message = "An error occurred";
        if (typeof err.detail === "string") {
            message = err.detail;
        } else if (Array.isArray(err.detail)) {
            // Handle Pydantic validation errors
            message = err.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
        } else if (err.detail && typeof err.detail === "object") {
            message = err.detail.message || err.detail.error || JSON.stringify(err.detail);
        } else if (err.message) {
            message = err.message;
        } else if (err.error) {
            message = err.error;
        } else {
            message = `HTTP ${res.status}: ${res.statusText}`;
        }

        throw new Error(message);
    }
    return res.json();
}

// ── Auth API ───────────────────────────────────────────────────
export async function authSendOtp(data: { email: string; purpose: "signup" | "reset" }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function authVerifyOtp(data: { email: string; otp: string; purpose: "signup" | "reset" }): Promise<{ verified: boolean; verified_token: string; email: string }> {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function authSignup(data: {
    email: string;
    password: string;
    display_name: string;
    university_id?: string;
    role?: string;
    otp_token: string;
}): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(res);
}

export async function authLogin(data: {
    email: string;
    password: string;
}): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/token`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(res);
}

export async function authResetPassword(data: {
    email: string;
    new_password: string;
    otp_token: string;
}): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Universities API ───────────────────────────────────────────
export async function getUniversities(): Promise<{ universities: University[] }> {
    const res = await fetch(`${API_BASE}/api/universities/`);
    return handleResponse(res);
}

export async function getUniversity(slug: string): Promise<{ university: University }> {
    const res = await fetch(`${API_BASE}/api/universities/${slug}`);
    return handleResponse(res);
}

export async function requestUniversity(data: {
    university_name: string;
    email: string;
    contact_details?: string;
}): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/universities/request`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Chat API ───────────────────────────────────────────────────
export interface ChatRequest {
    university_slug: string;
    query: string;
    session_id?: string;
    category_filter?: string;
    user_id?: string;
}

export interface ChatResponse {
    answer: string;
    category?: string;
    confidence: number;
    sources: string[];
    used_fallback: boolean;
    query_id: string;
}

export async function sendChatMessage(
    data: ChatRequest,
    token?: string
): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse<ChatResponse>(res);
}

export async function sendChatFeedback(data: {
    query_id: string;
    rating: number;
    university_slug: string;
    comment?: string;
}, token?: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/chat/feedback`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Emergency API ──────────────────────────────────────────────
export async function getEmergencyContacts(
    universitySlug: string
): Promise<{ emergency: Record<string, EmergencyCategory> }> {
    const res = await fetch(`${API_BASE}/api/emergency/${universitySlug}`);
    return handleResponse(res);
}

// ── Admin API ──────────────────────────────────────────────────
export async function getAdminStats(
    universitySlug: string,
    token: string
): Promise<{
    total_queries: number;
    avg_confidence: number;
    fallback_rate: number;
    low_confidence_count: number;
    categories: Record<string, number>;
}> {
    const res = await fetch(`${API_BASE}/api/admin/stats/${universitySlug}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function getQueryLogs(
    universitySlug: string,
    token: string,
    limit = 50
): Promise<{ logs: any[]; total: number }> {
    const res = await fetch(
        `${API_BASE}/api/admin/logs/${universitySlug}?limit=${limit}`,
        { headers: getHeaders(token) }
    );
    return handleResponse(res);
}

export async function getChatFeedback(
    universitySlug: string,
    token: string,
    limit = 50
): Promise<{ feedback: any[]; total: number }> {
    const res = await fetch(
        `${API_BASE}/api/admin/feedback/${universitySlug}?limit=${limit}`,
        { headers: getHeaders(token) }
    );
    return handleResponse(res);
}

// ── Knowledge API ──────────────────────────────────────────────
export async function getKnowledgeEntries(universitySlug: string, token: string) {
    const res = await fetch(`${API_BASE}/api/knowledge/${universitySlug}`, {
        headers: getHeaders(token),
    });
    return handleResponse<{ entries: any[]; total: number }>(res);
}

export async function addKnowledgeEntry(data: any, token: string) {
    const res = await fetch(`${API_BASE}/api/knowledge/`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; id: string }>(res);
}

export async function deleteKnowledgeEntry(entryId: string, universitySlug: string, token: string) {
    const res = await fetch(`${API_BASE}/api/knowledge/${entryId}?university_id=${universitySlug}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    return handleResponse<{ message: string }>(res);
}

// ── Admin Super API ────────────────────────────────────────────
export async function addUniversity(data: any, token: string) {
    const res = await fetch(`${API_BASE}/api/admin/universities`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; slug: string }>(res);
}

export async function getUniversityRequests(token: string) {
    const res = await fetch(`${API_BASE}/api/admin/university-requests`, {
        headers: getHeaders(token),
    });
    return handleResponse<{ requests: any[] }>(res);
}

export async function approveUniversityRequest(requestId: string, token: string) {
    const res = await fetch(`${API_BASE}/api/admin/university-requests/${requestId}/approve`, {
        method: "POST",
        headers: getHeaders(token),
    });
    return handleResponse<{ message: string }>(res);
}

export async function updateUniversity(slug: string, data: any, token: string) {
    const res = await fetch(`${API_BASE}/api/admin/universities/${slug}`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(res);
}

export async function deleteUniversity(slug: string, token: string) {
    const res = await fetch(`${API_BASE}/api/admin/universities/${slug}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    return handleResponse<{ message: string }>(res);
}

// ── Data Upload API ────────────────────────────────────────────
export async function uploadDataFile(
    universitySlug: string,
    file: File,
    replaceExisting: boolean,
    token: string
) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("replace_existing", replaceExisting ? "true" : "false");
    const res = await fetch(`${API_BASE}/api/data/upload/${universitySlug}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    return handleResponse<{ message: string; created: number; skipped: number; filename: string }>(res);
}

export async function getDataFiles(universitySlug: string, token: string) {
    const res = await fetch(`${API_BASE}/api/data/files/${universitySlug}`, {
        headers: getHeaders(token),
    });
    return handleResponse<{ uploaded_files: any[]; total_knowledge_entries: number }>(res);
}

export async function deleteAllEntries(universitySlug: string, token: string) {
    const res = await fetch(`${API_BASE}/api/data/entries/${universitySlug}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    return handleResponse<{ message: string; count: number }>(res);
}

export async function listAllUniversities(token: string) {
    const res = await fetch(`${API_BASE}/api/universities/`, {
        headers: getHeaders(token),
    });
    return handleResponse<{ universities: University[] }>(res);
}
