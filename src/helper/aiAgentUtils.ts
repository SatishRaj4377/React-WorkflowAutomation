import { NodeModel } from "@syncfusion/ej2-react-diagrams";
import { NodeConfig, ToolDescriptor } from "../types";
import { getAllTargetsBySourcePortIncludingTools } from "./utilities";



// small helper: extract "SheetName" from "SheetName!A:C"
export const getSheetFromA1 = (range?: string): string | undefined => {
  if (!range) return undefined;
  const idx = range.indexOf('!');
  return idx > 0 ? range.slice(0, idx) : undefined;
};

// ---------- Google Sheets tool factories (read/append/update/get) ----------

export const makeSheetsReadRangeTool = (toolNode: NodeModel): ToolDescriptor => ({
  toolNodeId: toolNode.id as string,
  toolName: 'google_sheets.read_range',
  title: 'Google Sheets: Read range',
  description: 'Read tabular data from a sheet range using A1 notation. Use when you must fetch rows/columns to answer.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['spreadsheetId', 'range'],
    properties: {
      spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
      range:         { type: 'string', description: 'A1 range, e.g., Leads!A:C' }
    }
  },
  toAzureTool() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.description,
        parameters: this.parameters,
      }
    };
  },
  applyArgsToNodeConfig(nodeConfig, args) {
    // Map to your existing "Get Row(s)" executor path; infer sheet from A1.
    const next: NodeConfig = { ...nodeConfig, settings: { ...nodeConfig.settings } };
    const g = { ...(next.settings?.general ?? {}) };
    g.operation  = 'Get Row(s)';
    g.documentId = args.spreadsheetId ?? g.documentId;
    g.sheetName  = getSheetFromA1(args.range) ?? g.sheetName;
    g.getRows    = { combineWith: 'AND', filters: [] }; // fetch all rows for that sheet
    next.settings.general = g;
    return next;
  }
});

export const makeSheetsAppendRowsTool = (toolNode: NodeModel): ToolDescriptor => ({
  toolNodeId: toolNode.id as string,
  toolName: 'google_sheets.append_rows',
  title: 'Google Sheets: Append rows',
  description: 'Append one or more rows by header names to the end of the selected sheet.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['spreadsheetId', 'sheetName', 'values'],
    properties: {
      spreadsheetId: { type: 'string' },
      sheetName:     { type: 'string' },
      values: {
        type: 'array',
        description: 'Array of row objects keyed by header names',
        items: { type: 'object', additionalProperties: true }
      }
    }
  },
  toAzureTool() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.description,
        parameters: this.parameters,
      }
    };
  },
  applyArgsToNodeConfig(nodeConfig, args) {
    const next: NodeConfig = { ...nodeConfig, settings: { ...nodeConfig.settings } };
    const g = { ...(next.settings?.general ?? {}) };
    g.operation  = 'Append Row';
    g.documentId = args.spreadsheetId ?? g.documentId;
    g.sheetName  = args.sheetName ?? g.sheetName;

    // Executor expects a single row map (appendValues). If multiple rows arrive, take first for MVP.
    const first = Array.isArray(args.values) ? args.values[0] : args.values;
    g.appendValues = first ?? {};
    next.settings.general = g;
    return next;
  }
});

export const makeSheetsUpdateRowTool = (toolNode: NodeModel): ToolDescriptor => ({
  toolNodeId: toolNode.id as string,
  toolName: 'google_sheets.update_row',
  title: 'Google Sheets: Update row by match',
  description: 'Update a row by matching a column value; values map uses header names as keys.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['spreadsheetId', 'sheetName', 'matchColumn', 'values'],
    properties: {
      spreadsheetId: { type: 'string' },
      sheetName:     { type: 'string' },
      matchColumn:   { type: 'string', description: 'Header to match on' },
      values:        { type: 'object', additionalProperties: true, description: 'New values by header name; include matchColumn with the lookup value' }
    }
  },
  toAzureTool() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.description,
        parameters: this.parameters,
      }
    };
  },
  applyArgsToNodeConfig(nodeConfig, args) {
    const next: NodeConfig = { ...nodeConfig, settings: { ...nodeConfig.settings } };
    const g = { ...(next.settings?.general ?? {}) };
    g.operation  = 'Update Row';
    g.documentId = args.spreadsheetId ?? g.documentId;
    g.sheetName  = args.sheetName ?? g.sheetName;
    g.update = {
      matchColumn: args.matchColumn,
      values: args.values ?? {}
    };
    next.settings.general = g;
    return next;
  }
});

export const makeSheetsGetRowsTool = (toolNode: NodeModel): ToolDescriptor => ({
  toolNodeId: toolNode.id as string,
  toolName: 'google_sheets.get_rows',
  title: 'Google Sheets: Get rows (filters)',
  description: 'Get rows from a sheet by optional filters (column/value pairs). Leave filters empty to fetch all.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['spreadsheetId', 'sheetName'],
    properties: {
      spreadsheetId: { type: 'string' },
      sheetName:     { type: 'string' },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['column', 'value'],
          properties: { column: { type: 'string' }, value: { type: 'string' } }
        }
      },
      combineWith: { enum: ['AND', 'OR'], default: 'AND' }
    }
  },
  toAzureTool() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.description,
        parameters: this.parameters,
      }
    };
  },
  applyArgsToNodeConfig(nodeConfig, args) {
    const next: NodeConfig = { ...nodeConfig, settings: { ...nodeConfig.settings } };
    const g = { ...(next.settings?.general ?? {}) };
    g.operation  = 'Get Row(s)';
    g.documentId = args.spreadsheetId ?? g.documentId;
    g.sheetName  = args.sheetName ?? g.sheetName;
    g.getRows = {
      combineWith: (args.combineWith === 'OR' ? 'OR' : 'AND'),
      filters: Array.isArray(args.filters) ? args.filters : []
    };
    next.settings.general = g;
    return next;
  }
});

// ---------- Gmail tool factory ----------

export const makeGmailSendEmailTool = (toolNode: NodeModel): ToolDescriptor => ({
  toolNodeId: toolNode.id as string,
  toolName: 'gmail.send_email',
  title: 'Gmail: Send email',
  description: 'Send an email via Gmail. Use when the user asks to email someone or share results by email.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['to', 'subject'],
    properties: {
      to:      { type: 'string', description: 'Recipient email(s). Comma-separated if multiple.' },
      subject: { type: 'string' },
      bodyText:{ type: 'string' }
    }
  },

  toAzureTool() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.description,
        parameters: this.parameters,
      }
    };
  },

  applyArgsToNodeConfig(nodeConfig, args) {
    const next: NodeConfig = { ...nodeConfig, settings: { ...nodeConfig.settings } };
    const g = { ...(next.settings?.general ?? {}) };

    const toRaw =
      typeof args.to === 'string'
        ? args.to
        : Array.isArray(args.to)
        ? args.to.join(', ')
        : (g.to ?? '');
    g.to      = toRaw;
    g.subject = args.subject ?? g.subject;
    g.message = args.bodyText ?? g.message;

    next.settings.general = g;
    return next;
  }

});

// ---------- Build tool descriptors from bottom-right connections ----------

export function buildToolDescriptors(diagram: any, agentNodeId: string): ToolDescriptor[] {
  const targets: NodeModel[] = getAllTargetsBySourcePortIncludingTools(diagram, agentNodeId, 'bottom-right-port');

  const result: ToolDescriptor[] = [];
  for (const t of targets) {
    const cfg = (t?.addInfo as any)?.nodeConfig as NodeConfig | undefined;
    if (!cfg) continue;

    switch (cfg.nodeType) {
      case 'Gmail':
      case 'Gmail Tool':
        result.push(makeGmailSendEmailTool(t));
        break;

      case 'Google Sheets':
      case 'Google Sheets Tool':
        result.push(makeSheetsReadRangeTool(t));
        result.push(makeSheetsAppendRowsTool(t));
        result.push(makeSheetsUpdateRowTool(t));
        result.push(makeSheetsGetRowsTool(t));
        break;

      // Add more tool families here (HTTP Request Tool, Telegram Tool, Twilio Tool, Docs Tool, ...)
      default:
        break;
    }
  }
  return result;
}


/** System Messsage to respond in HTML */
export function composeSystemMessageForHtml(systemText: string): string {
  const directive =
    'Return your final answer as clean semantic HTML (use <p>, <ol>/<ul>, <li>, <strong>, <em>, <code>, <pre>). ' +
    'Do not include <html> or <body> tags. Keep markup minimal and valid and beautifully formatted, with proper hierarchy to shown as the chat response.';
  const trimmed = (systemText ?? '').toString().trim();
  return trimmed ? `${directive}\n\n${trimmed}` : directive;
}


/** Build a system message that explicitly lists available tools and when to use them. */
export function generateToolCapabilitiesSystem(toolDescriptors: Array<{
  toolName: string; title: string; description: string;
}>): string {
  if (!toolDescriptors.length) return '';
  const list = toolDescriptors
    .map(td => `• ${td.toolName} — ${td.title}. ${td.description}`)
    .join('\n');

  return [
    'You are an automation agent with real tools you can call to take actions.',
    'When the user asks to perform any action covered by the tools, CALL THE TOOL.',
    'If a required argument is missing, ask one concise follow-up question, then call the tool.',
    'Never state that you cannot perform actions when an appropriate tool exists.',
    'Available tools:\n' + list
  ].join('\n');
}


/** Simple intent heuristic to bias tool calling when the user’s intent is obvious. */
export function forceToolChoiceFromIntent(
  userPrompt: string,
  toolDescriptors: Array<{ toolName: string }>
): string | null {
  const p = userPrompt.toLowerCase();

  // Gmail
  if (toolDescriptors.some(t => t.toolName === 'gmail.send_email') &&
      /(send|email|mail)\s/.test(p)) {
    return 'gmail.send_email';
  }

  // Sheets read/append/update (extend if you like)
  if (toolDescriptors.some(t => t.toolName === 'google_sheets.read_range') &&
      /(read|get|fetch).*(sheet|sheets|spreadsheet|range)/.test(p)) {
    return 'google_sheets.read_range';
  }
  if (toolDescriptors.some(t => t.toolName === 'google_sheets.append_rows') &&
      /(append|add|insert).*(row|rows)/.test(p)) {
    return 'google_sheets.append_rows';
  }
  if (toolDescriptors.some(t => t.toolName === 'google_sheets.update_row') &&
      /(update|modify|change).*(row|record)/.test(p)) {
    return 'google_sheets.update_row';
  }
  return null;
}


/** Persist only the general-section patch of a one-off config into the diagram node (optional). */
export function persistGeneralPatch(
  diagram: any,
  toolNodeId: string,
  patchedConfig: NodeConfig
) {
  try {
    const toolNode = diagram.getObject(toolNodeId) as NodeModel | null;
    const cfg = (toolNode?.addInfo as any)?.nodeConfig as NodeConfig | undefined;
    if (!toolNode || !cfg) return;

    const nextGeneral = (patchedConfig.settings?.general ?? {}) as Record<string, any>;
    if (!Object.keys(nextGeneral).length) return;

    // Shallow merge into existing general settings
    const current = (cfg.settings?.general ?? {}) as Record<string, any>;
    const merged = { ...current, ...nextGeneral };

    // Persist back to node
    const newCfg: NodeConfig = {
      ...cfg,
      settings: { ...cfg.settings, general: merged }
    };
    (toolNode.addInfo as any).nodeConfig = newCfg;
    diagram.dataBind?.(); // refresh visuals if necessary
  } catch { /* ignore persistence errors */ }
}


/** Convert HTML to plain text for storage in execution context. */
export function htmlToPlainText(html: string): string {
  try {
    if (typeof window !== 'undefined' && window.document) {
      const div = document.createElement('div');
      div.innerHTML = html ?? '';
      // Normalize whitespace a bit
      const text = (div.textContent ?? '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ');
      return text.trim();
    }
  } catch { /* ignore */ }
  // SSR or fallback – best-effort strip tags
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
