import { ExecutionContext, NodeConfig, NodeExecutionResult } from '../../types';
import { showErrorToast } from '../../components/Toast';
import { evaluateExpression, resolveTemplate } from '../../helper/expression'
import {
  UNARY_COMPARATORS,
  NUMERIC_RIGHT_COMPARATORS,
  PAIR_COMPARATORS,
  REGEX_COMPARATORS,
  KEY_PROP_COMPARATORS,
  resolveValue,
  parsePairValues,
  compareValues
} from '../../helper/conditionUtils';

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
  const toast = (title: string, detail: string) => showErrorToast(title, detail);
  const isBlank = (s: unknown) => (typeof s !== 'string') || s.trim().length === 0;

  try {
    // Prefer structured rows; fallback to legacy single expression
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
      const result = !!new Function('context', 'evaluateExpression', '"use strict"; return ( ' + prepared + ' );')(context, evaluateExpression);
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
      if (!UNARY_COMPARATORS.has(comparator) && isBlank(right)) {
        const msg = `Row ${rowNo}: "Value 2" is required for "${comparator}".`;
        toast('If Condition: Missing Input', msg);
        return { success: false, error: msg };
      }

      // 1.c) Regex validation
      if (REGEX_COMPARATORS.has(comparator) && !isBlank(right)) {
        try { new RegExp(String(resolveValue(right, context))); } catch (e: any) {
          const msg = `Row ${rowNo}: Invalid regular expression in "Value 2" — ${e?.message ?? 'syntax error'}.`;
          toast('If Condition: Invalid Regex', msg);
          return { success: false, error: msg };
        }
      }

      // 1.d) Pair validation ("between")
      if (PAIR_COMPARATORS.has(comparator) && !isBlank(right)) {
        const rv = resolveValue(right, context);
        const [a, b] = parsePairValues(rv);
        if (a == null || b == null || (String(a).length === 0) || (String(b).length === 0)) {
          const msg = `Row ${rowNo}: "${comparator}" expects two values (e.g., "min,max").`;
          toast('If Condition: Invalid Range', msg);
          return { success: false, error: msg };
        }
      }

      // 1.e) Numeric‑right validation for length/compare
      if (NUMERIC_RIGHT_COMPARATORS.has(comparator) && !isBlank(right)) {
        const num = Number(resolveValue(right, context));
        if (Number.isNaN(num)) {
          const msg = `Row ${rowNo}: "Value 2" must be a number for "${comparator}".`;
          toast('If Condition: Invalid Number', msg);
          return { success: false, error: msg };
        }
      }

      // 1.f) Key/property right required & non-empty string
      if (KEY_PROP_COMPARATORS.has(comparator) && !isBlank(right)) {
        const rtxt = String(resolveValue(right, context)).trim();
        if (!rtxt) {
          const msg = `Row ${rowNo}: "Value 2" must be a non-empty key/property name.`;
          toast('If Condition: Invalid Field', msg);
          return { success: false, error: msg };
        }
      }
    }

    // Evaluate rows
    const rowResults: boolean[] = [];
    let cumulative = true;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      
      // Resolve left; for unary ops we still resolve left (exist/empty checks), right only when needed
      const leftVal = resolveValue(row.left ?? '', context);
      const rightVal = UNARY_COMPARATORS.has(row.comparator) ? undefined : resolveValue(row.right ?? '', context);

      // Extra type validations on resolved values (date/numeric between) for better messages
      if (row.comparator === 'is between' || row.comparator === 'is not between') {
        // Try numeric first, then date
        const [a, b] = parsePairValues(rightVal);
        const lv = leftVal;
        const bothNum = !Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && !Number.isNaN(Number(lv));
        const bothDate = !Number.isNaN(+new Date(a)) && !Number.isNaN(+new Date(b)) && !Number.isNaN(+new Date(lv));
        if (!bothNum && !bothDate) {
          const msg = `Row ${idx + 1}: "${row.comparator}" requires numeric or date values (e.g., "10,20" or "2024-01-01,2024-12-31").`;
          toast('If Condition: Invalid Range', msg);
          return { success: false, error: msg };
        }
      }

      if (REGEX_COMPARATORS.has(row.comparator)) {
        try { new RegExp(String(rightVal)); } catch (e: any) {
          const msg = `Row ${idx + 1}: Invalid regular expression — ${e?.message ?? 'syntax error'}.`;
          toast('If Condition: Invalid Regex', msg);
          return { success: false, error: msg };
        }
      }

      // Compare
      const ok = compareValues(leftVal, row.comparator, rightVal);
      rowResults.push(ok);
      // Fold with AND/OR
      cumulative = idx === 0 ? ok : (row.joiner === 'OR' ? (cumulative || ok) : (cumulative && ok));
    }

    return {
      success: true,
      data: { conditionResult: Boolean(cumulative), rowResults, evaluatedAt: new Date().toISOString() }
    };

  } catch (error: any) {
    const msg = `If Condition execution failed: ${error?.message ?? String(error)}`;
    showErrorToast('If Condition Failed', msg);
    return { success: false, error: msg };
  }
}

// ---------------- Switch Case ----------------
async function executeSwitchNode(nodeConfig: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
  try {
    const gen = nodeConfig.settings?.general ?? {};
    const rules = Array.isArray(gen.rules) ? (gen.rules as Array<{ left: string; comparator: string; right: string }>) : [];
    const enableDefault: boolean = !!gen.enableDefaultPort;

    if (rules.length === 0) {
      const msg = 'Switch Case: Please add at least one case.';
      showErrorToast('Switch Case Missing', msg);
      return { success: false, error: msg };
    }

    // Validate inputs upfront (similar to IF strictness)
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const rowNo = i + 1;
      if (!r || !String(r.left ?? '').trim()) {
        const msg = `Switch Case: Row ${rowNo} — "Value 1" is required.`;
        showErrorToast('Switch Case Missing', msg);
        return { success: false, error: msg };
      }
      if (!UNARY_COMPARATORS.has(r.comparator) && !String(r.right ?? '').trim()) {
        const msg = `Switch Case: Row ${rowNo} — "Value 2" is required for "${r.comparator}".`;
        showErrorToast('Switch Case Missing', msg);
        return { success: false, error: msg };
      }
      if (r.comparator === 'matches regex' && String(r.right ?? '').trim()) {
        try { new RegExp(String(resolveValue(r.right, context))); } catch (e: any) {
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
      const leftVal = resolveValue(r.left ?? '', context);
      const rightVal = UNARY_COMPARATORS.has(r.comparator) ? undefined : resolveValue(r.right ?? '', context);
      const ok = compareValues(leftVal, r.comparator, rightVal);
      rowResults.push(ok);
      if (ok && matchedIndex === -1) matchedIndex = i;
    }

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
