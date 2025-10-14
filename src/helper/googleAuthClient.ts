/**
 * Centralized Google Identity Services (GIS) client for the browser.
 * - Scope-agnostic: callers pass the scopes they need.
 * - Single popup per scope union (token cached by a canonical scope key).
 * - In-memory token cache only (no persistent storage).
 */

export type PopupGuardOptions = {
  onPopupOpen?: () => void; // called just before opening popup
  onPopupClosed?: (
    reason: 'popup_closed' | 'popup_failed_to_open' | 'timeout' | 'visibility'
  ) => void;                 // called when popup fails/closes/times out
  timeoutMs?: number;        // default 25s
};

export type TokenInteractiveOptions = {
  shouldFetchIdentityEmail?: boolean; 
};

type TokenInfo = { accessToken: string; expiresAt: number };

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export class GoogleAuthClient {
  private static _instance: GoogleAuthClient | null = null;
  static get instance(): GoogleAuthClient {
    if (!this._instance) this._instance = new GoogleAuthClient();
    return this._instance;
  }

  private gsiLoaded = false;
  private clientId: string | null = null;
  private tokenCache = new Map<string, TokenInfo>(); // key = canonical scope string
  private currentEmail: string | null = null;        // set only when metadata scope present

  // Initialize GIS with your Web Client ID
  async init(clientId: string) {
    await this.loadGsi();
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      throw new Error('Invalid Google Web Client ID (.apps.googleusercontent.com required)');
    }
    this.clientId = clientId.trim();
  }

  // Return cached token for the requested scope union (no popup)
  getTokenCached(scopes: string | ReadonlyArray<string>): string | null {
    const key = GoogleAuthClient.canonicalizeScopes(scopes);
    const t = this.tokenCache.get(key);
    return t && Date.now() < t.expiresAt - 5000 ? t.accessToken : null;
  }

  // Open one popup to obtain token for the scope union; cache it by canonical key
  async getTokenInteractive(
    scopes: string | ReadonlyArray<string>,
    forceAccountSelect = false,
    guard?: PopupGuardOptions,
    options?: TokenInteractiveOptions
  ): Promise<{ accessToken: string; email: string | null }> {
    if (!this.clientId) throw new Error('Google client not initialized');
    await this.loadGsi();

    const SCOPE_KEY = GoogleAuthClient.canonicalizeScopes(scopes);

    // Reuse cached token if valid (no popup)
    const cached = this.getTokenCached(SCOPE_KEY);
    if (cached) return { accessToken: cached, email: this.currentEmail };

    // Otherwise request interactively (one popup)
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

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPE_KEY, // callers decide scopes; we stay agnostic
      callback: (resp: any) => {
        if (!resp?.access_token) {
          return settle(() =>
            pendingReject?.(new Error(resp?.error ?? 'Failed to obtain access token'))
          );
        }
        this.putToken(SCOPE_KEY, resp.access_token, resp.expires_in);
        settle(() => pendingResolve?.(resp.access_token));
      },
      error_callback: (err: any) => {
        guard?.onPopupClosed?.(err?.type ?? 'popup_closed');
        settle(() => pendingReject?.(new Error(err?.type ?? 'popup_closed')));
      },
    });

    const timeoutMs = Math.max(5000, guard?.timeoutMs ?? 25_000);
    timeoutId = setTimeout(() => {
      guard?.onPopupClosed?.('timeout');
      settle(() => pendingReject?.(new Error('popup_timeout')));
    }, timeoutMs);

    const onVis = () => {
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

    guard?.onPopupOpen?.();
    tokenClient.requestAccessToken({ prompt: forceAccountSelect ? 'consent' : '' });

    const accessToken = await p;

    // Optionally fetch Gmail email if panel asked for it (only when metadata scope was granted)
    if (options?.shouldFetchIdentityEmail) {
      try { this.currentEmail = await this.fetchIdentityEmail(accessToken); } catch { /* ignore */ }
    }

    return { accessToken, email: this.currentEmail };
  }

  // Revoke grant and clear cache
  async disconnect(): Promise<void> {
    const email = this.currentEmail;
    this.tokenCache.clear();
    this.currentEmail = null;
    if (email && (window as any).google?.accounts?.id?.revoke) {
      await new Promise<void>((resolve) =>
        (window as any).google.accounts.id.revoke(email, () => resolve())
      );
    }
  }

  // Return last known Gmail email (if any)
  getConnectedEmail(): string | null {
    return this.currentEmail;
  }

  // ---------- Internals ----------

  private async loadGsi(): Promise<void> {
    if (this.gsiLoaded) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.onload = () => { this.gsiLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(s);
    });
  }

  private putToken(scopeKey: string, access_token: string, expires_in: number) {
    this.tokenCache.set(scopeKey, {
      accessToken: access_token,
      expiresAt: Date.now() + Number(expires_in ?? 3600) * 1000,
    });
  }

  private async fetchIdentityEmail(accessToken: string): Promise<string | null> {
    const endpoints = [
      'https://openidconnect.googleapis.com/v1/userinfo',
      'https://www.googleapis.com/oauth2/v3/userinfo',
    ];
    for (const url of endpoints) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) {
        const j = await r.json();
        if (j?.email) return j.email as string;
      }
    }
    return null;
  }

  // Canonical cache key from scopes: dedupe, sort, join with single spaces
  static canonicalizeScopes(scopes: string | ReadonlyArray<string>): string {
    const list =
      typeof scopes === 'string'
        ? scopes.split(/\s+/).map(s => s.trim()).filter(Boolean)
        : Array.from(scopes).map(s => s.trim()).filter(Boolean);
    const uniq = Array.from(new Set(list)).sort();
    return uniq.join(' ');
  }
}

// Export a singleton for convenience
export const GoogleAuth = GoogleAuthClient.instance;