// A tiny Google client for Web: loads GSI, renders the Sign in button, manages scoped tokens, and calls Gmail.
// Scalable: add other scopes (Sheets/Docs) with the same token model.

type TokenInfo = { accessToken: string; expiresAt: number; scope: string };
type InitConfig = { clientId: string };

// Keep module-scoped, not in node config (safer).
let gsiLoaded = false;
let clientId: string | null = null;
let accountEmail: string | null = null;
const tokensByScope = new Map<string, TokenInfo>(); // scope -> token
let gmailTokenClient: any | null = null; // google.accounts.oauth2.TokenClient

const SCOPE_GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const STORE_KEY = () => `gis.tokens.${clientId}`;


function loadCache(): Record<string, TokenInfo> {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY()) || '{}'); } catch { return {}; }
}
function saveCache(map: Map<string, TokenInfo>) {
  const obj = Object.fromEntries(map); // Map -> Record<string, TokenInfo>
  sessionStorage.setItem(STORE_KEY(), JSON.stringify(obj));
}
function putToken(scope: string, info: TokenInfo) {
  tokensByScope.set(scope, info);
  saveCache(tokensByScope);
}
function hydrateFromCache() {
  const obj = loadCache();
  tokensByScope.clear();
  Object.entries(obj).forEach(([scope, t]) => tokensByScope.set(scope, t as TokenInfo));
}

// Loads the GSI script once.
function loadGsi(): Promise<void> {
  if (gsiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => { gsiLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(s);
  });
}

// Initializes client and token client(s).
export async function initGoogle({ clientId: cid }: InitConfig) {
  await loadGsi();
  if (!cid || !cid.includes('.apps.googleusercontent.com')) {
    throw new Error('Invalid Google client_id (.apps.googleusercontent.com expected)');
  }
  clientId = cid.trim();
  hydrateFromCache();
}

// Renders the Google button into a container and completes sign-in + consent for Gmail scope.
export async function renderGoogleSignInButton(
  container: HTMLElement,
  options: google.accounts.id.GsiButtonConfiguration = { type: 'standard', theme: 'filled_blue', size: 'large' },
  onConnected?: (email: string) => void
) {
  if (!clientId) throw new Error('Google client is not initialized.');
  await loadGsi();

  // Important: disable auto-select to let user change account when needed
  (window as any).google.accounts.id.disableAutoSelect(); // affect One Tap/auto sign-in  [5](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out)

  (window as any).google.accounts.id.initialize({
    client_id: clientId,
    callback: (cred: google.accounts.id.CredentialResponse) => {
      try {
        const payload = JSON.parse(atob(cred.credential.split('.')[1]));
        accountEmail = payload?.email ?? null;
      } catch {}
      // Immediately request gmail.send token with a user gesture and prompt='consent' (first-time only)
      ensureGmailToken(true)
        .then(() => onConnected?.(accountEmail || ''))
        .catch(() => {/* toast handled by caller */});
    },
    // (optionally set ux_mode: 'popup')
  });

  (window as any).google.accounts.id.renderButton(container, options);  //  [7](https://developers.google.com/workspace/gmail/api/guides/sending)
}


// Returns true if we know we have an unexpired token for provided scope.
function hasValidToken(scope: string): boolean {
  const t = tokensByScope.get(scope);
  return !!t && Date.now() < t.expiresAt - 5_000; // small skew
}

// Ensures an access token for Gmail "send" scope exists; optionally show consent (prompt=true) on first time.
export async function ensureGmailToken(promptUserIfNeeded = false): Promise<string> {
  const SCOPE = SCOPE_GMAIL_SEND;
  if (hasValidToken(SCOPE)) return tokensByScope.get(SCOPE)!.accessToken;

  await loadGsi();
  if (!clientId) throw new Error('Google client not initialized');

  if (!promptUserIfNeeded) {
    // DO NOT prompt/pop during workflow execution. Ask user to reconnect in Auth tab.
    throw new Error('Gmail token missing/expired. Reconnect in Authentication tab.');
  }

  // Interactive consent: popup flow (must be triggered from Auth tab button click)  [6](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
  gmailTokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (resp: any) => {
      if (resp?.access_token) {
        const expiresIn = Number(resp.expires_in || 3600);
        putToken(SCOPE, {
          accessToken: resp.access_token,
          scope: resp.scope,
          expiresAt: Date.now() + expiresIn * 1000,
        });
        pendingResolve?.(resp.access_token);
      } else {
        pendingReject?.(new Error(resp?.error || 'Failed to obtain Gmail access token'));
      }
      pendingResolve = pendingReject = null;
    },
  });

  let pendingResolve: ((t: string) => void) | null = null;
  let pendingReject: ((e: any) => void) | null = null;
  const p = new Promise<string>((res, rej) => { pendingResolve = res; pendingReject = rej; });

  gmailTokenClient.requestAccessToken({ prompt: 'consent', hint: accountEmail || undefined });
  return p;
}

export function disconnectGoogle(): Promise<void> {
  return new Promise((resolve) => {
    const email = accountEmail;
    tokensByScope.clear();
    saveCache(tokensByScope);
    accountEmail = null;
    if ((window as any).google?.accounts?.id?.revoke && email) {
      (window as any).google.accounts.id.revoke(email, () => resolve()); // revoke ID token grant  [3](https://developers.google.com/identity/gsi/web/guides/revoke)
    } else {
      resolve();
    }
  });
}


// Simple getter for display purposes.
export function getConnectedGoogleEmail(): string | null {
  return accountEmail;
}

// Builds base64url from string (supports UTF-8).
export function toBase64Url(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // base64url transform  [5](https://stackoverflow.com/questions/29119350/google-rest-api-message-in-an-rfc-2822-formatted-and-base64url-encoded-string)
}

// Sends a raw RFC 2822 email via Gmail REST; body.raw must be base64url.
// Endpoint: POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send  [4](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
export async function gmailSendRaw(raw: string): Promise<any> {
  const token = await ensureGmailToken(false);
  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `Gmail send failed with ${resp.status}`);
  }
  return resp.json();
}