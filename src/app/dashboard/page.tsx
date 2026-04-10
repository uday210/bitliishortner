"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface LinkItem {
  id: string;
  slug: string;
  originalUrl: string;
  title: string | null;
  clicks: number;
  createdAt: string;
  _count: { visits: number };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  async function deleteLink(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/links/${id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(`${baseUrl}/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = links.filter(
    (l) =>
      l.slug.includes(search) ||
      l.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
      (l.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900">Snip</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Shorten URL
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">All your shortened links in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Total Links
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{links.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Total Clicks
            </p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{totalClicks}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Avg Clicks / Link
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {links.length ? Math.round(totalClicks / links.length) : 0}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Links table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <svg
              className="animate-spin w-6 h-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading links...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg
              className="w-12 h-12 mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="font-medium">
              {search ? "No links match your search" : "No links yet"}
            </p>
            {!search && (
              <Link
                href="/"
                className="mt-2 text-indigo-600 text-sm hover:underline"
              >
                Shorten your first URL
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filtered.map((link) => {
                const short = `${baseUrl}/${link.slug}`;
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Favicon */}
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                      <Image
                        src={`https://www.google.com/s2/favicons?domain=${new URL(link.originalUrl).hostname}&sz=32`}
                        alt=""
                        width={20}
                        height={20}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>

                    {/* Link info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={short}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          /{link.slug}
                        </a>
                        {link.title && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {link.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {link.originalUrl}
                      </p>
                    </div>

                    {/* Clicks */}
                    <div className="text-center shrink-0 w-16">
                      <p className="text-lg font-bold text-gray-900">
                        {link.clicks}
                      </p>
                      <p className="text-xs text-gray-400">clicks</p>
                    </div>

                    {/* Age */}
                    <div className="text-xs text-gray-400 shrink-0 w-16 text-right">
                      {timeAgo(link.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Copy */}
                      <button
                        onClick={() => copyLink(link.slug)}
                        title="Copy link"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {copied === link.slug ? (
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>

                      {/* QR */}
                      <button
                        onClick={() =>
                          setQrSlug(qrSlug === link.slug ? null : link.slug)
                        }
                        title="Show QR Code"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteLink(link.id)}
                        disabled={deletingId === link.id}
                        title="Delete link"
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QR modal */}
        {qrSlug && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setQrSlug(null)}
          >
            <div
              className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-gray-900">QR Code</h3>
              <p className="text-sm text-gray-500">
                {baseUrl}/{qrSlug}
              </p>
              <Image
                src={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`}
                alt="QR Code"
                width={240}
                height={240}
                className="rounded-xl border border-gray-200"
              />
              <div className="flex gap-3">
                <a
                  href={`/api/qr?url=${encodeURIComponent(`${baseUrl}/${qrSlug}`)}`}
                  download={`qr-${qrSlug}.png`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Download
                </a>
                <button
                  onClick={() => setQrSlug(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
