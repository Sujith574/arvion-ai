import { useState, useEffect } from "react";
import { getEmergencyContacts, upsertEmergencyContact, deleteEmergencyCategory } from "@/lib/api";

interface EmergencyTabProps {
    token: string;
    universitySlug: string;
}

interface Contact {
    name: string;
    phone: string;
    alternate_phone?: string;
    email?: string;
    available: string;
}

export default function EmergencyTab({ token, universitySlug }: EmergencyTabProps) {
    const [emergencyData, setEmergencyData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Simple role check from token
    const isSuper = token ? JSON.parse(atob(token.split('.')[1])).role === "super_admin" : false;

    // Form state
    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [icon, setIcon] = useState("🏥");
    const [location, setLocation] = useState("");
    const [priority, setPriority] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [newStep, setNewStep] = useState("");
    const [steps, setSteps] = useState<string[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);

    // Contact form state
    const [cName, setCName] = useState("");
    const [cPhone, setCPhone] = useState("");
    const [cAltPhone, setCAltPhone] = useState("");
    const [cEmail, setCEmail] = useState("");
    const [cAvailable, setCAvailable] = useState("24/7");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getEmergencyContacts(universitySlug);
            setEmergencyData(res.emergency || {});
        } catch (err) {
            console.error("Failed to fetch emergency data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [universitySlug]);

    const resetForm = () => {
        setCategory("");
        setTitle("");
        setIcon("🏥");
        setLocation("");
        setPriority(0);
        setIsLocked(false);
        setSteps([]);
        setContacts([]);
        setNewStep("");
    };

    const handleEdit = (catKey: string, data: any) => {
        setCategory(catKey);
        setTitle(data.title);
        setIcon(data.icon || "🏥");
        setLocation(data.location || "");
        setPriority(data.priority || 0);
        setIsLocked(data.is_locked || false);
        setSteps(data.steps || []);
        setContacts(data.contacts || []);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category) {
            alert("Please provide a category key (e.g. 'medical')");
            return;
        }
        setSubmitting(true);
        try {
            const data = {
                category,
                title,
                icon,
                location,
                steps,
                contacts,
                priority,
                is_active: true,
                is_locked: isLocked
            };
            await upsertEmergencyContact(universitySlug, data, token);
            alert("Emergency category saved successfully!");
            resetForm();
            fetchData();
        } catch (err: any) {
            alert("Save failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (catKey: string) => {
        if (!confirm(`Are you sure you want to soft-delete the '${catKey}' emergency category?`)) return;
        try {
            await deleteEmergencyCategory(universitySlug, catKey, token);
            fetchData();
        } catch (err: any) {
            alert("Delete failed: " + (err.response?.data?.detail || err.message));
        }
    };

    const addStep = () => {
        if (!newStep.trim()) return;
        setSteps([...steps, newStep.trim()]);
        setNewStep("");
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const addContact = () => {
        if (!cName || !cPhone) return;
        setContacts([...contacts, {
            name: cName,
            phone: cPhone,
            alternate_phone: cAltPhone || undefined,
            email: cEmail || undefined,
            available: cAvailable
        }]);
        setCName("");
        setCPhone("");
        setCAltPhone("");
        setCEmail("");
        setCAvailable("24/7");
    };

    const removeContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index));
    };

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading emergency contacts...</div>;

    const categoriesList = Object.entries(emergencyData);

    return (
        <div className="admin-two-col">
            {/* ── Editor Card ─────────────────────────── */}
            <div className="card" style={{ padding: "1.75rem", alignSelf: "start" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--brand-700)" }}>Manage Category</h2>
                    {isSuper && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontWeight: 700, background: isLocked ? "#fee2e2" : "#f0fdf4", color: isLocked ? "#ef4444" : "#16a34a", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                            <input type="checkbox" checked={isLocked} onChange={e => setIsLocked(e.target.checked)} id="locked-chk" />
                            <label htmlFor="locked-chk">GLOBAL LOCK</label>
                        </div>
                    )}
                </div>
                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>CATEGORY KEY</label>
                            <input required className="input" value={category} onChange={e => setCategory(e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="e.g. medical" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>ICON</label>
                            <input className="input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏥" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>DISPLAY TITLE</label>
                            <input required className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Medical Emergency" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>PRIORITY</label>
                            <input type="number" className="input" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.4rem" }}>LOCATION</label>
                        <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. University Hospital, Block A" />
                    </div>

                    {/* Contacts Builder */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", background: "var(--bg-subtle)" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--brand-600)", marginBottom: "0.75rem" }}>CONTACT DETAILS</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <input placeholder="Name (e.g. Reception)" className="input" style={{ fontSize: "0.8125rem" }} value={cName} onChange={e => setCName(e.target.value)} />
                                <input placeholder="Email (Optional)" className="input" style={{ fontSize: "0.8125rem" }} value={cEmail} onChange={e => setCEmail(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <input placeholder="Phone" className="input" style={{ flex: 1.5, fontSize: "0.8125rem" }} value={cPhone} onChange={e => setCPhone(e.target.value)} />
                                <input placeholder="Alt Phone" className="input" style={{ flex: 1.5, fontSize: "0.8125rem" }} value={cAltPhone} onChange={e => setCAltPhone(e.target.value)} />
                                <input placeholder="24/7" className="input" style={{ flex: 1, fontSize: "0.8125rem" }} value={cAvailable} onChange={e => setCAvailable(e.target.value)} />
                                <button type="button" onClick={addContact} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "var(--brand-600)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>+</button>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {contacts.map((c, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", background: "white", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8125rem" }}>
                                    <div>
                                        <strong>{c.name}:</strong> {c.phone}
                                        {c.alternate_phone && <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({c.alternate_phone})</span>}
                                        <div style={{ fontSize: "0.7rem", color: "var(--brand-600)" }}>{c.available} {c.email && `| ${c.email}`}</div>
                                    </div>
                                    <button type="button" onClick={() => removeContact(i)} style={{ border: "none", background: "none", color: "#f43f5e", cursor: "pointer", fontWeight: 800 }}>&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Steps Builder */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", background: "var(--bg-subtle)" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--brand-600)", marginBottom: "0.75rem" }}>PROCEDURE STEPS</label>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                            <input placeholder="e.g. Call the main line first" className="input" style={{ fontSize: "0.8125rem" }} value={newStep} onChange={e => setNewStep(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addStep())} />
                            <button type="button" onClick={addStep} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "var(--brand-600)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>Add</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {steps.map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.75rem", background: "white", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    <span>{i + 1}. {s}</span>
                                    <button type="button" onClick={() => removeStep(i)} style={{ border: "none", background: "none", color: "#f43f5e", cursor: "pointer" }}>🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button type="button" onClick={resetForm} style={{ flex: 1, padding: "0.875rem", borderRadius: "12px", background: "var(--bg-subtle)", border: "1px solid var(--border)", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                        <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 2, padding: "0.875rem", borderRadius: "12px", border: "none" }}>
                            {submitting ? "Saving..." : "Save Category"}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── List Card ───────────────────────────── */}
            <div className="card" style={{ padding: "1.75rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>Existing Categories</h2>
                {categoriesList.length === 0 ? (
                    <div style={{ padding: "4rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "12px", color: "var(--text-muted)" }}>
                        No emergency categories found. Click 'Save Category' to create the first one.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {categoriesList.map(([key, data]) => (
                            <div key={key} style={{ padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-subtle)", position: "relative" }}>
                                {data.is_locked && <div style={{ position: "absolute", top: "-10px", left: "20px", background: "#ef4444", color: "white", fontSize: "0.6rem", fontWeight: 900, padding: "2px 8px", borderRadius: "4px" }}>LOCKED</div>}
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "1.5rem" }}>{data.icon}</span>
                                    <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{data.title}</h3>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "white", padding: "0.2rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>v{data.version || 1}</span>
                                </div>
                                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>📍 {data.location || "No location specified"}</p>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                    {data.contacts?.map((c: any, i: number) => (
                                        <div key={i} style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", background: "white", border: "1px solid var(--border)", borderRadius: "6px" }}>
                                            📞 {c.phone}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", gap: "0.5rem" }}>
                                    <button onClick={() => handleEdit(key, data)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--border)", background: "white", cursor: "pointer" }}>✏️</button>
                                    <button onClick={() => handleDelete(key)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", cursor: "pointer" }}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
