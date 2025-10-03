import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { Variable, VariableGroup, VariablesProvider } from '../../types';

/* =========================
 * Dummy Data Provider (simulate server)
 * ======================= */

// This dummy provider is no longer the primary source of data
// but we keep it for reference or fallback.
export const getDummyVariables: VariablesProvider = async () => {
  return []; 
};

/* =========================
 * OutputPreview (New Component)
 * Renders a single variable group, designed for the "Output" tab.
 * ======================= */

interface OutputPreviewProps {
  group: VariableGroup;
}

export const OutputPreview: React.FC<OutputPreviewProps> = ({ group }) => {
  return (
    <div className="vp-popup output-preview">
      <div className="vp-body">
        <div className="vp-group" key={group.nodeId}>
          <div className="vp-group-title">
            <span className="vp-node-type">{group.nodeType}</span>
            <span className="vp-node">{group.nodeName}</span>
          </div>
          <ul className="vp-list">
            {group.variables.map((v) => {
              const lastSegment = v.key.split('.').slice(-1)[0];
              return (
                <li key={v.path} className="vp-item">
                  <div className="vp-item-main">
                    <code className="vp-key">
                      <span className="vp-key-em">{lastSegment}</span>
                      <span className="vp-key-dim">
                        {v.key.includes('.') ? `  (${v.key})` : ''}
                      </span>
                    </code>
                    <span className={`vp-type ${v.type || 'any'}`}>{v.type || 'any'}</span>
                  </div>
                  {v.preview && <div className="vp-preview">{v.preview}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

/** Insert `text` at the current caret/selection of an input or textarea. */
function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
): { nextValue: string; nextCaret: number } {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const nextValue = el.value.slice(0, start) + text + el.value.slice(end);
  const nextCaret = start + text.length;
  return { nextValue, nextCaret };
}

/** Find native input/textarea rendered by EJ2 TextBox inside a container */
function findNativeInput(container: HTMLElement | null) {
  if (!container) return null;
  return container.querySelector('input.e-input, textarea.e-input') as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
}

/** Compute best-fit popup position near an anchor rect (to the right or below) */
function computePopupPosition(
  rect: DOMRect,
  doc: Document,
  offset = 8
): { top: number; left: number } {
  const vw = doc.documentElement.clientWidth;
  const vh = doc.documentElement.clientHeight;

  // Try right side first
  let left = rect.right + offset + window.scrollX;
  let top = rect.top + window.scrollY;

  const approximateWidth = 320;
  const approximateHeight = 280;

  // If it overflows right edge, place below the input aligned left
  if (left + approximateWidth > window.scrollX + vw) {
    left = rect.left + window.scrollX;
    top = rect.bottom + offset + window.scrollY;
  }

  // If it also overflows bottom, nudge upward
  if (top + approximateHeight > window.scrollY + vh) {
    top = Math.max(window.scrollY + vh - approximateHeight - offset, window.scrollY + 8);
  }

  return { top, left };
}

/** Basic outside-click hook */
function useOutsideClick<T extends HTMLElement>(
  refs: Array<React.RefObject<T | null>>,
  onOutside: () => void,
  when = true
) {
  useEffect(() => {
    if (!when) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) onOutside();
    };
    document.addEventListener('mousedown', handler, { capture: true });
    return () => {
      document.removeEventListener('mousedown', handler, { capture: true });
    };
  }, [when, onOutside, refs]);
}


/* =========================
 * VariablePickerPopup
 * ======================= */


type PickerPopupProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onPick: (variable: Variable) => void;
  variableGroups: VariableGroup[];
  loading: boolean;
  zIndex?: number;
};

const PORTAL_ROOT_ID = 'variable-picker-portal-root';

function ensurePortalRoot(): HTMLElement {
  let root = document.getElementById(PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PORTAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

export const VariablePickerPopup: React.FC<PickerPopupProps> = ({
  anchorEl,
  open,
  onClose,
  onPick,
  variableGroups,
  loading,
  zIndex = 1000010,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  // Data fetching is now handled by the parent component.
  // This component just displays the groups and loading state it's given.

  // Positioning & repositioning
  const updatePosition = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos(computePopupPosition(rect, document, 8));
  }, [anchorEl]);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  // Close when clicking away
  useOutsideClick([popupRef], onClose, open);

  const content = (
    <div
      ref={popupRef}
      className="vp-popup"
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex }}
      // Prevent input blur while interacting with the popup
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="vp-header">
        <span className="vp-title">Insert variable</span>
        <button className="vp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="vp-body">
        {loading && <div className="vp-loading">Loading available variables…</div>}
        {!loading && variableGroups.length === 0 && (
          <div className="vp-empty">No variables available from previous steps.</div>
        )}
        {!loading &&
          variableGroups.map((g) => (
            <div className="vp-group" key={g.nodeId}>
              <div className="vp-group-title">
                <span className="vp-node-type">{g.nodeType}</span>
                <span className="vp-node">{g.nodeName}</span>
              </div>
              <ul className="vp-list">
                {g.variables.map((v) => {
                  const lastSegment = v.key.split('.').slice(-1)[0];
                  return (
                    <li
                      key={v.path}
                      className="vp-item"
                      onClick={() => onPick(v)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="vp-item-main">
                        <code className="vp-key">
                          <span className="vp-key-em">{lastSegment}</span>
                          <span className="vp-key-dim">
                            {v.key.includes('.') ? `  (${v.key})` : ''}
                          </span>
                        </code>
                        <span className={`vp-type ${v.type || 'any'}`}>{v.type || 'any'}</span>
                      </div>
                      {v.preview && <div className="vp-preview">{v.preview}</div>}
                      <div className="vp-path">{"{{ "}{v.path}{" }}"}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );

  return open ? createPortal(content, ensurePortalRoot()) : null;
};

/* =========================
 * VariableTextBox 
 * ======================= */

type VariableTextBoxProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  cssClass?: string;
  variableGroups: VariableGroup[];
  variablesLoading: boolean;
  /** Format how the token is inserted; default -> {{ path }} */
  tokenFormatter?: (v: Variable) => string;
  ej2Props?: Partial<React.ComponentProps<typeof TextBoxComponent>>;
};

export const VariableTextBox: React.FC<VariableTextBoxProps> = ({
  value,
  onChange,
  placeholder,
  multiline,
  cssClass,
  variableGroups,
  variablesLoading,
  tokenFormatter = (v) => `{{ ${v.path} }}`,
  ej2Props = {},
}) => {
  // Wrap to find the native input, because EJ2 wraps the element
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Show/hide popup
  const [open, setOpen] = useState(false);

  // Acquire native input once rendered
  const captureInput = useCallback(() => {
    inputRef.current = findNativeInput(wrapperRef.current!);
  }, []);

  useEffect(() => {
    captureInput();
  }, [captureInput, multiline]); // EJ2 swaps to <textarea> if multiline=true

  // Keep a computed cssClass that marks tokens (for subtle styling)
  const computedCssClass = useMemo(() => {
    const base = cssClass || '';
    const tokenClass = /\{\{[^}]+\}\}/.test(value) ? ' has-variables' : '';
    return `${base}${tokenClass}`.trim();
  }, [cssClass, value]);

  // Handle selection & insertion
  const handlePick = useCallback(
    (v: Variable) => {
      const el = inputRef.current;
      if (!el) return;
      const token = tokenFormatter(v);
      const { nextValue, nextCaret } = insertAtCaret(el, token);
      onChange(nextValue);
      // Restore caret after onChange re-renders
      requestAnimationFrame(() => {
        const el2 = inputRef.current;
        if (el2) {
          el2.focus();
          try {
            el2.setSelectionRange(nextCaret, nextCaret);
          } catch {
            // ignore (number/password etc.)
          }
        }
      });
      setOpen(false);
    },
    [onChange, tokenFormatter]
  );

  // Open the popup when focusing; close on Escape
  const onFocusIn = useCallback(() => setOpen(true), []);

  return (
    <div className="variable-textbox-wrapper" ref={wrapperRef}>
      <TextBoxComponent
        value={value}
        placeholder={placeholder}
        multiline={!!multiline}
        cssClass={computedCssClass}
        change={(e: any) => onChange(e.value)}
        focus={onFocusIn}
        {...ej2Props}
      />
      {/* Popup anchored to the native input element */}
      <VariablePickerPopup
        anchorEl={inputRef.current}
        open={open}
        onClose={() => setOpen(false)}
        onPick={handlePick}
        variableGroups={variableGroups}
        loading={variablesLoading}
      />
    </div>
  );
};
