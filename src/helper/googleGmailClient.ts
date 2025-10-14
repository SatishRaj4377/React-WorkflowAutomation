/**
 * Thin Gmail client on the shared GoogleAuth core.
 * - Single popup for Gmail union (send + metadata)
 * - Token reused from cache for subsequent actions
 */

import { GoogleAuth, PopupGuardOptions } from './googleAuthClient';
import { GMAIL_UNION } from './googleScopes';

// Return cached Gmail token (no popup)
export function getGmailTokenCached(): string | null {
  return GoogleAuth.getTokenCached(GMAIL_UNION);
}

// Interactive Gmail token acquisition (call from Auth tab user gesture)
export async function getGmailTokenInteractive(
  forceAccountSelect = false,
  guard?: PopupGuardOptions
): Promise<{ accessToken: string; email: string | null }> {
  return GoogleAuth.getTokenInteractive(
    GMAIL_UNION,
    forceAccountSelect,
    guard,
    { shouldFetchGmailEmail: true } // only Gmail needs profile email
  );
}

// Send base64url-encoded RFC 2822 message via Gmail API
export async function gmailSendRaw(rawBase64Url: string, accessToken: string) {
  const resp = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: rawBase64Url }),
    }
  );
  if (!resp.ok) throw new Error(await safeText(resp));
  return resp.json();
}

// Convenience: build & send a simple text email
export async function gmailSendSimple(
  accessToken: string,
  params: { from?: string; to: string; subject: string; text: string }
) {
  const from = params.from || (GoogleAuth.getConnectedEmail() ?? '');
  const mime =
    `From: ${from}\r\n` +
    `To: ${params.to}\r\n` +
    `Subject: ${params.subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    `${params.text}`;
  const raw = toBase64Url(mime);
  return gmailSendRaw(raw, accessToken);
}

// Keep util name for compatibility
export function toBase64Url(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function safeText(r: Response) { try { return await r.text(); } catch { return `Gmail error: ${r.status}`; } }