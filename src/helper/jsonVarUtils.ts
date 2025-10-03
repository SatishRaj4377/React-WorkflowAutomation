import { Variable } from '../types';

/** Convert bracket indices to dots, split, and coerce numeric segments */
function normalizeToSegments(key: string): Array<string | number> {
  const normalized = key.replace(/\[(\d+)\]/g, '.$1');
  return normalized
    .split('.')
    .filter(Boolean)
    .map((seg) => {
      const n = Number(seg);
      return Number.isInteger(n) && String(n) === seg ? n : seg;
    });
}

/** Ensure an array has at least (idx + 1) length */
function ensureArrayLength(arr: any[], idx: number) {
  while (arr.length <= idx) arr.push(undefined);
}

/** Convert a plain object with numeric keys to an array, preserving indices */
function objectToArray(obj: Record<string, any>): any[] {
  const out: any[] = [];
  for (const k of Object.keys(obj)) {
    if (/^\d+$/.test(k)) {
      out[Number(k)] = obj[k];
    }
  }
  return out;
}

/** Format a short preview for primitives */
function formatPreview(value: any): string | undefined {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const q = JSON.stringify(trimmed);
    return trimmed.length > 60 ? `${q.slice(0, 60)}…` : q;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined; // containers previewed at parent level
}

/** Infer a simple variable type string */
function inferType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value === 'object' ? 'object' : typeof value;
}

/** Build nested JSON from Variable[] using dot/bracket keys (array‑aware) */
export function buildJsonFromVariables(variables: Variable[]): any {
  const root: any = {};

  for (const v of variables) {
    const segs = normalizeToSegments(v.key || '');
    if (segs.length === 0) continue;

    let cur: any = root;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const isLast = i === segs.length - 1;

      if (isLast) {
        const leafValue = v.preview ?? (v.type ? `(${v.type})` : null);
        if (typeof seg === 'number') {
          if (!Array.isArray(cur)) {
            // Convert object-like current to array-like in place
            const arr = objectToArray(cur || {});
            for (const k of Object.keys(cur || {})) delete cur[k];
            arr.forEach((val, idx) => (cur[idx] = val));
          }
          ensureArrayLength(cur, seg);
          cur[seg] = leafValue;
        } else {
          cur[seg] = leafValue;
        }
        continue;
      }

      const nextSeg = segs[i + 1];
      const wantArray = typeof nextSeg === 'number';

      if (typeof seg === 'number') {
        // Ensure current is array
        if (!Array.isArray(cur)) {
          const arr = objectToArray(cur || {});
          for (const k of Object.keys(cur || {})) delete cur[k];
          arr.forEach((val, idx) => (cur[idx] = val));
        }
        ensureArrayLength(cur, seg);
        const next = cur[seg];
        if (
          next === undefined ||
          next === null ||
          (wantArray && !Array.isArray(next)) ||
          (!wantArray && Array.isArray(next)) ||
          typeof next !== 'object'
        ) {
          cur[seg] = wantArray ? [] : {};
        }
        cur = cur[seg];
      } else {
        // seg is key on object
        const current = cur[seg];
        if (
          current === undefined ||
          current === null ||
          (wantArray && !Array.isArray(current)) ||
          (!wantArray && Array.isArray(current)) ||
          typeof current !== 'object'
        ) {
          cur[seg] = wantArray ? [] : {};
        }
        cur = cur[seg];
      }
    }
  }

  return root;
}

/** Walk raw JSON and emit Variables for every leaf key */
export function flattenJsonToVariables(
  root: any,
  baseKey = '',
  basePath = '$'
): Variable[] {
  const out: Variable[] = [];

  const visit = (val: any, keyParts: (string | number)[], path: string) => {
    const t = inferType(val);

    if (t === 'object') {
      for (const k of Object.keys(val)) {
        const nextParts = [...keyParts, k];
        const nextPath = path === '$' ? `$.${k}` : `${path}.${k}`;
        visit(val[k], nextParts, nextPath);
      }
      return;
    }

    if (t === 'array') {
      (val as any[]).forEach((item, idx) => {
        const nextParts = [...keyParts, idx];
        const nextPath = `${path}[${idx}]`;
        visit(item, nextParts, nextPath);
      });
      return;
    }

    // Primitive leaf → emit
    const dotKey = keyParts
      .map((p) => (typeof p === 'number' ? String(p) : p))
      .join('.');
    out.push({
      key: dotKey,             // e.g., "fruits.1.details.type"
      path,                    // e.g., "$.fruits[1].details.type"
      type: t as any,          // keep your Variable['type'] compatibility
      preview: formatPreview(val),
    } as Variable);
  };

  // Root may be a primitive; give it a friendly key
  if (inferType(root) === 'object' || inferType(root) === 'array') {
    visit(root, baseKey ? [baseKey] : [], basePath);
  } else {
    out.push({
      key: baseKey || 'value',
      path: basePath,
      type: inferType(root) as any,
      preview: formatPreview(root),
    } as Variable);
  }

  return out;
}