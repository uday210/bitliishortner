"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface LinkItem {
  id: string;
  slug: string;
  originalUrl: string;
  title: string | null;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
  password: string | null;
  tags: string[];
  isActive: boolean;
  source: string | null;
}

interface Profile {
  email: string;
  subscription: "free" | "basic" | "premium" | "unlimited";
  limit: number | null;
  todayCount: number;
  telegramConnected: boolean;
}

interface ImportResult {
  url: string;
  slug: string;
  success: boolean;
  error?: string;
}

const PLAN_CONFIG = {
  free:      { label: "Free",      color: "bg-gray-100 text-gray-600" },
  basic:     { label: "Basic",     color: "bg-blue-100 text-blue-700" },
  premium:   { label: "Premium",   color: "bg-violet-100 text-violet-700" },
  unlimited: { label: "Unlimited", color: "bg-emerald-100 text-emerald-700" },
};

const EXPIRY_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "1 day", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function expiryLabel(expiresAt: string | null): { label: string; color: string } | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return { label: "Expired", color: "bg-red-100 text-red-600" };
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return { label: "Expires today", color: "bg-orange-100 text-orange-600" };
  if (days <= 7) return { label: `${days}d left`, color: "bg-yellow-100 text-yellow-700" };
  return { label: `${days}d left`, color: "bg-gray-100 text-gray-500" };
}

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Shorten form
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [shortening, setShortening] = useState(false);
  const [shortenError, setShortenError] = useState("");
  const [newLink, setNewLink] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Dashboard
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<"links" | "import">("links");
  const [groupByDomain, setGroupByDomain] = useState(false);

  // Import
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  // Telegram
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);

  // Edit modal
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editExpiresInDays, setEditExpiresInDays] = useState(0);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchData = useCallback(async () => {
    const [linksRes, profileRes] = await Promise.all([fetch("/api/links"), fetch("/api/profile")]);
    if (linksRes.ok) setLinks(await linksRes.json());
    if (profileRes.ok) setProfile(await profileRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Tag input
  function addTag(val: string) {
    const t = val.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }

  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    setShortenError("");
    setShortening(true);
    setNewLink(null);
    setCopied(false);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, slug: slug || undefined, password: password || undefined, tags, expiresInDays: expiresInDays || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setShortenError(data.error || "Something went wrong"); }
      else {
        setNewLink(data);
        setLinks((prev) => [data, ...prev]);
        setProfile((p) => p ? { ...p, todayCount: p.todayCount + 1 } : p);
        setUrl(""); setSlug(""); setPassword(""); setTags([]); setTagInput(""); setExpiresInDays(0); setShowAdvanced(false);
      }
    } catch { setShortenError("Network error."); }
    finally { setShortening(false); }
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(`${baseUrl}/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function copyNewLink() {
    if (!newLink) return;
    await navigator.clipboard.writeText(`${baseUrl}/${newLink.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deleteLink(id: string) {
    setDeletingId(id);
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  async function toggleActive(link: LinkItem) {
    await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !link.isActive }),
    });
    setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, isActive: !l.isActive } : l));
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvRows(parseCSV(text));
      setImportResults(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    setImportResults(null);
    try {
      const res = await fetch("/api/links/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvRows.map((r) => ({ url: r.url, slug: r.slug, title: r.title, tags: r.tags, expiresInDays: r.expires_in_days ? Number(r.expires_in_days) : 0 })) }),
      });
      const data = await res.json();
      setImportResults(data.results);
      await fetchData();
    } catch { /* ignore */ }
    finally { setImporting(false); }
  }

  function openEdit(link: LinkItem) {
    setEditingLink(link);
    setEditTitle(link.title ?? "");
    setEditPassword(link.password ?? "");
    setEditTags(link.tags ?? []);
    setEditTagInput("");
    // Calculate days remaining if expiresAt set
    if (link.expiresAt) {
      const days = Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86400000);
      setEditExpiresInDays(Math.max(days, 0));
    } else {
      setEditExpiresInDays(0);
    }
  }

  async function handleEditSave() {
    if (!editingLink) return;
    setEditSaving(true);
    try {
      let expiresAt: string | null = null;
      if (editExpiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + editExpiresInDays);
        expiresAt = d.toISOString();
      }
      const res = await fetch(`/api/links/${editingLink.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || null,
          password: editPassword.trim() || null,
          tags: editTags,
          expiresAt,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLinks((prev) => prev.map((l) => l.id === updated.id ? updated : l));
        setEditingLink(null);
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleTelegramConnect() {
    setTelegramConnecting(true);
    setTelegramDeepLink(null);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const data = await res.json();
      if (res.ok) setTelegramDeepLink(data.deepLink);
    } finally {
      setTelegramConnecting(false);
    }
  }

  async function handleTelegramDisconnect() {
    setTelegramDisconnecting(true);
    try {
      await fetch("/api/telegram/disconnect", { method: "POST" });
      setProfile((p) => p ? { ...p, telegramConnected: false } : p);
      setTelegramDeepLink(null);
    } finally {
      setTelegramDisconnecting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const plan = profile ? PLAN_CONFIG[profile.subscription] : PLAN_CONFIG.free;
  const usagePercent = profile?.limit ? Math.min((profile.todayCount / profile.limit) * 100, 100) : 0;

  // All unique tags across links
  const allTags = Array.from(new Set(links.flatMap((l) => l.tags ?? [])));

  const filtered = links.filter((l) => {
    const matchSearch = l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
      (l.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || (l.tags ?? []).includes(activeTag);
    return matchSearch && matchTag;
  });

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

  function getDomain(url: string) {
    try { return new URL(url).hostname; } catch { return "Other"; }
  }

  const groupedLinks: Record<string, LinkItem[]> = {};
  if (groupByDomain) {
    filtered.forEach((link) => {
      const domain = getDomain(link.originalUrl);
      if (!groupedLinks[domain]) groupedLinks[domain] = [];
      groupedLinks[domain].push(link);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">Snip</span>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.color}`}>{plan.label}</span>
                <span className="text-sm text-gray-500 hidden sm:block">{profile.email}</span>
              </>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors ml-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Hero shortener */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 shadow-lg shadow-indigo-200/50">
          <h1 className="text-white text-2xl font-bold mb-1">Shorten a URL</h1>
          <p className="text-indigo-200 text-sm mb-6">Paste your long link and get a short one instantly</p>

          <form onSubmit={handleShorten}>
            <div className="flex gap-3">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/your-long-url" required
                className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 transition-all" />
              <button type="submit" disabled={shortening}
                className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap">
                {shortening ? "Shortening…" : "Shorten →"}
              </button>
            </div>

            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-3 text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition-colors">
              <svg className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced options
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-indigo-300 mb-1">Custom slug</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))} placeholder="my-link"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/30" />
                </div>
                <div>
                  <label className="block text-xs text-indigo-300 mb-1">Password protect</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for none"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/30" />
                </div>
                <div>
                  <label className="block text-xs text-indigo-300 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-red-300">×</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Type tag + Enter"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/30" />
                </div>
                <div>
                  <label className="block text-xs text-indigo-300 mb-1">Expires after</label>
                  <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30">
                    {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-indigo-900">{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </form>

          {shortenError && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-200 text-sm">{shortenError}</p>
            </div>
          )}

          {newLink && (
            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-indigo-300 mb-0.5">Your short link is ready</p>
                <a href={`${baseUrl}/${newLink.slug}`} target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:text-indigo-200 transition-colors">
                  {baseUrl}/{newLink.slug}
                </a>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {newLink.password && <span className="text-xs text-indigo-300 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Password protected</span>}
                  {newLink.expiresAt && <span className="text-xs text-indigo-300">{expiryLabel(newLink.expiresAt)?.label}</span>}
                  {(newLink.tags ?? []).map((t) => <span key={t} className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">#{t}</span>)}
                </div>
              </div>
              <button onClick={copyNewLink}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-emerald-500 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50"}`}>
                {copied ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Links", value: links.length, iconColor: "bg-indigo-50 text-indigo-500", valueColor: "text-gray-900",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> },
            { label: "Total Clicks", value: totalClicks, iconColor: "bg-violet-50 text-violet-500", valueColor: "text-violet-600",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /> },
            { label: "Active Links", value: links.filter((l) => l.isActive).length, iconColor: "bg-emerald-50 text-emerald-500", valueColor: "text-emerald-600",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
            { label: "Today's Links", value: profile ? `${profile.todayCount}${profile.limit ? ` / ${profile.limit}` : ""}` : "—", iconColor: "bg-amber-50 text-amber-500", valueColor: "text-gray-900",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconColor}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{s.icon}</svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.valueColor}`}>{s.value}</p>
                {s.label === "Today's Links" && profile?.limit && (
                  <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                    <div className={`h-1 rounded-full transition-all ${usagePercent >= 90 ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${usagePercent}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(["links", "import"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "links" ? `Links (${links.length})` : "Bulk Import"}
            </button>
          ))}
        </div>

        {tab === "links" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search links…"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {/* Group by domain toggle */}
              <button onClick={() => setGroupByDomain((v) => !v)}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${groupByDomain ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-400 hover:text-indigo-600"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8M4 18h8" />
                </svg>
                Group by domain
              </button>
              {/* Tag filters */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setActiveTag(null)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${!activeTag ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    All
                  </button>
                  {allTags.map((t) => (
                    <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${activeTag === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <p className="font-medium text-sm">{search || activeTag ? "No links match" : "No links yet — shorten your first URL above"}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(groupByDomain ? Object.entries(groupedLinks) : [["", filtered] as [string, LinkItem[]]]).map(([domain, domainLinks]) => (
                  <div key={domain}>
                    {groupByDomain && (
                      <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" className="w-4 h-4" />
                        <span className="text-xs font-semibold text-gray-600">{domain}</span>
                        <span className="text-xs text-gray-400">({domainLinks.length} link{domainLinks.length !== 1 ? "s" : ""})</span>
                      </div>
                    )}
                    {domainLinks.map((link) => {
                  const expiry = expiryLabel(link.expiresAt);
                  let hostname = "";
                  try { hostname = new URL(link.originalUrl).hostname; } catch { /* ignore */ }
                  return (
                    <div key={link.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors ${!link.isActive ? "opacity-50" : ""}`}>
                      {/* Favicon */}
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                        {hostname
                          ? <Image src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" width={20} height={20} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        {link.title && <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{link.title}</p>}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <a href={`${baseUrl}/${link.slug}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                            {baseUrl.replace(/^https?:\/\//, "")}/{link.slug}
                          </a>
                          <button onClick={() => copyLink(link.slug)} title="Copy short link"
                            className="text-gray-300 hover:text-indigo-500 transition-colors">
                            {copiedSlug === link.slug
                              ? <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                          </button>
                          {!link.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Disabled</span>}
                          {link.source === "telegram" && (
                            <span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-medium">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.02 9.52c-.149.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.008 14.617l-2.938-.92c-.638-.2-.651-.638.136-.943l11.494-4.432c.532-.194.998.13.862.926z"/></svg>
                              Telegram
                            </span>
                          )}
                          {link.password && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Protected</span>}
                          {expiry && <span className={`text-xs px-1.5 py-0.5 rounded-md ${expiry.color}`}>{expiry.label}</span>}
                          {(link.tags ?? []).map((t) => (
                            <button key={t} onClick={() => setActiveTag(t)} className="text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md hover:bg-indigo-100 transition-colors">#{t}</button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{link.originalUrl}</p>
                      </div>

                      {/* Clicks */}
                      <div className="shrink-0 text-center w-12 hidden sm:block">
                        <p className="text-lg font-bold text-gray-900 leading-tight">{link.clicks}</p>
                        <p className="text-xs text-gray-400">clicks</p>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-gray-400 shrink-0 text-right hidden lg:block whitespace-nowrap w-36">{formatDate(link.createdAt)}</p>

                      {/* Actions - always visible */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => openEdit(link)} title="Edit"
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setQrSlug(qrSlug === link.slug ? null : link.slug)} title="QR Code"
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                        </button>
                        <button onClick={() => toggleActive(link)} title={link.isActive ? "Disable" : "Enable"}
                          className={`p-2 rounded-lg transition-colors ${link.isActive ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-100"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 8v4m0 4h.01" /></svg>
                        </button>
                        <button onClick={() => deleteLink(link.id)} disabled={deletingId === link.id} title="Delete"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "import" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Bulk Import via CSV</h2>
            <p className="text-sm text-gray-400 mb-6">Upload a CSV file to create multiple short links at once.</p>

            {/* CSV format guide */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Expected CSV format:</p>
              <code className="text-xs text-indigo-700 font-mono block">url,slug,title,tags,expires_in_days</code>
              <code className="text-xs text-gray-500 font-mono block mt-1">https://example.com,my-link,My Title,"marketing,social",7</code>
              <p className="text-xs text-gray-400 mt-2">Only <span className="font-medium">url</span> is required. All other columns are optional.</p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
            >
              <svg className="w-10 h-10 text-gray-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">
                {csvRows.length > 0 ? `${csvRows.length} rows loaded — click to replace` : "Click to upload CSV file"}
              </p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
            </div>

            {csvRows.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">{csvRows.length} rows ready to import</p>
                  <button onClick={handleImport} disabled={importing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
                    {importing ? "Importing…" : `Import ${csvRows.length} Links`}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        {Object.keys(csvRows[0]).map((h) => (
                          <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate">{v || <span className="text-gray-300">—</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 10 && <p className="text-xs text-gray-400 px-4 py-2 border-t">… and {csvRows.length - 10} more rows</p>}
                </div>
              </div>
            )}

            {importResults && (
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm font-semibold text-emerald-600">✓ {importResults.filter((r) => r.success).length} imported</span>
                  {importResults.filter((r) => !r.success).length > 0 && (
                    <span className="text-sm font-semibold text-red-500">✗ {importResults.filter((r) => !r.success).length} failed</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {importResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${r.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {r.success ? <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                      <span className="truncate">{r.url}</span>
                      {r.success ? <span className="ml-auto shrink-0 font-mono">→ /{r.slug}</span> : <span className="ml-auto shrink-0">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telegram Integration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.02 9.52c-.149.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.008 14.617l-2.938-.92c-.638-.2-.651-.638.136-.943l11.494-4.432c.532-.194.998.13.862.926z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900">Telegram Bot</h2>
                  {profile?.telegramConnected
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Connected</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Not connected</span>}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {profile?.telegramConnected
                    ? "Send any URL to your bot and get a short link instantly"
                    : "Connect Telegram to shorten URLs directly from chat"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile?.telegramConnected ? (
                <button onClick={handleTelegramDisconnect} disabled={telegramDisconnecting}
                  className="px-4 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60">
                  {telegramDisconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <button onClick={handleTelegramConnect} disabled={telegramConnecting}
                  className="px-5 py-2 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm">
                  {telegramConnecting ? "Generating link…" : "Connect Telegram"}
                </button>
              )}
            </div>
          </div>

          {telegramDeepLink && !profile?.telegramConnected && (
            <div className="mt-5 bg-sky-50 border border-sky-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-sky-800 mb-1">Step 1 — Open the bot in Telegram</p>
              <a href={telegramDeepLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.02 9.52c-.149.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.008 14.617l-2.938-.92c-.638-.2-.651-.638.136-.943l11.494-4.432c.532-.194.998.13.862.926z"/>
                </svg>
                Open Telegram Bot
              </a>
              <p className="text-xs text-sky-600 mt-2">Step 2 — Press <strong>Start</strong> in the bot. Your account will be linked automatically.</p>
              <p className="text-xs text-gray-400 mt-1">Link expires in 10 minutes.</p>
            </div>
          )}
        </div>

        {/* Subscription plans */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Subscription Plans</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "free",      name: "Free",      price: "$0",  limit: "20 links/day",    features: ["QR codes", "Click tracking", "Custom slugs", "Tags & folders", "Link expiry"] },
              { key: "basic",     name: "Basic",     price: "$5",  limit: "100 links/day",   features: ["Everything in Free", "Password protection", "Bulk CSV import", "Priority support"] },
              { key: "premium",   name: "Premium",   price: "$15", limit: "500 links/day",   features: ["Everything in Basic", "Analytics dashboard", "Branded domains", "API access"] },
              { key: "unlimited", name: "Unlimited", price: "$29", limit: "Unlimited links", features: ["Everything in Premium", "White label", "SLA guarantee", "Custom integrations"] },
            ].map((p) => {
              const isCurrent = profile?.subscription === p.key;
              return (
                <div key={p.key} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${isCurrent ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 hover:border-gray-300"}`}>
                  {isCurrent && <span className="inline-block text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full mb-3">Current Plan</span>}
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <div className="flex items-baseline gap-1 mt-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 mb-3">{p.limit}</p>
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && <button className="mt-4 w-full py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Contact to upgrade</button>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Change subscription: Supabase → Table Editor → profiles → update subscription column</p>
        </div>
      </main>

      {/* QR Modal */}
      {/* Edit Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingLink(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Edit Link</h3>
              <button onClick={() => setEditingLink(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Short URL</label>
                <p className="text-sm font-mono text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">{baseUrl.replace(/^https?:\/\//, "")}/{editingLink.slug}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Optional title"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to remove"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editTags.map((t) => (
                    <span key={t} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                      #{t}
                      <button type="button" onClick={() => setEditTags(editTags.filter((x) => x !== t))} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const t = editTagInput.trim().toLowerCase();
                      if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
                      setEditTagInput("");
                    }
                  }}
                  placeholder="Type tag + Enter"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Expires after</label>
                <select value={editExpiresInDays} onChange={(e) => setEditExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditingLink(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60">
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrSlug && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setQrSlug(null)}>
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 w-72" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">QR Code</h3>
            <p className="text-xs text-gray-500 text-center break-all">{baseUrl}/{qrSlug}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`} alt="QR" width={200} height={200} className="rounded-xl border border-gray-100" />
            <div className="flex gap-3 w-full">
              <a href={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`} download={`qr-${qrSlug}.png`}
                className="flex-1 text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">Download</a>
              <button onClick={() => setQrSlug(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
