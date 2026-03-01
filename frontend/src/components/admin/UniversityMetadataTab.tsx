import { useState, useEffect } from "react";
import { getUniversity, updateUniversity, type University } from "@/lib/api";
import FileManager from "./FileManager";

interface MetadataTabProps {
    token: string;
    universitySlug: string;
}

export default function UniversityMetadataTab({ token, universitySlug }: MetadataTabProps) {
    const [uni, setUni] = useState<University | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [established, setEstablished] = useState("");
    const [studentsCount, setStudentsCount] = useState("");
    const [programsCount, setProgramsCount] = useState("");
    const [accreditation, setAccreditation] = useState("");
    const [rankings, setRankings] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [heroImageUrl, setHeroImageUrl] = useState("");
    const [logoUrl, setLogoUrl] = useState("");

    // Stats array builder
    const [stats, setStats] = useState<Array<{ label: string; value: string; icon?: string }>>([]);
    const [newStatLabel, setNewStatLabel] = useState("");
    const [newStatValue, setNewStatValue] = useState("");

    const [showFilePicker, setShowFilePicker] = useState<"hero" | "logo" | null>(null);

    const fetchUni = async () => {
        setLoading(true);
        try {
            const res = await getUniversity(universitySlug);
            const data = res.university;
            setUni(data);
            setName(data.name || "");
            setDescription(data.description || "");
            setLocation(data.location || "");
            setEstablished(data.established || "");
            setStudentsCount(data.students_count || "");
            setProgramsCount(data.programs_count || "");
            setAccreditation(data.accreditation || "");
            setRankings(data.rankings || "");
            setWebsiteUrl(data.website_url || "");
            setHeroImageUrl(data.hero_image_url || "");
            setLogoUrl(data.logo_url || "");
            setStats(data.stats || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUni();
    }, [universitySlug]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name,
                description,
                location,
                established,
                students_count: studentsCount,
                programs_count: programsCount,
                accreditation,
                rankings,
                website_url: websiteUrl,
                hero_image_url: heroImageUrl,
                logo_url: logoUrl,
                stats
            };
            await updateUniversity(universitySlug, payload, token);
            alert("University profile updated successfully!");
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const addStat = () => {
        if (!newStatLabel || !newStatValue) return;
        setStats([...stats, { label: newStatLabel, value: newStatValue }]);
        setNewStatLabel("");
        setNewStatValue("");
    };

    const removeStat = (index: number) => {
        setStats(stats.filter((_, i) => i !== index));
    };

    const onFileSelected = (file: any) => {
        if (showFilePicker === "hero") setHeroImageUrl(file.url);
        if (showFilePicker === "logo") setLogoUrl(file.url);
        setShowFilePicker(null);
    };

    if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Loading profile...</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* File Picker Modal */}
            {showFilePicker && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", backdropFilter: "blur(4px)" }}>
                    <div className="card" style={{ maxWidth: "800px", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Select {showFilePicker === "hero" ? "Hero Image" : "Logo"}</h2>
                            <button onClick={() => setShowFilePicker(null)} style={{ border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
                        </div>
                        <FileManager token={token} universitySlug={universitySlug} onSelect={onFileSelected} />
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="admin-two-col" style={{ alignItems: "start" }}>

                {/* ── Left Column: Basic Info ────────────────────── */}
                <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>University Overview</h2>

                    <div>
                        <label className="label-sm">UNIVERSITY NAME</label>
                        <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div>
                        <label className="label-sm">DESCRIPTION</label>
                        <textarea className="input" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label className="label-sm">LOCATION</label>
                            <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Punjab, India" />
                        </div>
                        <div>
                            <label className="label-sm">ESTABLISHED</label>
                            <input className="input" value={established} onChange={e => setEstablished(e.target.value)} placeholder="e.g. 2005" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label className="label-sm">STUDENT COUNT</label>
                            <input className="input" value={studentsCount} onChange={e => setStudentsCount(e.target.value)} placeholder="e.g. 30,000+" />
                        </div>
                        <div>
                            <label className="label-sm">PROGRAMS COUNT</label>
                            <input className="input" value={programsCount} onChange={e => setProgramsCount(e.target.value)} placeholder="e.g. 150+" />
                        </div>
                    </div>

                    <div>
                        <label className="label-sm">WEBSITE URL</label>
                        <input className="input" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." />
                    </div>
                </div>

                {/* ── Right Column: Appearance & Stats ────────────── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    {/* Visuals */}
                    <div className="card" style={{ padding: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1.25rem" }}>Branding & Media</h2>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label className="label-sm">HERO IMAGE (BANNER)</label>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                {heroImageUrl && <img src={heroImageUrl} style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "6px" }} alt="Hero" />}
                                <button type="button" onClick={() => setShowFilePicker("hero")} className="btn-secondary" style={{ flex: 1 }}>{heroImageUrl ? "Change Banner" : "Select Banner"}</button>
                            </div>
                        </div>

                        <div>
                            <label className="label-sm">UNIVERSITY LOGO</label>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                {logoUrl && <img src={logoUrl} style={{ width: "50px", height: "50px", objectFit: "contain", borderRadius: "50%", background: "#f8fafc" }} alt="Logo" />}
                                <button type="button" onClick={() => setShowFilePicker("logo")} className="btn-secondary" style={{ flex: 1 }}>{logoUrl ? "Change Logo" : "Select Logo"}</button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card Builder */}
                    <div className="card" style={{ padding: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1.25rem" }}>Stats Cards</h2>

                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                            <input placeholder="Label" className="input" style={{ fontSize: "0.8125rem" }} value={newStatLabel} onChange={e => setNewStatLabel(e.target.value)} />
                            <input placeholder="Value" className="input" style={{ fontSize: "0.8125rem" }} value={newStatValue} onChange={e => setNewStatValue(e.target.value)} />
                            <button type="button" onClick={addStat} className="btn-primary" style={{ padding: "0 1rem" }}>+</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {stats.map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", fontSize: "0.875rem" }}>
                                    <div>
                                        <span style={{ fontWeight: 800 }}>{s.value}</span>
                                        <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>{s.label}</span>
                                    </div>
                                    <button type="button" onClick={() => removeStat(i)} style={{ border: "none", background: "none", color: "#f43f5e", cursor: "pointer" }}>&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "1.25rem", borderRadius: "12px", width: "100%", border: "none" }}>
                        {saving ? "Saving Changes..." : "🚀 Update University Profile"}
                    </button>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                        Changes reflect instantly on the public university page.
                    </p>
                </div>

            </form>

            <style jsx>{`
                .label-sm {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    margin-bottom: 0.4rem;
                }
            `}</style>
        </div>
    );
}
