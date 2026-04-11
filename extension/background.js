const API_BASE = "https://bitil.io";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "snip-shorten",
    title: "Shorten with Snip",
    contexts: ["page", "link", "selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "snip-shorten") return;

  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    chrome.action.openPopup?.();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (res.ok && data.slug) {
      const shortUrl = `${API_BASE}/${data.slug}`;
      await navigator.clipboard.writeText(shortUrl);
      // Notify via extension badge
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (short) => {
            const el = document.createElement("div");
            el.style.cssText = `
              position:fixed;top:20px;right:20px;z-index:999999;
              background:#4f46e5;color:#fff;padding:12px 18px;
              border-radius:12px;font-size:14px;font-family:sans-serif;
              box-shadow:0 4px 20px rgba(0,0,0,0.2);
            `;
            el.textContent = `✅ Copied: ${short}`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
          },
          args: [shortUrl],
        });
      }
    }
  } catch (e) {
    console.error("Snip error:", e);
  }
});
