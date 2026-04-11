const API_BASE = "https://bitil.io";

const setupScreen = document.getElementById("setup-screen");
const mainScreen = document.getElementById("main-screen");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const urlInput = document.getElementById("url-input");
const shortenBtn = document.getElementById("shorten-btn");
const resultEl = document.getElementById("result");
const resultUrl = document.getElementById("result-url");
const copyBtn = document.getElementById("copy-btn");
const errorMsg = document.getElementById("error-msg");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
  setTimeout(() => errorMsg.classList.remove("show"), 4000);
}

function showMain() {
  setupScreen.style.display = "none";
  mainScreen.style.display = "block";
}

function showSetup() {
  setupScreen.style.display = "block";
  mainScreen.style.display = "none";
}

// Init
chrome.storage.local.get("apiKey", ({ apiKey }) => {
  if (apiKey) {
    showMain();
    // Pre-fill current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) urlInput.value = tabs[0].url;
    });
  } else {
    showSetup();
  }
});

// Save API key
saveKeyBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith("snip_")) {
    showError("Invalid key — must start with snip_");
    return;
  }
  // Verify key works
  saveKeyBtn.textContent = "Checking…";
  saveKeyBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    if (res.status === 401) { showError("Invalid API key"); return; }
    chrome.storage.local.set({ apiKey: key }, () => {
      showMain();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) urlInput.value = tabs[0].url;
      });
    });
  } catch {
    showError("Could not verify key — check your connection");
  } finally {
    saveKeyBtn.textContent = "Save";
    saveKeyBtn.disabled = false;
  }
});

// Disconnect
disconnectBtn.addEventListener("click", () => {
  chrome.storage.local.remove("apiKey", () => {
    showSetup();
    resultEl.classList.remove("show");
  });
});

// Shorten
shortenBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) { showError("Please enter a URL"); return; }

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) { showSetup(); return; }

  shortenBtn.textContent = "Shortening…";
  shortenBtn.disabled = true;
  resultEl.classList.remove("show");

  try {
    const res = await fetch(`${API_BASE}/api/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Failed to shorten"); return; }

    const short = `${API_BASE}/${data.slug}`;
    resultUrl.textContent = short;
    resultEl.classList.add("show");
    resultEl._shortUrl = short;
  } catch {
    showError("Network error — try again");
  } finally {
    shortenBtn.textContent = "Shorten →";
    shortenBtn.disabled = false;
  }
});

// Copy
copyBtn.addEventListener("click", () => {
  const url = resultEl._shortUrl;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy to clipboard"; }, 2000);
  });
});

// Allow Enter key on URL input
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") shortenBtn.click();
});
