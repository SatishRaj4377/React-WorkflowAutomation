type TokenInfo = { accessToken: string; expiresAt: number; scope: string };
type InitConfig = { clientId: string };
type PopupGuardOptions = {
  onPopupOpen?: () => void;
  onPopupClosed?: (reason: 'popup_closed' | 'popup_failed_to_open' | 'timeout' | 'visibility') => void;
  timeoutMs?: number; // default 25000
};

let gsiLoaded = false;
let clientId: string | null = null;
let tokenByScope = new Map<string, TokenInfo>(); // in-memory only (default)
let currentEmail: string | null = null;
let gmailTokenClient: any | null = null;

const SCOPE_GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const SCOPE_GMAIL_METADATA = 'https://www.googleapis.com/auth/gmail.metadata';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

function hasValid(scope: string): boolean {
  const t = tokenByScope.get(scope);
  return !!t && Date.now() < t.expiresAt - 5_000;
}

async function loadGsi(): Promise<void> {
  if (gsiLoaded) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.onload = () => { gsiLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

// Initialize once
export async function initGoogleAuth({ clientId: cid }: InitConfig) {
  await loadGsi();
  if (!cid || !cid.includes('.apps.googleusercontent.com')) {
    throw new Error('Invalid Google Web Client ID (.apps.googleusercontent.com required)');
  }
  clientId = cid.trim();
}

// Non-persistent cache (minimizes XSS blast radius)
function putToken(scope: string, access_token: string, expires_in: number) {
  tokenByScope.set(scope, {
    accessToken: access_token,
    scope,
    expiresAt: Date.now() + Number(expires_in || 3600) * 1000
  });
}

export function getConnectedGoogleEmail(): string | null {
  return currentEmail;
}

export function getTokenCached(scopeKey: string = `${SCOPE_GMAIL_SEND} ${SCOPE_GMAIL_METADATA}`): string | null {
  const t = tokenByScope.get(scopeKey);
  return t && Date.now() < t.expiresAt - 5_000 ? t.accessToken : null;
}


async function fetchGmailEmailWithRetry(accessToken: string, attempts = 3): Promise<string> {
  let lastText = '';
  for (let i = 0; i < attempts; i++) {
    const r = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile?fields=emailAddress',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (r.ok) {
      const p = await r.json();
      const email = p?.emailAddress;
      if (email) return email;
      lastText = 'No emailAddress in profile';
    } else {
      lastText = await r.text().catch(() => `${r.status}`);
      // Surface precise guidance if it’s scopes
      if (r.status === 403 && /insufficient/i.test(lastText)) {
        throw new Error(
          'Missing permission to read Gmail profile. Please allow access when prompted.'
        );
      }
    }
    // small backoff before retry
    await new Promise(res => setTimeout(res, 250 * (i + 1)));
  }
  throw new Error(`Failed to read Gmail profile${lastText ? `: ${lastText}` : ''}`);
}


// Interactive: call only from Auth tab button (user gesture)
// If forceAccountSelect is true, we use prompt:'consent' to re-trigger chooser/consent.
export async function getTokenInteractive(
  forceAccountSelect = false,
  guard?: PopupGuardOptions
): Promise<{ accessToken: string; email: string }> {
  if (!clientId) throw new Error('Google client not initialized');
  await loadGsi();

  const SCOPES = `${SCOPE_GMAIL_SEND} ${SCOPE_GMAIL_METADATA}`;

  let settled = false;
  let timeoutId: any = null;
  let cleanupVisibility: (() => void) | null = null;

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (cleanupVisibility) cleanupVisibility();
    fn();
  };

  // 1) Set up the token client with error_callback (critical)  // Docs: popup_closed / popup_failed_to_open
  // https://developers.google.com/identity/oauth2/web/guides/error
  gmailTokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp: any) => {
      if (!resp?.access_token) {
        return settle(() =>
          pendingReject?.(new Error(resp?.error || 'Failed to obtain Gmail access token'))
        );
      }
      putToken(SCOPES, resp.access_token, resp.expires_in);
      settle(() => pendingResolve?.(resp.access_token));
    },
    error_callback: (err: any) => {
      // err.type can be 'popup_failed_to_open' or 'popup_closed'
      guard?.onPopupClosed?.(err?.type || 'popup_closed');
      settle(() => pendingReject?.(new Error(err?.type || 'popup_closed')));
    },
  });

  // 2) Guards: timeout + visibility/focus fallback
  const timeoutMs = Math.max(5000, guard?.timeoutMs ?? 25_000);
  timeoutId = setTimeout(() => {
    guard?.onPopupClosed?.('timeout');
    settle(() => pendingReject?.(new Error('popup_timeout')));
  }, timeoutMs);

  // If user briefly switches tabs/windows and comes back without a callback,
  // assume popup was abandoned. We re-enable UI.
  const onVis = () => {
    // When the document is visible again and still not settled after a small delay → treat as abandoned
    if (document.visibilityState === 'visible' && !settled) {
      setTimeout(() => {
        if (!settled) {
          guard?.onPopupClosed?.('visibility');
          settle(() => pendingReject?.(new Error('popup_abandoned')));
        }
      }, 500);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  cleanupVisibility = () => document.removeEventListener('visibilitychange', onVis);

  let pendingResolve: ((t: string) => void) | null = null;
  let pendingReject: ((e: any) => void) | null = null;
  const p = new Promise<string>((res, rej) => { pendingResolve = res; pendingReject = rej; });

  // 3) Fire the popup (user gesture), then notify UI that popup launched
  guard?.onPopupOpen?.();
  gmailTokenClient.requestAccessToken({ prompt: forceAccountSelect ? 'consent' : '' });

  // 4) Wait for token or guard rejection
  const accessToken = await p;

  // 5) Confirm Gmail account (uses gmail.metadata scope)
  const email = await fetchGmailEmailWithRetry(accessToken); // unchanged helper that we already added
  currentEmail = email;
  return { accessToken, email };
}


// Disconnect & allow account switch: revoke ID grant, clear tokens  [3](https://stackoverflow.com/questions/64335721/unable-to-send-gmail-message-with-gmail-api)
export async function disconnectGoogle(): Promise<void> {
  const email = currentEmail;
  tokenByScope.clear();
  currentEmail = null;
  if (email && (window as any).google?.accounts?.id?.revoke) {
    await new Promise<void>((resolve) => (window as any).google.accounts.id.revoke(email, () => resolve()));
  }
}

export function toBase64Url(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function gmailSendRaw(raw: string, accessToken: string) {
  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  if (!resp.ok) throw new Error(await resp.text().catch(() => `Gmail send failed: ${resp.status}`));
  return resp.json();
}