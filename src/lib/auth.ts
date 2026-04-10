export const COOKIE_NAME = "snip_session";

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET!;
  const payload = btoa(JSON.stringify({ ts: Date.now() }));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return false;

    const [payload, sigB64] = token.split(".");
    if (!payload || !sigB64) return false;

    const key = await getKey(secret);
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    return crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

export function checkCredentials(username: string, password: string): boolean {
  const validUser = process.env.AUTH_USERNAME;
  const validPass = process.env.AUTH_PASSWORD;
  return username === validUser && password === validPass;
}
