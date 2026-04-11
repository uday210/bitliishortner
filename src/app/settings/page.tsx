"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  email: string;
  subscription: "free" | "basic" | "premium" | "unlimited";
  limit: number | null;
  todayCount: number;
  telegramConnected: boolean;
}

const PLAN_CONFIG = {
  free:      { label: "Free",      color: "bg-gray-100 text-gray-600" },
  basic:     { label: "Basic",     color: "bg-blue-100 text-blue-700" },
  premium:   { label: "Premium",   color: "bg-violet-100 text-violet-700" },
  unlimited: { label: "Unlimited", color: "bg-emerald-100 text-emerald-700" },
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  // API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Telegram
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);

  const fetchData = useCallback(async () => {
    const [profileRes, apiKeyRes] = await Promise.all([fetch("/api/profile"), fetch("/api/apikey")]);
    if (profileRes.ok) setProfile(await profileRes.json());
    if (apiKeyRes.ok) { const d = await apiKeyRes.json(); setApiKey(d.apiKey); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generateApiKey() {
    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/apikey", { method: "POST" });
      if (res.ok) { const d = await res.json(); setApiKey(d.apiKey); setApiKeyVisible(true); }
    } finally { setApiKeyLoading(false); }
  }

  async function revokeApiKey() {
    setApiKeyLoading(true);
    try {
      await fetch("/api/apikey", { method: "DELETE" });
      setApiKey(null); setApiKeyVisible(false);
    } finally { setApiKeyLoading(false); }
  }

  async function copyApiKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  }

  async function handleTelegramConnect() {
    setTelegramConnecting(true);
    setTelegramDeepLink(null);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const data = await res.json();
      if (res.ok) setTelegramDeepLink(data.deepLink);
    } finally { setTelegramConnecting(false); }
  }

  async function handleTelegramDisconnect() {
    setTelegramDisconnecting(true);
    try {
      await fetch("/api/telegram/disconnect", { method: "POST" });
      setProfile((p) => p ? { ...p, telegramConnected: false } : p);
      setTelegramDeepLink(null);
    } finally { setTelegramDisconnecting(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const plan = profile ? PLAN_CONFIG[profile.subscription] : PLAN_CONFIG.free;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="font-bold text-gray-900">Settings</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.color}`}>{plan.label}</span>}
            {profile && <span className="text-sm text-gray-500 hidden sm:block">{profile.email}</span>}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors ml-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Integrations */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Integrations</h2>
          <div className="space-y-4">

            {/* Telegram */}
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
                      <h3 className="font-bold text-gray-900">Telegram Bot</h3>
                      {profile?.telegramConnected
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Connected</span>
                        : <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Not connected</span>}
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {profile?.telegramConnected ? "Send any URL to the bot and get a short link instantly" : "Connect Telegram to shorten URLs directly from chat"}
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
                  <p className="text-sm font-semibold text-sky-800 mb-2">Step 1 — Open the bot in Telegram</p>
                  <a href={telegramDeepLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.02 9.52c-.149.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.008 14.617l-2.938-.92c-.638-.2-.651-.638.136-.943l11.494-4.432c.532-.194.998.13.862.926z"/></svg>
                    Open Telegram Bot
                  </a>
                  <p className="text-xs text-sky-600 mt-2">Step 2 — Press <strong>Start</strong> in the bot. Your account will be linked automatically.</p>
                  <p className="text-xs text-gray-400 mt-1">Link expires in 10 minutes.</p>
                </div>
              )}
            </div>

            {/* Browser Extension */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Browser Extension</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Right-click any page or link to shorten it instantly in Chrome</p>
                  </div>
                </div>
                <a href="https://chromewebstore.google.com/detail/snip-url-shortener/elmkkegdjpgodkomfgebambahdgnlkjd" target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors shadow-sm">
                  Install Extension
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Developer */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Developer</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">API Key</h3>
                    {apiKey
                      ? <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Not generated</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">Use with the browser extension or your own scripts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apiKey ? (
                  <button onClick={revokeApiKey} disabled={apiKeyLoading}
                    className="px-4 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60">
                    Revoke
                  </button>
                ) : (
                  <button onClick={generateApiKey} disabled={apiKeyLoading}
                    className="px-5 py-2 text-sm font-bold bg-gray-900 hover:bg-gray-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm">
                    {apiKeyLoading ? "Generating…" : "Generate Key"}
                  </button>
                )}
              </div>
            </div>
            {apiKey && (
              <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 truncate">
                    {apiKeyVisible ? apiKey : apiKey.slice(0, 8) + "•".repeat(28)}
                  </code>
                  <button onClick={() => setApiKeyVisible((v) => !v)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {apiKeyVisible
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                    </svg>
                  </button>
                  <button onClick={copyApiKey}
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0">
                    {apiKeyCopied
                      ? <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Use in requests: <code className="text-indigo-600">Authorization: Bearer {apiKey.slice(0, 12)}…</code></p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Subscription</h2>
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
        </div>

      </main>
    </div>
  );
}
