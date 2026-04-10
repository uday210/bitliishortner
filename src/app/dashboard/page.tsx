"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface LinkItem {
  id: string;
  slug: string;
  originalUrl: string;
  title: string | null;
  clicks: number;
  createdAt: string;
}

interface Profile {
  email: string;
  subscription: "free" | "basic" | "premium" | "unlimited";
  limit: number | null;
  todayCount: number;
}

const PLAN_CONFIG = {
  free:      { label: "Free",      color: "bg-gray-100 text-gray-600",          limit: 20 },
  basic:     { label: "Basic",     color: "bg-blue-100 text-blue-700",           limit: 100 },
  premium:   { label: "Premium",   color: "bg-violet-100 text-violet-700",       limit: 500 },
  unlimited: { label: "Unlimited", color: "bg-emerald-100 text-emerald-700",     limit: null },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export default function DashboardPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Shorten form
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [shortenError, setShortenError] = useState("");
  const [newLink, setNewLink] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Dashboard state
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchData = useCallback(async () => {
    const [linksRes, profileRes] = await Promise.all([
      fetch("/api/links"),
      fetch("/api/profile"),
    ]);
    if (linksRes.ok) setLinks(await linksRes.json());
    if (profileRes.ok) setProfile(await profileRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        body: JSON.stringify({ url, slug: slug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShortenError(data.error || "Something went wrong");
      } else {
        setNewLink(data);
        setLinks((prev) => [data, ...prev]);
        setProfile((p) => p ? { ...p, todayCount: p.todayCount + 1 } : p);
        setUrl("");
        setSlug("");
        setShowAdvanced(false);
      }
    } catch {
      setShortenError("Network error. Try again.");
    } finally {
      setShortening(false);
    }
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const plan = profile ? PLAN_CONFIG[profile.subscription] : PLAN_CONFIG.free;
  const usagePercent = profile?.limit ? Math.min((profile.todayCount / profile.limit) * 100, 100) : 0;
  const filtered = links.filter(
    (l) =>
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
      (l.title ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">Snip</span>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.color}`}>
                  {plan.label}
                </span>
                <span className="text-sm text-gray-500 hidden sm:block">{profile.email}</span>
              </>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors ml-2"
            >
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
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/your-very-long-url-goes-here"
                required
                className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 transition-all"
              />
              <button
                type="submit"
                disabled={shortening}
                className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap"
              >
                {shortening ? "Shortening…" : "Shorten →"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-3 text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Custom slug
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  placeholder="my-custom-slug"
                  className="px-4 py-2.5 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all w-64"
                />
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
            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-indigo-300 mb-0.5">Your short link</p>
                <a
                  href={`${baseUrl}/${newLink.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-bold hover:text-indigo-200 transition-colors"
                >
                  {baseUrl}/{newLink.slug}
                </a>
              </div>
              <button
                onClick={copyNewLink}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  copied ? "bg-emerald-500 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                {copied ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Links</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{links.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Clicks</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{totalClicks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Today&apos;s Links</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {profile?.todayCount ?? 0}
              {profile?.limit && (
                <span className="text-sm font-normal text-gray-400"> / {profile.limit}</span>
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Plan</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${plan.color}`}>{plan.label}</span>
            </div>
            {profile?.limit && (
              <div className="mt-2">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${usagePercent >= 90 ? "bg-red-500" : "bg-indigo-500"}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Links table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-900">Your Links</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search links…"
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="font-medium text-sm">{search ? "No links match your search" : "No links yet — shorten your first URL above"}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((link) => {
                const short = `${baseUrl}/${link.slug}`;
                let hostname = "";
                try { hostname = new URL(link.originalUrl).hostname; } catch { /* ignore */ }
                return (
                  <div key={link.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group">
                    {/* Favicon */}
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {hostname && (
                        <Image
                          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                          alt=""
                          width={18}
                          height={18}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={short}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          snip/{link.slug}
                        </a>
                        {link.title && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{link.title}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{truncate(link.originalUrl, 60)}</p>
                    </div>

                    {/* Clicks */}
                    <div className="shrink-0 text-center w-14">
                      <p className="text-base font-bold text-gray-900">{link.clicks}</p>
                      <p className="text-xs text-gray-400">clicks</p>
                    </div>

                    {/* Age */}
                    <p className="text-xs text-gray-400 shrink-0 w-16 text-right hidden sm:block">{timeAgo(link.createdAt)}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyLink(link.slug)} title="Copy" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {copiedSlug === link.slug ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                      <button onClick={() => setQrSlug(qrSlug === link.slug ? null : link.slug)} title="QR Code" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                      </button>
                      <button onClick={() => deleteLink(link.id)} disabled={deletingId === link.id} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscription plans */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Subscription Plans</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "free",      name: "Free",      price: "$0",   limit: "20 links/day",    features: ["QR codes", "Click tracking", "Custom slugs"] },
              { key: "basic",     name: "Basic",     price: "$5",   limit: "100 links/day",   features: ["Everything in Free", "Priority support", "Analytics"] },
              { key: "premium",   name: "Premium",   price: "$15",  limit: "500 links/day",   features: ["Everything in Basic", "Branded domains", "API access"] },
              { key: "unlimited", name: "Unlimited", price: "$29",  limit: "Unlimited links", features: ["Everything in Premium", "White label", "SLA guarantee"] },
            ].map((p) => {
              const isCurrent = profile?.subscription === p.key;
              return (
                <div
                  key={p.key}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                    isCurrent
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCurrent && (
                    <span className="inline-block text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full mb-3">Current Plan</span>
                  )}
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <div className="flex items-baseline gap-1 mt-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 mb-3">{p.limit}</p>
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button className="mt-4 w-full py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      Contact to upgrade
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            To change your subscription, contact the admin or update directly in Supabase → profiles table.
          </p>
        </div>
      </main>

      {/* QR Modal */}
      {qrSlug && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setQrSlug(null)}>
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 w-72" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">QR Code</h3>
            <p className="text-xs text-gray-500 text-center break-all">{baseUrl}/{qrSlug}</p>
            <Image
              src={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`}
              alt="QR"
              width={200}
              height={200}
              className="rounded-xl border border-gray-100"
            />
            <div className="flex gap-3 w-full">
              <a
                href={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`}
                download={`qr-${qrSlug}.png`}
                className="flex-1 text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Download
              </a>
              <button onClick={() => setQrSlug(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
