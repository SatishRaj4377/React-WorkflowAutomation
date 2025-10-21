import { ExecutionContext } from '../types';
import { evaluateExpression, resolveTemplate } from './expression';

// Comparator families (shared between If Condition and Switch Case)
export const UNARY_COMPARATORS = new Set<string>([
  'exists', 'does not exist', 'is empty', 'is not empty', 'is true', 'is false'
]);

export const NUMERIC_RIGHT_COMPARATORS = new Set<string>([
  'greater than', 'greater than or equal to', 'less than', 'less than or equal to',
  'length greater than', 'length less than'
]);

export const PAIR_COMPARATORS = new Set<string>(['is between', 'is not between']);
export const REGEX_COMPARATORS = new Set<string>(['matches regex']);
export const KEY_PROP_COMPARATORS = new Set<string>(['has key', 'has property']);

// Readable constant name for ISO date strings
export const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/;

// Resolve text -> value: bare "$.' uses evaluateExpression; otherwise resolveTemplate (string interpolation)
export const resolveValue = (raw: string, context: ExecutionContext): any => {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();

  // Direct path expression -> return raw resolved value
  if (trimmed.startsWith('$.')) {
    return evaluateExpression(trimmed, { context });
  }

  // Entire string is a single {{ ... }} -> evaluate and return raw (array/object/primitive)
  const singleMustache = trimmed.match(/^\{\{\s*([^}]+)\s*\}\}$/);
  if (singleMustache) {
    return evaluateExpression(singleMustache[1], { context });
  }

  // Mixed template text -> string interpolation
  return resolveTemplate(raw, { context });
};

export type ConditionValueKind = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export const inferValueKind = (v: any): ConditionValueKind => {
  if (Array.isArray(v)) return 'array';
  if (v instanceof Date) return 'date';
  if (v !== null && typeof v === 'object') return 'object';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number' && !Number.isNaN(v)) return 'number';
  if (typeof v === 'string' && ISO_DATE_REGEX.test(v) && !Number.isNaN(+new Date(v))) return 'date';
  return 'string';
};

export const coerceToKind = (v: any, kind: ConditionValueKind) => {
  try {
    switch (kind) {
      case 'number': return typeof v === 'number' ? v : Number(v);
      case 'boolean': {
        if (typeof v === 'boolean') return v;
        const s = String(v);
        if (/^true$/i.test(s)) return true;
        if (/^false$/i.test(s)) return false;
        return Boolean(v);
      }
      case 'date': return v instanceof Date ? v : new Date(v);
      case 'array': return Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v) : [v]);
      case 'object': return v && typeof v === 'object' ? v : (typeof v === 'string' ? JSON.parse(v) : { value: v });
      default: return typeof v === 'string' ? v : JSON.stringify(v);
    }
  } catch {
    return v;
  }
};

export const deepEqual = (a: any, b: any) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; } };
export const toTimestamp = (x: any) => +(x instanceof Date ? x : new Date(x));

export const isValueEmpty = (x: any) => x == null
  ? true
  : Array.isArray(x) || typeof x === 'string'
    ? x.length === 0
    : typeof x === 'object'
      ? Object.keys(x).length === 0
      : false;

export const parsePairValues = (v: any): [any, any] => {
  if (Array.isArray(v) && v.length >= 2) return [v[0], v[1]];
  if (typeof v === 'string') {
    const parts = v.split(',').map(s => s.trim());
    if (parts.length >= 2) return [parts[0], parts[1]];
  }
  return [v, v];
};

export const compareValues = (left: any, comparator: string, right: any): boolean => {
  // Unary ops first (existence/emptiness/boolean checks)
  if (comparator === 'exists') return typeof left !== 'undefined';
  if (comparator === 'does not exist') return typeof left === 'undefined';
  if (comparator === 'is empty') return isValueEmpty(left);
  if (comparator === 'is not empty') return !isValueEmpty(left);
  if (comparator === 'is true') return Boolean(left) === true;
  if (comparator === 'is false') return Boolean(left) === false;

  const kind = inferValueKind(left);
  const l = coerceToKind(left, kind);
  const r = (comparator === 'is between' || comparator === 'is not between')
    ? parsePairValues(coerceToKind(right, kind))
    : coerceToKind(right, kind);

  switch (comparator) {
    case 'is equal to': return deepEqual(l, r);
    case 'is not equal to': return !deepEqual(l, r);

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

    case 'before': return toTimestamp(l) < toTimestamp(r);
    case 'after': return toTimestamp(l) > toTimestamp(r);
    case 'on or before': return toTimestamp(l) <= toTimestamp(r);
    case 'on or after': return toTimestamp(l) >= toTimestamp(r);

    case 'contains value': return Array.isArray(l) ? l.some(x => deepEqual(x, r)) : String(l).includes(String(r));
    case 'length greater than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length > Number(r) : false;
    case 'length less than': return (Array.isArray(l) || typeof l === 'string') ? (l as any).length < Number(r) : false;
    case 'has key': return l && typeof l === 'object' && String(r) in l;
    case 'has property': return l && typeof l === 'object' && Object.prototype.hasOwnProperty.call(l, String(r));
    default: return false;
  }
};
