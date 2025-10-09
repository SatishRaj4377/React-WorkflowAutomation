// src/helper/expression.ts
// Centralized evaluation for {{ ... }} tokens supporting $.a.b and $.a[0].b paths.

import { ExecutionContext } from '../types';

type EvalOptions = {
  context: ExecutionContext;
};

function normalizePath(path: string): string {
  // Turn `fruits[0].name` → `fruits.0.name`
  return path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
}

function getAtPath(root: any, dotPath: string): any {
  if (!root || !dotPath) return undefined;
  const segs = dotPath.split('.').filter(Boolean).map(s => {
    const n = Number(s);
    return Number.isInteger(n) && String(n) === s ? n : s;
  });
  let cur: any = root;
  for (const seg of segs) {
    if (cur == null) return undefined;
    cur = cur[seg as keyof typeof cur];
  }
  return cur;
}

/** Scan results in creation/execution order and return first match for the path. */
function resolveAcrossResults(context: ExecutionContext, dollarPath: string): any {
  const dotPath = normalizePath(dollarPath);
  const results = context?.results ?? {};
  for (const nodeId of Object.keys(results)) {
    const hit = getAtPath(results[nodeId], dotPath);
    if (hit !== undefined) return hit;
  }
  // Fallback to variables (also allow $.x.y to resolve here)
  const hitVar = getAtPath(context?.variables ?? {}, dotPath);
  return hitVar;
}

/** Evaluate a bare expression (no outer {{ }}), supporting:
 *   - "$.a.b" or "$.a[0].b" -> resolves across results/variables
 *   - arbitrary JS using "context", "results", "variables", "$get(path)"
 */
export function evaluateExpression(expr: string, opts: EvalOptions): any {
  if (!expr || typeof expr !== 'string') return expr;

  const trimmed = expr.trim();

  // Fast-path: "$.something"
  if (trimmed.startsWith('$.')) {
    const path = trimmed.slice(2);           // drop "$."
    return resolveAcrossResults(opts.context, path);
  }

  // Allow a tiny JS scope if users put expressions (rare inside tokens, but nice to have)
  const scope = {
    context: opts.context,
    results: opts.context?.results ?? {},
    variables: opts.context?.variables ?? {},
    $get: (p: string) => resolveAcrossResults(opts.context, p.startsWith('$.') ? p.slice(2) : p),
  };

  try {
    const fn = new Function(
      'scope',
      `"use strict";
       const { context, results, variables, $get } = scope;
       return ( ${trimmed} );`
    );
    return fn(scope);
  } catch {
    return undefined;
  }
}

/** Replace every {{ ... }} with its evaluated value (stringified if needed). */
export function resolveTemplate(template: string, opts: EvalOptions): string {
  if (typeof template !== 'string') return template as unknown as string;
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, inner) => {
    const val = evaluateExpression(inner, opts);
    return val == null ? '' : String(val);
  });
}

/** Deep evaluation: objects/arrays -> resolve all nested strings with {{ ... }} */
export function deepEvaluate<T = any>(input: T, opts: EvalOptions): T {
  if (typeof input === 'string') {
    return resolveTemplate(input, opts) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map(it => deepEvaluate(it, opts)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: any = Array.isArray(input) ? [] : {};
    for (const k of Object.keys(input as any)) {
      out[k] = deepEvaluate((input as any)[k], opts);
    }
    return out as T;
  }
  return input;
}
