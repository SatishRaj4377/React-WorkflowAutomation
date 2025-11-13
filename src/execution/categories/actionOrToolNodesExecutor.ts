import emailjs from '@emailjs/browser';
import { getGmailTokenCached, gmailSendRaw, toBase64Url } from '../../helper/googleGmailClient';
import { extractSpreadsheetIdFromUrl, getSheetsTokenCached, sheetsAppendRowByHeaders, sheetsCreateSheet, sheetsDeleteDimension, sheetsDeleteSheetByTitle, sheetsGetAllRows, sheetsGetHeaderRow, sheetsGetRowsWithFilters, sheetsUpdateRowByMatch, sheetsWriteHeadersIfMissing } from '../../helper/googleSheetsClient';
import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';
import { NodeModel } from '@syncfusion/ej2-react-diagrams';
import { showErrorToast, showInfoToast } from '../../components/Toast';
import { resolveTemplate } from '../../helper/expression';
import { GoogleAuth } from '../../helper/googleAuthClient';

export async function executeActionOrToolCategory(
  _node: NodeModel,
  nodeConfig: NodeConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  switch (nodeConfig.nodeType) {
    case 'EmailJS':
    case 'EmailJS Tool':
      return executeEmailJsNode(nodeConfig, context);
    case 'Gmail':
    case 'Gmail Tool':
      return executeGmailNode(nodeConfig, context);
    case 'Google Sheets':
    case 'Google Sheets Tool':
      return executeGoogleSheetsNode(nodeConfig, context);
    case 'HTTP Request':
    case 'HTTP Request Tool':
      return executeHttpRequestNode(nodeConfig, context);

    default:
      return { success: false, error: `Unsupported trigger node type: ${nodeConfig.nodeType}` };
  }
}

// ---------------- EmailJS ----------------
async function executeEmailJsNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    // 1) Read minimal required config
    const auth = nodeConfig.settings?.authentication ?? {};
    const gen = nodeConfig.settings?.general ?? {};

    const publicKey = (auth.publicKey ?? '').trim();
    const serviceId = (auth.serviceId ?? '').trim();
    const templateId = (auth.templateId ?? '').trim();

    // 2) Validate required fields (toast + cancel)
    const missing: string[] = [];
    if (!publicKey) missing.push('Public Key');
    if (!serviceId) missing.push('Service ID');
    if (!templateId) missing.push('Template ID');

    if (missing.length) {
      const msg = `Please provide: ${missing.join(', ')}.`;
      showErrorToast('EmailJS: Missing required fields', msg);
      return { success: false, error: msg };
    }

    // 3) Collect and resolve template variables
    const kvs = Array.isArray(gen.emailjsVars) ? gen.emailjsVars : [];
    // Filter out rows without a key, but count how many we dropped to warn once.
    const cleaned = kvs.filter((r: any) => (r?.key ?? '').toString().trim().length > 0);
    const dropped = kvs.length - cleaned.length;
    if (dropped > 0) {
      // soft warning; do not fail execution
      showErrorToast('EmailJS: Ignoring empty variable names',
        `Ignored ${dropped} variable row(s) with empty key.`);
    }

    // Resolve every value through your templating system so expressions work:
    // VariablePickerTextBox typically stores strings with {{ ... }} expressions.
    const templateParams: Record<string, any> = {};
    for (const row of cleaned) {
      const k = row.key.toString().trim();
      const raw = (row.value ?? '').toString();
      const resolved = resolveTemplate(raw, { context }); // expands {{ ... }} using current run context
      // Keep the raw empty string as valid; users may intentionally set ""
      templateParams[k] = resolved;
    }

    // 4) Enforce EmailJS dynamic vars payload limit (~50 KB, exclude attachments)
    const approxBytes = new Blob([JSON.stringify(templateParams)]).size;
    if (approxBytes > 50_000) {
      const msg = `Template variables exceed 50 KB (current ~${approxBytes} bytes). Reduce payload size.`;
      showErrorToast('EmailJS: Payload too large', msg);
      return { success: false, error: msg };
    }

    // 5) Send the email via EmailJS SDK.
    // Passing { publicKey } here is supported; EmailJS also allows global init with the same key.
    // Note: EmailJS rate-limits to ~1 request/second. Consider sequencing if users chain sends. [2](https://syncfusion-my.sharepoint.com/personal/satishraj_raju_syncfusion_com/Documents/Microsoft%20Copilot%20Chat%20Files/BaseExecutors.txt)
    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      { publicKey } // ensures we don't depend on a prior global init
    );

    // 6) Return success payload (also stored to context by base class)
    return {
      success: true,
      data: {
        status: response?.status,     // e.g., 200
        text: response?.text,         // e.g., "OK"
        templateParams
      }
    };
  } catch (err: any) {
    // 7) Surface a clean error to the user
    const message = (err?.text || err?.message || `${err}`)?.toString();
    showErrorToast('EmailJS Send Failed', message);
    return { success: false, error: message };
  }
}

// ---------------- HTTP Request ----------------
async function executeHttpRequestNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  debugger
  try {
    const general = (nodeConfig.settings?.general ?? {}) as any;

    // 1) Resolve base URL from templates/variables
    const rawUrl = resolveTemplate(String(general.url ?? ''), { context }).trim();
    if (!rawUrl) {
      const msg = 'HTTP Request: Please provide a URL.';
      showErrorToast('HTTP Request Missing URL', msg);
      return { success: false, error: msg };
    }

    // 2) Normalize method to GET (UI supports only GET for now)
    const method = 'GET';

    // 3) Build query string from name/value pairs, both support VariablePicker
    const qpArray: Array<{ key: string; value: string }> = Array.isArray(general.queryParams)
      ? general.queryParams
      : [];

    const urlObj = new URL(rawUrl, window.location.origin);
    for (const row of qpArray) {
      const name = resolveTemplate(String(row?.key ?? ''), { context }).trim();
      if (!name) continue; // ignore empty keys
      const value = resolveTemplate(String(row?.value ?? ''), { context });
      urlObj.searchParams.append(name, String(value));
    }

    // 4) Resolve and parse headers JSON (optional)
    let headers: Record<string, string> | undefined = undefined;
    if (general.headers && String(general.headers).trim().length > 0) {
      try {
        const headersStr = resolveTemplate(String(general.headers), { context });
        const parsed = JSON.parse(headersStr || '{}');
        // Coerce values to strings for Fetch headers
        headers = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, v != null ? String(v) : ''])
        );
      } catch (e: any) {
        const msg = 'HTTP Request: Headers must be valid JSON.';
        showErrorToast('HTTP Request Invalid Headers', msg);
        return { success: false, error: msg };
      }
    }

    const requestInit: RequestInit = { method, headers };

    const startedAt = Date.now();
    const response = await fetch(urlObj.toString(), requestInit);
    const elapsedMs = Date.now() - startedAt;

    // Read response headers as plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { responseHeaders[k] = v; });

    // Heuristic to parse JSON bodies safely
    const contentType = response.headers.get('content-type') || '';
    let bodyJson: any = null;
    let bodyText: string | null = null;
    try {
      if (/json/i.test(contentType)) {
        bodyJson = await response.json();
      } else {
        bodyText = await response.text();
      }
    } catch {
      // If parsing fails, fall back to text
      try {
        bodyText = await response.text();
      } catch {
        bodyText = null;
      }
    }

    const resultPayload = {
      url: urlObj.toString(),
      method,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      elapsedMs,
      request: {
        queryParams: qpArray.map(q => ({
          key: resolveTemplate(String(q?.key ?? ''), { context }).trim(),
          value: resolveTemplate(String(q?.value ?? ''), { context }),
        })),
        headers: headers ?? {},
      },
      response: {
        headers: responseHeaders,
        contentType,
      },
      body: bodyJson ?? bodyText,
    };

    if (!response.ok) {
      // Treat HTTP errors as failure but still return payload for debugging/variables
      const msg = `HTTP ${response.status} ${response.statusText}`;
      return { success: false, error: msg, data: resultPayload } as NodeExecutionResult;
    }

    return { success: true, data: resultPayload };
  } catch (err: any) {
    const message = (err?.message ?? `${err}`)?.toString();
    showErrorToast('HTTP Request Failed', message);
    return { success: false, error: message };
  }
}


// ---------------- Gmail ----------------
async function executeGmailNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    // 1) Ensure user is connected (we rely on Auth tab for the single-popup consent)
    const account = GoogleAuth.getConnectedEmail(); // may be null if Gmail metadata not granted
    if (!account) {
      const msg = 'Gmail: Connect your Google account in the Authentication tab.';
      showErrorToast('Gmail Authentication Missing', msg);
      return { success: false, error: msg };
    }

    // 2) Get a cached token for Gmail’s scope union (send + metadata). No popup here.
    const token = getGmailTokenCached();
    if (!token) {
      const msg = 'Gmail token expired/missing. Please re-connect in Authentication tab.';
      showErrorToast('Gmail Token Required', msg);
      return { success: false, error: msg };
    }

    // 3) Prepare the message from node settings (templated)
    const gen = nodeConfig.settings?.general ?? {};
    const to = resolveTemplate(gen.to ?? '', { context }).trim();
    const subject = resolveTemplate(gen.subject ?? '', { context }).trim();
    const body = resolveTemplate(gen.message ?? '', { context }).toString();

    if (!to || !subject) {
      const msg = 'Gmail: "To" and "Subject" are required.';
      showErrorToast('Gmail Missing Fields', msg);
      return { success: false, error: msg };
    }

    // 4) Build RFC 2822 message and base64url encode
    const mime =
      `From: ${account}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
      `${body}`;

    const raw = toBase64Url(mime);

    // 5) Send via Gmail API
    const json = await gmailSendRaw(raw, token);

    return {
      success: true,
      data: {
        id: json?.id ?? null,
        threadId: json?.threadId ?? null,
        labelIds: Array.isArray(json?.labelIds) ? json.labelIds.slice() : [],
        to,
        subject,
        sentAt: new Date().toISOString(),
        provider: 'gmail',
      },
    };
  } catch (err: any) {
    const message = (err?.message ?? `${err}`)?.toString();
    showErrorToast('Gmail Send Failed', message);
    return { success: false, error: message };
  }
}

// ----------------------- Google Sheets -----------------------
async function executeGoogleSheetsNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    // 0) Read settings and resolve all template-capable fields (VariablePicker)
    const gen = (nodeConfig.settings?.general ?? {}) as any; // shapes validated against sidebar
    const op = String(gen.operation ?? '').trim();

    // Helper to resolve template strings safely
    const rt = (v: any) => resolveTemplate(String(v ?? ''), { context }).trim();

    // Some configs store URL, some store documentId; support both
    const rawDocumentUrl = rt(gen.documentUrl ?? '');
    const rawDocumentId = rt(gen.documentId ?? '');
    const spreadsheetId = extractSpreadsheetIdFromUrl(rawDocumentUrl) || (rawDocumentId || '');

    const sheetName = rt(gen.sheetName ?? gen.sheet ?? '');
    const title = rt(gen.title ?? ''); // for Create Sheet

    // Structured sub-payloads (follow your UI keys)
    const appendValues = (gen.appendValues ?? {}) as Record<string, any>;
    const upd = (gen.update ?? {}) as any;
    const del = (gen.delete ?? {}) as any;
    const getRows = (gen.getRows ?? {}) as any;

    // 1) Validate auth: execution must not trigger a popup.
    const token = getSheetsTokenCached();
    if (!token) {
      const msg = 'Google Sheets: Please connect your Google account in the Authentication tab.';
      showErrorToast('Sheets Authentication Missing', msg);
      return { success: false, error: msg };
    }

    // 2) Dispatch by operation (match the UI drop-down)
    switch (op) {
      // -------- 1) Create Sheet --------
      case 'Create Sheet': {
        // Inputs: Document ID, Sheet Title
        const docId = spreadsheetId || rt(gen.documentId ?? '');
        if (!docId || !title) {
          const msg = 'Create Sheet: Please provide both Document ID and Sheet Title.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }

        // read optional headers
        const headers: string[] | undefined =
          Array.isArray((gen.create ?? {}).headers) ? (gen.create.headers as string[]) : undefined;

        // Try to Create sheet
        try {
          const created = await sheetsCreateSheet(docId, title, token, headers);
          return { success: true, data: { created, documentId: docId, title, createdNew: true, headersApplied: Array.isArray(headers) && headers.length > 0 } };
        }
        // Handle if sheets already exists, check if need to update the header and mark as success
        catch (e: any) {
          const msg = (e?.message ?? String(e)).toString();

          if (/already\s+exists/i.test(msg)) {
            // Try to add headers only if provided and missing
            const headers: string[] | undefined =
              Array.isArray((gen.create ?? {}).headers) ? (gen.create.headers as string[]) : undefined;

            let headersApplied = false;
            try {
              if (headers && headers.length > 0) {
                headersApplied = await sheetsWriteHeadersIfMissing(docId, title, headers, token);
              }
            } catch {
              // Swallow header write errors per requirement; treat as non-blocking
              headersApplied = false;
            }

            // Toasts (informational) and success result
            if (headersApplied) {
              showInfoToast('Google Sheets', `Sheet "${title}" already exists — added headers to row 1.`);
            } else {
              showInfoToast('Google Sheets', `Sheet "${title}" already exists — skipped creation.`);
            }

            return {
              success: true,
              data: {
                createdNew: false,
                reason: 'already-exists',
                documentId: docId,
                title,
                headersApplied
              }
            };
          }
          throw e;
        }

      }

      // -------- 2) Delete Sheet --------
      case 'Delete Sheet': {
        // Inputs: Document ID, Sheet Name
        const docId = spreadsheetId || rt(gen.documentId ?? '');
        if (!docId || !sheetName) {
          const msg = 'Delete Sheet: Please provide Document ID and Sheet Name.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }


        // Try to delete sheet
        try {
          const removed = await sheetsDeleteSheetByTitle(docId, sheetName, token);
          return { success: true, data: { deleted: true, detail: removed, documentId: docId, sheetName } };
        } catch (e: any) {
          // Handle if sheet already exists, mark as success
          const msg = (e?.message ?? String(e)).toString();
          // Our client throws "Sheet "<title>" not found" when the sheet title is missing
          if (/not\s+found/i.test(msg)) {
            // Treat as success: nothing to delete
            showInfoToast('Google Sheets', `Sheet "${sheetName}" not found — nothing to delete.`);
            return {
              success: true,
              data: { deleted: false, reason: 'not-found', documentId: docId, sheetName }
            };
          }
          // Any other error: keep existing behaviour
          throw e;
        }

      }

      // -------- 3) Append Row --------
      case 'Append Row': {
        // Inputs: Document URL, Sheet Name; plus mapped values per column
        const docId = spreadsheetId;
        if (!docId || !sheetName) {
          const msg = 'Append Row: Please provide Document URL (or ID) and Sheet Name.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }

        // Resolve each mapped value (may contain expressions)
        const resolvedMap: Record<string, any> = {};
        for (const [k, v] of Object.entries(appendValues)) {
          resolvedMap[k] = resolveTemplate(String(v ?? ''), { context });
        }

        // Ensure headers exist
        const headers = await sheetsGetHeaderRow(docId, sheetName, token);
        if (!headers || headers.length === 0) {
          const msg = 'Append Row: No column headers found. Create headers in row 1 and try again.';
          showErrorToast('Sheets Headers Missing', msg);
          return { success: false, error: msg };
        }

        const result = await sheetsAppendRowByHeaders(docId, sheetName, headers, resolvedMap, token);
        return { success: true, data: { appended: true, updatedRange: result?.updates?.updatedRange ?? null } };
      }

      // -------- 4) Update Row --------
      case 'Update Row': {
        // Inputs: Document URL/ID, Sheet Name, Column to Match, Values (includes the match value)
        const docId = spreadsheetId;
        const matchColumn = rt(upd?.matchColumn ?? '');

        if (!docId || !sheetName || !matchColumn) {
          const msg = 'Update Row: Provide Document URL/ID, Sheet Name, and the Column to Match.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }

        // Values map comes from the UI. The entry under the match column key is the *lookup value*.
        const rawValuesMap = (upd?.values ?? {}) as Record<string, any>;

        // 1) Pull the match value from the map and resolve templates
        const hasMatchKey = Object.prototype.hasOwnProperty.call(rawValuesMap, matchColumn);
        const matchValue = hasMatchKey ? rt(rawValuesMap[matchColumn]) : '';

        if (!matchValue) {
          const msg = `Update Row: Provide a value under "${matchColumn}" in "Values to update" to locate the row.`;
          showErrorToast('Sheets Missing Match Value', msg);
          return { success: false, error: msg };
        }

        // 2) Build the update map excluding the match column (don’t overwrite the locator column)
        const resolvedMap: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawValuesMap)) {
          if (k === matchColumn) continue; // do not update the column used for matching
          resolvedMap[k] = resolveTemplate(String(v ?? ''), { context });
        }

        if (Object.keys(resolvedMap).length === 0) {
          const msg = 'Update Row: No columns to update. Add at least one value other than the match column.';
          showErrorToast('Sheets Nothing To Update', msg);
          return { success: false, error: msg };
        }

        // 3) Perform the update using your helper (string-compare with trimmed cells)
        const updated = await sheetsUpdateRowByMatch(
          docId,
          sheetName,
          matchColumn,
          matchValue,
          resolvedMap,
          token
        );

        if (!updated?.found) {
          const msg = `Update Row: No row matched where "${matchColumn}" equals "${matchValue}".`;
          showErrorToast('Sheets No Match', msg);
          return { success: false, error: msg };
        }

        return {
          success: true,
          data: {
            updated: true,
            rowIndex: updated.rowIndex,                  // 1-based row index that was updated
            updatedRange: updated.updatedRange ?? null,  // A1 range returned by Sheets
            matchedOn: { column: matchColumn, value: matchValue },
          },
        };
      }

      // -------- 5) Delete Row/Column --------
      case 'Delete Row/Column': {
        // Inputs: Document URL/ID, Sheet Name, Type (Row/Column), Start Index, Count
        const rawType = String(del?.target ?? 'Row');
        const type: 'Row' | 'Column' = rawType === 'Column' ? 'Column' : 'Row';
        const docId = spreadsheetId;
        const startIndex = Math.max(1, Number(del?.startIndex ?? 1));
        const count = Math.max(1, Number(del?.count ?? 1));
        const columnLetter =
          type === 'Column'
            ? String(del?.startColumnLetter ?? '')
              .toUpperCase()
              .replace(/[^A-Z]/g, '') || undefined
            : undefined;

        if (!docId || !sheetName) {
          const msg = 'Delete Row/Column: Provide Document URL/ID and Sheet Name.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }

        const resp = await sheetsDeleteDimension({
          spreadsheetId: docId,
          sheetTitle: sheetName,
          type,                // 'Row' | 'Column'
          startIndex,
          count,
          columnLetter,
          accessToken: token,
        });

        return { success: true, data: { deleted: true, detail: resp } };
      }

      // -------- 6) Get Row(s) --------
      case 'Get Row(s)': {
        // Inputs: Document URL/ID, Sheet Name, Filters (Column, Value), Logic (AND/OR)
        const docId = spreadsheetId;
        const logic = (getRows?.combineWith ?? 'AND') as 'AND' | 'OR';
        const filters = Array.isArray(getRows?.filters) ? getRows.filters : [];

        if (!docId || !sheetName) {
          const msg = 'Get Row(s): Provide Document URL/ID and Sheet Name.';
          showErrorToast('Sheets Missing Fields', msg);
          return { success: false, error: msg };
        }

        // Resolve filter values
        const resolvedFilters = filters
          .map((f: any) => ({
            column: String(f?.column ?? '').trim(),
            value: resolveTemplate(String(f?.value ?? ''), { context }),
          }))
          .filter((f: any) => f.column.length > 0);

        let result: { headers: string[]; rows: Array<Record<string, any>> };
        if (resolvedFilters.length === 0) {
          // No filters -> fetch all rows for the selected sheet
          const headers = await sheetsGetHeaderRow(docId, sheetName, token);
          if (!headers?.length) {
            const msg = 'Get Row(s): No columns found. Create headers in row 1 and try again.';
            showErrorToast('Sheets Headers Missing', msg);
            return { success: false, error: msg };
          }
          result = await sheetsGetAllRows(docId, sheetName, token);
        } else {
          result = await sheetsGetRowsWithFilters(
            docId,
            sheetName,
            resolvedFilters,
            logic,
            token
          );
        }

        if (!result?.headers?.length) {
          const msg = 'Get Row(s): No columns found. Create headers in row 1 and try again.';
          showErrorToast('Sheets Headers Missing', msg);
          return { success: false, error: msg };
        }

        return {
          success: true,
          data: {
            count: result.rows.length,
            headers: result.headers,
            rows: result.rows,     // array of objects { header: value }
          },
        };
      }

      default: {
        const msg = `Google Sheets: Unsupported or missing operation.`;
        showErrorToast('Sheets Operation Error', msg);
        return { success: false, error: msg };
      }
    }
  } catch (err: any) {
    const message = (err?.message ?? `${err}`)?.toString();
    showErrorToast('Google Sheets Execution Failed', message);
    return { success: false, error: message };
  }
}
