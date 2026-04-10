"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface ShortenedLink {
  id: string;
  slug: string;
  originalUrl: string;
  title: string | null;
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shortUrl = result ? `${baseUrl}/${result.slug}` : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          slug: slug || undefined,
          title: title || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
        setUrl("");
        setSlug("");
        setTitle("");
        setShowAdvanced(false);
        setShowQR(false);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Dashboard
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {/* Headline */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Short links,{" "}
              <span className="text-indigo-600">big impact</span>
            </h1>
            <p className="text-lg text-gray-500">
              Shorten any URL instantly. Track clicks. Share everywhere.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a long URL here..."
                required
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? "Shortening..." : "Shorten URL"}
              </button>
            </div>

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-3 text-sm text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Advanced options
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Custom slug (optional)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                    }
                    placeholder="my-link"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My awesome link"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
          </form>

          {/* Result card */}
          {result && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm border border-indigo-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Your short link is ready
                  </p>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-bold text-indigo-600 hover:text-indigo-700 break-all"
                  >
                    {shortUrl}
                  </a>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {result.originalUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    title="Show QR Code"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
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
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? "bg-green-100 text-green-700"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {copied ? (
                      <>
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showQR && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
                  <Image
                    src={`/api/qr?url=${encodeURIComponent(shortUrl)}`}
                    alt="QR Code"
                    width={180}
                    height={180}
                    className="rounded-lg border border-gray-200"
                  />
                  <a
                    href={`/api/qr?url=${encodeURIComponent(shortUrl)}`}
                    download={`qr-${result.slug}.png`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Download QR Code
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Feature pills */}
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Links shortened", value: "Free forever" },
              { label: "Click tracking", value: "Built-in" },
              { label: "Custom slugs", value: "Supported" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-indigo-600 transition-colors"
        >
          View all links
        </Link>
        <span className="mx-3">·</span>
        <span>Snip — Free URL Shortener</span>
      </footer>
    </div>
  );
}
