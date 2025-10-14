/**
 * Thin Drive client on top of the shared GoogleAuth core.
 * - Single popup for Drive metadata readonly (when used directly)
 * - Helpers to list files and spreadsheets (used by Sheets/Docs nodes)
 */

import { GoogleAuth, PopupGuardOptions } from './googleAuthClient';
import { DRIVE_UNION } from './googleScopes';

// Return cached Drive token (no popup)
export function getDriveTokenCached(): string | null {
  return GoogleAuth.getTokenCached(DRIVE_UNION);
}

// Obtain Drive token interactively (call from user gesture)
export async function getDriveTokenInteractive(
  forceAccountSelect = false,
  guard?: PopupGuardOptions
): Promise<{ accessToken: string; email: string | null }> {
  return GoogleAuth.getTokenInteractive(DRIVE_UNION, forceAccountSelect, guard);
}

// Generic file list with a query
export async function driveListFiles(
  accessToken: string,
  options?: { q?: string; fields?: string; pageSize?: number; pageToken?: string }
): Promise<{ files: Array<{ id: string; name: string }>; nextPageToken: string }> {
  const q         = options?.q ? `q=${encodeURIComponent(options.q)}` : '';
  const fields    = `fields=${encodeURIComponent(options?.fields ?? 'files(id,name),nextPageToken')}`;
  const pageSize  = `pageSize=${options?.pageSize ?? 200}`;
  const pageToken = options?.pageToken ? `pageToken=${encodeURIComponent(options.pageToken)}` : '';
  const params    = [q, fields, pageSize, pageToken].filter(Boolean).join('&');

  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await safeText(r));
  const j = await r.json();
  return { files: j?.files ?? [], nextPageToken: j?.nextPageToken ?? '' };
}

// List all spreadsheets (mime filter), handling paging
export async function driveListSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const acc: Array<{ id: string; name: string }> = [];
  let token = '';
  const q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  do {
    const { files, nextPageToken } = await driveListFiles(accessToken, {
      q, pageSize: 200, pageToken: token, fields: 'files(id,name),nextPageToken',
    });
    acc.push(...files);
    token = nextPageToken;
  } while (token);
  return acc;
}

async function safeText(r: Response) { try { return await r.text(); } catch { return `Drive error: ${r.status}`; } }