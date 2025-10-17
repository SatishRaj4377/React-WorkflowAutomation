/**
 * Thin Sheets client on the shared GoogleAuth core.
 * - Single popup for the Sheets union (Drive metadata + Sheets readonly)
 * - Helpers to list sheets and fetch header row
 */

import { GoogleAuth, PopupGuardOptions } from './googleAuthClient';
import { SHEETS_UNION } from './googleScopes';
import { driveListSpreadsheets } from './googleDriveClient';
import { DeleteDimParams } from '../types';

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

// Extract spreadsheetId from a Google Sheets URL
export function extractSpreadsheetIdFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
    return m ? m[1] : null;
  } catch { return null; }
}

// A1 helpers
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function colIndexToLetter(n: number): string {
  if (!n || n < 1) return '';
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = COLS[r] + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export function colLetterToIndex(s: string): number {
  if (!s) return 0;
  let n = 0; const up = s.trim().toUpperCase();
  for (let i = 0; i < up.length; i++) { const c = up.charCodeAt(i); if (c < 65 || c > 90) return 0; n = n * 26 + (c - 64); }
  return n;
}

async function getSpreadsheetMeta(spreadsheetId: string, accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(sheetId,title))`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(`Sheets meta error: ${r.status}`);
  const j = await r.json();
  const map = new Map<string, number>();
  (j?.sheets ?? []).forEach((s: any) => map.set(String(s?.properties?.title ?? ''), Number(s?.properties?.sheetId ?? 0)));
  return map; // title -> sheetId
}

async function getSheetIdByTitle(spreadsheetId: string, title: string, accessToken: string): Promise<number> {
  const map = await getSpreadsheetMeta(spreadsheetId, accessToken);
  if (!map.has(title)) throw new Error(`Sheet "${title}" not found`);
  return map.get(title)!;
}

export async function sheetsCreateSheet(spreadsheetId: string, title: string, accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
  const body = { requests: [{ addSheet: { properties: { title } } }] };
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sheetsDeleteSheetByTitle(spreadsheetId: string, title: string, accessToken: string) {
  const sheetId = await getSheetIdByTitle(spreadsheetId, title, accessToken);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
  const body = { requests: [{ deleteSheet: { sheetId } }] };
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sheetsAppendRowByHeaders(
  spreadsheetId: string,
  sheetTitle: string,
  headers: string[],
  valuesMap: Record<string, any>,
  accessToken: string
) {
  // align values in header order; empty string when not provided
  const row = headers.map(h => (valuesMap[h] ?? '').toString());
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetTitle)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sheetsUpdateRowByMatch(
  spreadsheetId: string,
  sheetTitle: string,
  matchColumn: string,
  matchValue: any,
  updateMap: Record<string, any>,
  accessToken: string
): Promise<{ found: boolean; rowIndex?: number; updatedRange?: string }> {
  // 1) Fetch all values (headers + data)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetTitle)}?valueRenderOption=FORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  const rows: string[][] = j?.values ?? [];
  if (!rows.length) return { found: false };

  const headers = (rows[0] ?? []).map(v => String(v ?? '').trim());
  if (!headers.length) return { found: false };

  const colIdx = headers.findIndex(h => h === matchColumn);
  if (colIdx < 0) return { found: false };

  // 2) Find the first row whose matchColumn equals matchValue (string compare after trim)
  const norm = (x: any) => String(x ?? '').trim();
  const target = norm(matchValue);
  let rowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (norm(rows[i][colIdx]) === target) { rowIdx = i; break; }
  }
  if (rowIdx < 0) return { found: false };

  // 3) Build updated row (preserve existing cells unless overridden)
  const lastColLetter = colIndexToLetter(headers.length);
  const a1Range = `${sheetTitle}!A${rowIdx + 1}:${lastColLetter}${rowIdx + 1}`;
  const current = rows[rowIdx] ?? [];
  const merged = headers.map((h, i) => {
    const v = updateMap[h];
    return v !== undefined ? String(v) : (current[i] ?? '');
  });

  // 4) Push update for that specific row range
  const u = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(a1Range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [merged] }),
    }
  );
  if (!u.ok) throw new Error(await u.text());
  const updated = await u.json();
  return { found: true, rowIndex: rowIdx + 1, updatedRange: updated?.updatedRange };
}

export async function sheetsDeleteDimension(p: DeleteDimParams) {
  const sheetId = await getSheetIdByTitle(p.spreadsheetId, p.sheetTitle, p.accessToken);
  const isRow = p.type === 'Row';
  const start =
    isRow
      ? Math.max(0, Number(p.startIndex || 1) - 1) // API expects 0-based
      : Math.max(0, (p.columnLetter ? colLetterToIndex(p.columnLetter) : Number(p.startIndex || 1)) - 1);
  const end = start + Math.max(1, Number(p.count || 1));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(p.spreadsheetId)}:batchUpdate`;
  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId,
            dimension: isRow ? 'ROWS' : 'COLUMNS',
            startIndex: start,
            endIndex: end,
          },
        },
      },
    ],
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sheetsGetRowsWithFilters(
  spreadsheetId: string,
  sheetTitle: string,
  filters: Array<{ column: string; value: any }>,
  logic: 'AND' | 'OR',
  accessToken: string
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetTitle)}?valueRenderOption=FORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  const values: any[][] = j?.values ?? [];
  if (!values.length) return { headers: [], rows: [] };

  const headers = (values[0] ?? []).map(v => String(v ?? '').trim());
  if (!headers.length) return { headers: [], rows: [] };

  const bodyRows = values.slice(1);
  const idx = (name: string) => headers.findIndex(h => h === name);

  // Pre-compute filter column indices
  const checks = filters
    .map(f => ({ ...f, i: idx(f.column), v: String(f.value ?? '').trim() }))
    .filter(f => f.i >= 0);

  const rows = bodyRows
    .map(rw => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => (obj[h] = rw[i] ?? ''));
      return obj;
    })
    .filter(obj => {
      if (!checks.length) return true;
      const pass = checks.map(c => String(obj[headers[c.i]] ?? '').trim() === c.v);
      return logic === 'AND' ? pass.every(Boolean) : pass.some(Boolean);
    });

  return { headers, rows };
}


export async function sheetsGetAllRows(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<{ headers: string[]; rows: Array<Record<string, any>> }> {
  // Read all rows in the sheet. Using "1:999999" to cover all populated rows.
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${
    encodeURIComponent(spreadsheetId)
  }/values/${encodeURIComponent(sheetTitle)}!1:999999?majorDimension=ROWS`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sheets get-all failed: ${res.status} ${res.statusText} ${text}`.trim());
  }

  const json = await res.json();
  const values: any[][] = Array.isArray(json?.values) ? json.values : [];

  if (values.length === 0) return { headers: [], rows: [] };

  // Row 1 = headers
  const headers = values[0].map((h: any) => String(h ?? '').trim());
  // Remaining rows mapped to { header: value }
  const rows = values.slice(1).map((r) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}
