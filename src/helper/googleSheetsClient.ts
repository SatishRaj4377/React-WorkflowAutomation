/**
 * Thin Sheets client on the shared GoogleAuth core.
 * - Single popup for the Sheets union (Drive metadata + Sheets readonly)
 * - Helpers to list sheets and fetch header row
 */

import { GoogleAuth, PopupGuardOptions } from './googleAuthClient';
import { SHEETS_UNION } from './googleScopes';
import { driveListSpreadsheets } from './googleDriveClient';

// Cached Sheets union token (no popup)
export function getSheetsTokenCached(): string | null {
  return GoogleAuth.getTokenCached(SHEETS_UNION);
}

// Interactive Sheets union token (call from Auth tab button)
export async function getSheetsTokenInteractive(
  forceAccountSelect = false,
  guard?: PopupGuardOptions
): Promise<{ accessToken: string; email: string | null }> {
  return GoogleAuth.getTokenInteractive(SHEETS_UNION, forceAccountSelect, guard);
}

// List user's spreadsheets (Drive), but we require the Sheets union to keep single-popup per Sheets node
export async function sheetsListUserSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  return driveListSpreadsheets(accessToken);
}

// List sheets inside a spreadsheet
export async function sheetsListSheets(spreadsheetId: string, accessToken: string): Promise<Array<{ id: string; title: string }>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(sheetId,title))`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await safeText(r));
  const j = await r.json();
  return (j?.sheets ?? []).map((s: any) => ({
    id: String(s?.properties?.sheetId ?? ''),
    title: String(s?.properties?.title ?? ''),
  }));
}

// Fetch header row (row 1) as column names
export async function sheetsGetHeaderRow(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<string[]> {
  const range = encodeURIComponent(`${sheetTitle}!1:1`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}` +
    `?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await safeText(r));
  const j = await r.json();
  const values: any[][] = j?.values ?? [];
  return (values[0] ?? []).map((v) => String(v).trim()).filter(Boolean);
}

// Convenience: fetch sheets + optionally header row
export async function sheetsFetchSheetsAndMaybeHeaders(
  spreadsheetId: string,
  accessToken: string,
  headerSheetTitle?: string
): Promise<{ sheets: Array<{ id: string; title: string }>; headers: string[] | null }> {
  const sheets = await sheetsListSheets(spreadsheetId, accessToken);
  let headers: string[] | null = null;
  if (headerSheetTitle) headers = await sheetsGetHeaderRow(spreadsheetId, headerSheetTitle, accessToken);
  return { sheets, headers };
}

async function safeText(r: Response) { try { return await r.text(); } catch { return `Sheets error: ${r.status}`; } }