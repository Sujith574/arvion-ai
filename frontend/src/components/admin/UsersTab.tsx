"use client";
import { useState, useEffect } from "react";
import {
    listAllUsers, createUniversityAdmin,
    assignUniversity, activateUser, deactivateUser, deleteUser, listAllUniversities
} from "@/lib/api";

interface UsersTabProps {
    token: string;
}

export default function UsersTab({ token }: UsersTabProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    // Create form state
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newUniId, setNewUniId] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, uniRes] = await Promise.all([
                listAllUsers(token, filterRole || undefined),
                listAllUniversities(token),
            ]);
            setUsers(usersRes.users);
            setUniversities(uniRes.universities);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filterRole]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createUniversityAdmin({
                email: newEmail,
                display_name: newName,
                university_id: newUniId,
                password: newPassword,
            }, token);
            alert("University Admin created successfully!");
            setShowCreate(false);
            setNewEmail(""); setNewName(""); setNewUniId(""); setNewPassword("");
            fetchData();
        } catch (err: any) {
            alert(err.message || "Failed to create admin");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (user: any) => {
        const confirmed = confirm(`${user.is_active ? "Deactivate" : "Activate"} ${user.email}?`);
        if (!confirmed) return;
        try {
            if (user.is_active) {
                await deactivateUser(user.id, token);
            } else {
                await activateUser(user.id, token);
            }
            fetchData();
        } catch (err: any) {
            alert(err.message || "Action failed");
        }
    };

    const handleDelete = async (user: any) => {
        if (!confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return;
        try {
            await deleteUser(user.id, token);
            fetchData();
        } catch (err: any) {
            alert(err.message || "Delete failed");
        }
    };

    const handleAssignUni = async (uid: string) => {
        const uni = prompt("Enter university slug to assign (e.g. 'lpu'):");
        if (!uni) return;
        try {
            await assignUniversity(uid, uni.trim(), token);
            alert("University assigned!");
            fetchData();
        } catch (err: any) {
            alert(err.message || "Assignment failed");
        }
    };

    const roleBadgeColor: Record<string, string> = {
        super_admin: "#7c3aed",
        university_admin: "#2563eb",
        student: "#64748b",
        parent: "#64748b",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div className="card" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>👥 User Management</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Manage all users, assign roles and university access.</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="input"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                    >
                        <option value="">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="university_admin">University Admin</option>
                        <option value="student">Students</option>
                    </select>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="btn-primary"
                        style={{ padding: "0.5rem 1.25rem", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "0.875rem" }}
                    >
                        {showCreate ? "Cancel" : "+ Create University Admin"}
                    </button>
                </div>
            </div>

            {/* Create University Admin Form */}
            {showCreate && (
                <div className="card" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Create University Admin Account</h3>
                    <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>EMAIL</label>
                            <input required type="email" className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="admin@university.edu" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>DISPLAY NAME</label>
                            <input required className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>ASSIGN UNIVERSITY</label>
                            <select required className="input" value={newUniId} onChange={e => setNewUniId(e.target.value)}>
                                <option value="">Select University...</option>
                                {universities.map(u => (
                                    <option key={u.id} value={u.slug || u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>TEMP PASSWORD</label>
                            <input required type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: "0.75rem 2rem", borderRadius: "10px", border: "none", fontWeight: 700 }}>
                                {submitting ? "Creating..." : "Create University Admin"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            <div className="card" style={{ overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading users...</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                            <thead>
                                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                                    {["User", "Role", "University", "Status", "Actions"].map(h => (
                                        <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>No users found.</td></tr>
                                )}
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                        <td style={{ padding: "1rem 1.25rem" }}>
                                            <div style={{ fontWeight: 700 }}>{user.display_name || "—"}</div>
                                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: "1rem 1.25rem" }}>
                                            <span style={{
                                                fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: "6px", textTransform: "uppercase",
                                                background: `${roleBadgeColor[user.role] || "#64748b"}20`,
                                                color: roleBadgeColor[user.role] || "#64748b"
                                            }}>
                                                {user.role?.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>
                                            {user.university_id || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>}
                                        </td>
                                        <td style={{ padding: "1rem 1.25rem" }}>
                                            <span style={{
                                                fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: "6px",
                                                background: user.is_active !== false ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                                color: user.is_active !== false ? "#10b981" : "#ef4444"
                                            }}>
                                                {user.is_active !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem 1.25rem" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                {user.role !== "super_admin" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleActive(user)}
                                                            style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "white", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            {user.is_active !== false ? "Deactivate" : "Activate"}
                                                        </button>
                                                        {user.role === "university_admin" && (
                                                            <button
                                                                onClick={() => handleAssignUni(user.id)}
                                                                style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                                Re-assign
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                                {user.role === "super_admin" && (
                                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>Protected</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: "0.875rem 1.25rem", borderTop: "1px solid var(--border)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            {users.length} users shown
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
