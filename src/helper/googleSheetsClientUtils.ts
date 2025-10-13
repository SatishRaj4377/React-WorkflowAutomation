// Client-side only helpers for Google Drive + Sheets metadata (UI loading needs).

type PopupGuardOptions = {
  onPopupOpen?: () => void;
  onPopupClosed?: (reason: 'popup_closed' | 'popup_failed_to_open' | 'timeout' | 'visibility') => void;
  timeoutMs?: number; // default 25000
};

type TokenInfo = { accessToken: string; expiresAt: number; scopeKey: string };

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE_SHEETS_READONLY = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SCOPE_DRIVE_METADATA_READONLY = 'https://www.googleapis.com/auth/drive.metadata.readonly';
const SHEETS_SCOPE_KEY = `${SCOPE_SHEETS_READONLY} ${SCOPE_DRIVE_METADATA_READONLY}`;

let gsiLoaded = false;
let webClientId: string | null = null;
let tokenByScope = new Map<string, TokenInfo>();

function hasValid(scopeKey: string): boolean {
  const t = tokenByScope.get(scopeKey);
  return !!t && Date.now() < t.expiresAt - 5000;
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

function putToken(scopeKey: string, access_token: string, expires_in: number) {
  tokenByScope.set(scopeKey, {
    accessToken: access_token,
    scopeKey,
    expiresAt: Date.now() + Number(expires_in ?? 3600) * 1000,
  });
}

export async function initGoogleSheetsAuth(clientId: string) {
  await loadGsi();
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    throw new Error('Invalid Google Web Client ID (.apps.googleusercontent.com required)');
  }
  webClientId = clientId.trim();
}

/** Acquire (or reuse) token for Drive metadata + Sheets readonly */
export async function getSheetsAccessTokenInteractive(
  forceAccountSelect = false,
  guard?: PopupGuardOptions
): Promise<string> {
  if (!webClientId) throw new Error('Google client not initialized for Sheets');
  await loadGsi();
  if (hasValid(SHEETS_SCOPE_KEY)) {
    return tokenByScope.get(SHEETS_SCOPE_KEY)!.accessToken;
  }

  let settled = false;
  let timeoutId: any = null;
  let cleanupVisibility: (() => void) | null = null;
  let pendingResolve: ((t: string) => void) | null = null;
  let pendingReject: ((e: any) => void) | null = null;

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (cleanupVisibility) cleanupVisibility();
    fn();
  };

  const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: webClientId,
    scope: SHEETS_SCOPE_KEY,
    callback: (resp: any) => {
      if (!resp?.access_token) {
        return settle(() => pendingReject?.(new Error(resp?.error ?? 'Failed to obtain Sheets token')));
      }
      putToken(SHEETS_SCOPE_KEY, resp.access_token, resp.expires_in);
      settle(() => pendingResolve?.(resp.access_token));
    },
    error_callback: (err: any) => {
      guard?.onPopupClosed?.(err?.type ?? 'popup_closed');
      settle(() => pendingReject?.(new Error(err?.type ?? 'popup_closed')));
    },
  });

  const timeoutMs = Math.max(5000, guard?.timeoutMs ?? 25000);
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

  const p = new Promise<string>((res, rej) => { pendingResolve = res; pendingReject = rej; });

  guard?.onPopupOpen?.();
  tokenClient.requestAccessToken({ prompt: forceAccountSelect ? 'consent' : '' });

  return p;
}

/** List spreadsheets (Drive files) for the user */
export async function listDriveSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const acc: Array<{ id: string; name: string }> = [];
  let pageToken = '';
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name),nextPageToken');

  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(await safeText(r));
    const j = await r.json();
    acc.push(...(j.files ?? []));
    pageToken = j.nextPageToken ?? '';
  } while (pageToken);

  return acc;
}

/** List sheets inside a spreadsheet */
export async function listSheets(spreadsheetId: string, accessToken: string): Promise<Array<{ id: string; title: string }>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(sheetId,title))`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await safeText(r));
  const j = await r.json();
  const sheets = (j?.sheets ?? []).map((s: any) => ({
    id: String(s?.properties?.sheetId ?? ''),
    title: String(s?.properties?.title ?? ''),
  }));
  return sheets;
}

/** Fetch header row (row 1) as column names */
export async function getHeaderRow(spreadsheetId: string, sheetTitle: string, accessToken: string): Promise<string[]> {
  const range = encodeURIComponent(`${sheetTitle}!1:1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await safeText(r));
  const j = await r.json();
  const values: any[][] = j?.values ?? [];
  const headers = (values[0] ?? []).map((v) => String(v).trim()).filter(Boolean);
  return headers;
}

async function safeText(r: Response) {
  try { return await r.text(); } catch { return `${r.status}`; }
}

// Convenience: preload everything after a user connects
export async function preloadUserDocs(clientId: string): Promise<Array<{ id: string; name: string }>> {
  await initGoogleSheetsAuth(clientId);
  const token = await getSheetsAccessTokenInteractive(false);
  return listDriveSpreadsheets(token);
}

// Convenience: get sheets + headers (for a single spreadsheet)
export async function fetchSheetsAndMaybeHeaders(
  spreadsheetId: string,
  withSheetTitleForHeaders: string | null,
  clientId: string
): Promise<{ sheets: Array<{ id: string; title: string }>; headers: string[] | null }> {
  await initGoogleSheetsAuth(clientId);
  const token = await getSheetsAccessTokenInteractive(false);
  const sheets = await listSheets(spreadsheetId, token);
  let headers: string[] | null = null;
  if (withSheetTitleForHeaders) {
    headers = await getHeaderRow(spreadsheetId, withSheetTitleForHeaders, token);
  }
  return { sheets, headers };
}
