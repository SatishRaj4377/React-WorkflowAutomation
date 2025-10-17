import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';
import { showErrorToast } from '../../components/Toast';
import { evaluateExpression, resolveTemplate } from '../../helper/expression';

export async function executeConditionCategory(
  nodeConfig: NodeConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Route within condition category by node type
  switch (nodeConfig.nodeType) {
    case 'If Condition':
      return executeIfConditionNode(nodeConfig, context);
    case 'Switch Case':
      return executeSwitchNode(nodeConfig, context);
    case 'Filter':
      return executeFilterNode(nodeConfig, context);
    default:
      return { success: false, error: `Unsupported condition node type: ${nodeConfig.nodeType}` };
  }
}

// ---------------- If Condition ----------------
async function executeIfConditionNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  // Helpers kept local to avoid changing other files
  const UNARY = new Set<string>(['exists', 'does not exist', 'is empty', 'is not empty', 'is true', 'is false']);
  const NEEDS_NUMERIC_RIGHT = new Set<string>(['greater than', 'greater than or equal to', 'less than', 'less than or equal to', 'length greater than', 'length less than']);
  const NEEDS_PAIR = new Set<string>(['is between', 'is not between']);
  const NEEDS_REGEX = new Set<string>(['matches regex']);
  const NEEDS_KEY_PROP = new Set<string>(['has key', 'has property']);
  const ISO_RX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?Z?)?$/;

  const toast = (title: string, detail: string) => showErrorToast(title, detail);

  const isBlank = (s: unknown) => (typeof s !== 'string') || s.trim().length === 0;

  // Resolve text -> value: bare "$." uses evaluateExpression; otherwise resolveTemplate (string interpolation)
  const resolveVal = (raw: string): any => {
    if (typeof raw !== 'string') return raw;
    const t = raw.trim();
    return t.startsWith('$.') ? evaluateExpression(t, { context }) : resolveTemplate(raw, { context });
  };

  const inferKind = (v: any): 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' => {
    if (Array.isArray(v)) return 'array';
    if (v instanceof Date) return 'date';
    if (v !== null && typeof v === 'object') return 'object';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number' && !Number.isNaN(v)) return 'number';
    if (typeof v === 'string' && ISO_RX.test(v) && !Number.isNaN(+new Date(v))) return 'date';
    return 'string';
  };

  const coerce = (v: any, kind: string) => {
    try {
      switch (kind) {
        case 'number': return typeof v === 'number' ? v : Number(v);
        case 'boolean': return typeof v === 'boolean' ? v : /^true$/i.test(String(v)) ? true : /^false$/i.test(String(v)) ? false : Boolean(v);
        case 'date': return v instanceof Date ? v : new Date(v);
        case 'array': return Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v) : [v]);
        case 'object': return v && typeof v === 'object' ? v : (typeof v === 'string' ? JSON.parse(v) : { value: v });
        default: return typeof v === 'string' ? v : JSON.stringify(v);
      }
    } catch { return v; }
  };

  const deepEq = (a: any, b: any) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; } };
  const toTime = (x: any) => +(x instanceof Date ? x : new Date(x));
  const isEmpty = (x: any) => x == null ? true : Array.isArray(x) || typeof x === 'string'
    ? x.length === 0
    : typeof x === 'object'
      ? Object.keys(x).length === 0
      : false;

  const parsePair = (v: any): [any, any] => {
    if (Array.isArray(v) && v.length >= 2) return [v[0], v[1]];
    if (typeof v === 'string') {
      const parts = v.split(',').map(s => s.trim());
      if (parts.length >= 2) return [parts[0], parts[1]];
    }
    return [v, v]; // will fail validation for numeric/date if not usable
  };

  const compare = (left: any, op: string, right: any): boolean => {
    // Unary ops first (existence/emptiness/boolean checks)
    if (op === 'exists') return typeof left !== 'undefined';
    if (op === 'does not exist') return typeof left === 'undefined';
    if (op === 'is empty') return isEmpty(left);
    if (op === 'is not empty') return !isEmpty(left);
    if (op === 'is true') return Boolean(left) === true;
    if (op === 'is false') return Boolean(left) === false;

    const kind = inferKind(left);
    const l = coerce(left, kind);
    const r = (op === 'is between' || op === 'is not between')
      ? parsePair(coerce(right, kind))
      : coerce(right, kind);

    switch (op) {
      case 'is equal to': return deepEq(l, r);
      case 'is not equal to': return !deepEq(l, r);

      case 'contains': return String(l).includes(String(r));
      case 'does not contain': return !String(l).includes(String(r));
      case 'starts with': return String(l).startsWith(String(r));
      case 'ends with': return String(l).endsWith(String(r));
      case 'matches regex': try { return new RegExp(String(r)).test(String(l)); } catch { return false; }

      case 'greater than': return Number(l) > Number(r);
      case 'greater than or equal to': return Number(l) >= Number(r);
      case 'less than': return Number(l) < Number(r);
      case 'less than or equal to': return Number(l) <= Number(r);
      case 'is between': return Number(l) >= Number(r[0]) && Number(l) <= Number(r[1]);
      case 'is not between': return !(Number(l) >= Number(r[0]) && Number(l) <= Number(r[1]));

      case 'before': return toTime(l) < toTime(r);
      case 'after': return toTime(l) > toTime(r);
      case 'on or before': return toTime(l) <= toTime(r);
      case 'on or after': return toTime(l) >= toTime(r);

      case 'contains value': return Array.isArray(l) ? l.some(x => deepEq(x, r)) : String(l).includes(String(r));
      case 'length greater than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length > Number(r) : false;
      case 'length less than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length < Number(r) : false;
      case 'has key': return l && typeof l === 'object' && String(r) in l;
      case 'has property': return l && typeof l === 'object' && Object.prototype.hasOwnProperty.call(l, String(r));
      default: return false;
    }
  };

  try {
    // 0) Prefer structured rows; fallback to legacy single expression
    const rows = Array.isArray(nodeConfig.settings?.general?.conditions)
      ? (nodeConfig.settings!.general!.conditions as Array<{ left: string; comparator: string; right: string; joiner?: 'AND' | 'OR' }>)
      : null;

    if (!rows || rows.length === 0) {
      const raw = nodeConfig.settings?.general?.condition ?? '';
      const prepared = resolveTemplate(String(raw), { context }).trim();
      if (!prepared) {
        const msg = 'If Condition: Please configure at least one condition row or a valid expression.';
        toast('If Condition Missing', msg);
        return { success: false, error: msg };
      }
      const result = !!new Function('context', 'evaluateExpression', `"use strict"; return ( ${prepared} );`)(context, evaluateExpression);
      return { success: true, data: { conditionResult: result, rowResults: [result], evaluatedAt: new Date().toISOString() } };
    }

    // 1) VALIDATE rows (fail-fast with exact error)
    for (let idx = 0; idx < rows.length; idx++) {
      const { left, comparator, right } = rows[idx];
      const rowNo = idx + 1;

      // 1.a) Left must be provided for ALL comparators (including unary). An empty field = misconfiguration.
      if (isBlank(left)) {
        const msg = `Row ${rowNo}: "Value 1" is required.`;
        toast('If Condition: Missing Input', msg);
        return { success: false, error: msg };
      }

      // 1.b) If comparator needs a right operand, ensure "Value 2" is present
      if (!UNARY.has(comparator) && isBlank(right)) {
        const msg = `Row ${rowNo}: "Value 2" is required for "${comparator}".`;
        toast('If Condition: Missing Input', msg);
        return { success: false, error: msg };
      }

      // 1.c) Regex validation
      if (NEEDS_REGEX.has(comparator) && !isBlank(right)) {
        try { new RegExp(String(resolveVal(right))); } catch (e: any) {
          const msg = `Row ${rowNo}: Invalid regular expression in "Value 2" — ${e?.message ?? 'syntax error'}.`;
          toast('If Condition: Invalid Regex', msg);
          return { success: false, error: msg };
        }
      }

      // 1.d) Pair validation ("between")
      if (NEEDS_PAIR.has(comparator) && !isBlank(right)) {
        const rv = resolveVal(right);
        const [a, b] = parsePair(rv);
        if (a == null || b == null || (String(a).length === 0) || (String(b).length === 0)) {
          const msg = `Row ${rowNo}: "${comparator}" expects two values (e.g., "min,max").`;
          toast('If Condition: Invalid Range', msg);
          return { success: false, error: msg };
        }
      }

      // 1.e) Numeric‑right validation for length/compare
      if (NEEDS_NUMERIC_RIGHT.has(comparator) && !isBlank(right)) {
        const num = Number(resolveVal(right));
        if (Number.isNaN(num)) {
          const msg = `Row ${rowNo}: "Value 2" must be a number for "${comparator}".`;
          toast('If Condition: Invalid Number', msg);
          return { success: false, error: msg };
        }
      }

      // 1.f) Key/property right required & non-empty string
      if (NEEDS_KEY_PROP.has(comparator) && !isBlank(right)) {
        const rtxt = String(resolveVal(right)).trim();
        if (!rtxt) {
          const msg = `Row ${rowNo}: "Value 2" must be a non-empty key/property name.`;
          toast('If Condition: Invalid Field', msg);
          return { success: false, error: msg };
        }
      }
    }

    // 2) EVALUATE rows (after validation)
    const rowResults: boolean[] = [];
    let acc = true;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];

      // Resolve left; for unary ops we still resolve left (exist/empty checks), right only when needed
      const leftVal = resolveVal(row.left ?? '');
      const rightVal = UNARY.has(row.comparator) ? undefined : resolveVal(row.right ?? '');

      // Extra type validations on resolved values (date/numeric between) for better messages
      if (row.comparator === 'is between' || row.comparator === 'is not between') {
        // Try numeric first, then date
        const [a, b] = parsePair(rightVal);
        const lv = leftVal;
        const bothNum = !Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && !Number.isNaN(Number(lv));
        const bothDate = !Number.isNaN(+new Date(a)) && !Number.isNaN(+new Date(b)) && !Number.isNaN(+new Date(lv));
        if (!bothNum && !bothDate) {
          const msg = `Row ${idx + 1}: "${row.comparator}" requires numeric or date values (e.g., "10,20" or "2024-01-01,2024-12-31").`;
          toast('If Condition: Invalid Range', msg);
          return { success: false, error: msg };
        }
      }

      if (NEEDS_REGEX.has(row.comparator)) {
        try { new RegExp(String(rightVal)); } catch (e: any) {
          const msg = `Row ${idx + 1}: Invalid regular expression — ${e?.message ?? 'syntax error'}.`;
          toast('If Condition: Invalid Regex', msg);
          return { success: false, error: msg };
        }
      }

      // Compare
      const ok = compare(leftVal, row.comparator, rightVal);
      rowResults.push(ok);

      // Fold with AND/OR
      acc = idx === 0 ? ok : (row.joiner === 'OR' ? (acc || ok) : (acc && ok));
    }

    // 3) Success -> return standard payload (Base executor will record results[nodeId] for us)
    return {
      success: true,
      data: { conditionResult: Boolean(acc), rowResults, evaluatedAt: new Date().toISOString() }
    };

  } catch (error: any) {
    const msg = `If Condition execution failed: ${error?.message ?? String(error)}`;
    showErrorToast('If Condition Failed', msg); // Ensure user sees the exact failure
    return { success: false, error: msg };
  }
}

// ---------------- Switch Case ----------------
async function executeSwitchNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    const gen = nodeConfig.settings?.general ?? {};
    const rules = Array.isArray(gen.rules) ? gen.rules as Array<{ left: string; comparator: string; right: string }> : [];
    const enableDefault: boolean = !!gen.enableDefaultPort;

    if (rules.length === 0) {
      const msg = 'Switch Case: Please add at least one case.';
      showErrorToast('Switch Case Missing', msg);
      return { success: false, error: msg };
    }

    // Reuse same resolver + comparator logic as IF (inline minimal copy for surgical change)
    const UNARY = new Set<string>(['exists', 'does not exist', 'is empty', 'is not empty', 'is true', 'is false']);
    const ISO_RX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?Z?)?$/;

    const resolveVal = (raw: string): any => {
      if (typeof raw !== 'string') return raw;
      const t = raw.trim();
      return t.startsWith('$.') ? evaluateExpression(t, { context }) : resolveTemplate(raw, { context });
    };
    const inferKind = (v: any): 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' => {
      if (Array.isArray(v)) return 'array';
      if (v instanceof Date) return 'date';
      if (v !== null && typeof v === 'object') return 'object';
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'number' && !Number.isNaN(v)) return 'number';
      if (typeof v === 'string' && ISO_RX.test(v) && !Number.isNaN(+new Date(v))) return 'date';
      return 'string';
    };
    const coerce = (v: any, kind: string) => {
      try {
        switch (kind) {
          case 'number': return typeof v === 'number' ? v : Number(v);
          case 'boolean': return typeof v === 'boolean' ? v : /^true$/i.test(String(v)) ? true : /^false$/i.test(String(v)) ? false : Boolean(v);
          case 'date': return v instanceof Date ? v : new Date(v);
          case 'array': return Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v) : [v]);
          case 'object': return v && typeof v === 'object' ? v : (typeof v === 'string' ? JSON.parse(v) : { value: v });
          default: return typeof v === 'string' ? v : JSON.stringify(v);
        }
      } catch { return v; }
    };
    const deepEq = (a: any, b: any) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; } };
    const toTime = (x: any) => +(x instanceof Date ? x : new Date(x));
    const isEmpty = (x: any) => x == null ? true : Array.isArray(x) || typeof x === 'string' ? x.length === 0 : typeof x === 'object' ? Object.keys(x).length === 0 : false;
    const toPair = (v: any): [any, any] => {
      if (Array.isArray(v) && v.length >= 2) return [v[0], v[1]];
      if (typeof v === 'string') {
        const p = v.split(',').map(s => s.trim());
        if (p.length >= 2) return [p[0], p[1]];
      }
      return [v, v];
    };
    const compare = (left: any, op: string, right: any): boolean => {
      if (op === 'exists') return typeof left !== 'undefined';
      if (op === 'does not exist') return typeof left === 'undefined';
      if (op === 'is empty') return isEmpty(left);
      if (op === 'is not empty') return !isEmpty(left);
      if (op === 'is true') return Boolean(left) === true;
      if (op === 'is false') return Boolean(left) === false;

      const kind = inferKind(left);
      const l = coerce(left, kind);
      const r = (op === 'is between' || op === 'is not between')
        ? toPair(coerce(right, kind))
        : coerce(right, kind);

      switch (op) {
        case 'is equal to': return deepEq(l, r);
        case 'is not equal to': return !deepEq(l, r);
        case 'contains': return String(l).includes(String(r));
        case 'does not contain': return !String(l).includes(String(r));
        case 'starts with': return String(l).startsWith(String(r));
        case 'ends with': return String(l).endsWith(String(r));
        case 'matches regex': try { return new RegExp(String(r)).test(String(l)); } catch { return false; }
        case 'greater than': return Number(l) > Number(r);
        case 'greater than or equal to': return Number(l) >= Number(r);
        case 'less than': return Number(l) < Number(r);
        case 'less than or equal to': return Number(l) <= Number(r);
        case 'is between': return Number(l) >= Number(r[0]) && Number(l) <= Number(r[1]);
        case 'is not between': return !(Number(l) >= Number(r[0]) && Number(l) <= Number(r[1]));
        case 'before': return toTime(l) < toTime(r);
        case 'after': return toTime(l) > toTime(r);
        case 'on or before': return toTime(l) <= toTime(r);
        case 'on or after': return toTime(l) >= toTime(r);
        case 'contains value': return Array.isArray(l) ? l.some(x => deepEq(x, r)) : String(l).includes(String(r));
        case 'length greater than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length > Number(r) : false;
        case 'length less than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length < Number(r) : false;
        case 'has key': return l && typeof l === 'object' && String(r) in l;
        case 'has property': return l && typeof l === 'object' && Object.prototype.hasOwnProperty.call(l, String(r));
        default: return false;
      }
    };

    // Validate inputs upfront (similar to IF strictness)
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const rowNo = i + 1;
      if (!r || !String(r.left ?? '').trim()) {
        const msg = `Switch Case: Row ${rowNo} — "Value 1" is required.`;
        showErrorToast('Switch Case Missing', msg);
        return { success: false, error: msg };
      }
      // Non-unary comparators must have right value
      if (!UNARY.has(r.comparator) && !String(r.right ?? '').trim()) {
        const msg = `Switch Case: Row ${rowNo} — "Value 2" is required for "${r.comparator}".`;
        showErrorToast('Switch Case Missing', msg);
        return { success: false, error: msg };
      }
      // Regex basic check
      if (r.comparator === 'matches regex' && String(r.right ?? '').trim()) {
        try { new RegExp(String(resolveVal(r.right))); } catch (e: any) {
          const msg = `Switch Case: Row ${rowNo} — Invalid regex: ${e?.message ?? 'syntax error'}.`;
          showErrorToast('Switch Case Invalid Regex', msg);
          return { success: false, error: msg };
        }
      }
    }

    // Evaluate first-match
    const rowResults: boolean[] = [];
    let matchedIndex: number = -1;

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const L = resolveVal(r.left ?? '');
      const R = UNARY.has(r.comparator) ? undefined : resolveVal(r.right ?? '');
      const ok = compare(L, r.comparator, R);
      rowResults.push(ok);
      if (ok && matchedIndex === -1) matchedIndex = i;
    }

    // Prepare port id for traversal phase
    const matchedPortId = matchedIndex >= 0
      ? `right-case-${matchedIndex + 1}`
      : (enableDefault ? 'right-case-default' : null);

    return {
      success: true,
      data: {
        matchedCaseIndex: matchedIndex >= 0 ? matchedIndex : null,
        matchedPortId,
        defaultTaken: matchedIndex < 0 && enableDefault,
        rowResults
      }
    };
  } catch (error: any) {
    const msg = `Switch Case execution failed: ${error?.message ?? String(error)}`;
    showErrorToast('Switch Case Failed', msg);
    return { success: false, error: msg };
  }
}

// ---------------- Filter ----------------
async function executeFilterNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    const conditionRaw = nodeConfig.settings?.general?.predicate ?? nodeConfig.settings?.general?.filterCondition;
    if (!conditionRaw) return { success: false, error: 'No filter predicate specified' };

    const predicateStr = resolveTemplate(conditionRaw, { context }).trim();
    const fn = new Function('item', 'context', 'evaluateExpression', `"use strict"; return ( ${predicateStr} );`);

    const input = nodeConfig.settings?.general?.input ?? [];
    const filtered: any[] = (input as any[]).filter((item: any) => {
      try { return !!fn(item, context, evaluateExpression); } catch { return false; }
    });

    return { success: true, data: { filtered } };
  } catch (error) {
    return { success: false, error: `Filter execution failed: ${error}` };
  }
}
