/**
 * Single place for Google OAuth scopes and node→scope mappings.
 * Keep all raw scope URIs and unions here; import everywhere else.
 */

// ---- Raw scopes ----
export const OPENID = 'openid';
export const EMAIL = 'email';
export const PROFILE = 'profile';

export const GMAIL_SEND              = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_METADATA          = 'https://www.googleapis.com/auth/gmail.metadata';

export const DRIVE_METADATA_READONLY = 'https://www.googleapis.com/auth/drive.metadata.readonly';

export const SHEETS_READONLY         = 'https://www.googleapis.com/auth/spreadsheets.readonly';
export const DOCS_READONLY           = 'https://www.googleapis.com/auth/documents.readonly';
export const CALENDAR_READONLY       = 'https://www.googleapis.com/auth/calendar.readonly';

// ---- Unions per service ----
export const IDENTITY_CORE: string[] = [OPENID, EMAIL, PROFILE];
export const GMAIL_UNION   : string[] = [...IDENTITY_CORE, GMAIL_SEND, GMAIL_METADATA];
export const DRIVE_UNION   : string[] = [...IDENTITY_CORE, DRIVE_METADATA_READONLY];
export const SHEETS_UNION  : string[] = [...IDENTITY_CORE, DRIVE_METADATA_READONLY, SHEETS_READONLY];
export const DOCS_UNION    : string[] = [...IDENTITY_CORE, DRIVE_METADATA_READONLY, DOCS_READONLY];
export const CALENDAR_UNION: string[] = [...IDENTITY_CORE, CALENDAR_READONLY];

// ---- Node → scopes mapping ----
export const GoogleNodeScopes: Record<string, string[]> = {
  'Gmail':           GMAIL_UNION,
  'Google Sheets':   SHEETS_UNION,
  'Google Docs':     DOCS_UNION,
  'Google Calendar': CALENDAR_UNION,
  'Google Drive':    DRIVE_UNION,
};

// Helper: get scopes for a node type safely
export function getScopesForNode(nodeType: string): string[] {
  return GoogleNodeScopes[nodeType] ?? [];
}