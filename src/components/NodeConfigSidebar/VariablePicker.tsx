import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { Variable, VariableGroup } from '../../types';
import { ensurePortalRoot, findNativeInput, insertAtCaret } from '../../helper/domUtils';
import { buildJsonFromVariables } from '../../helper/jsonVarUtils';
import JsonVisualizer from './JsonVisualizer';

/* -----------------------------------------------------------------------------
 * Variable Picker Popup
 * -------------------------------------------------------------------------- */

type PickerPopupProps = {
  anchorEl: HTMLElement | null;     // anchor element for positioning
  open: boolean;                    // visibility
  onClose: () => void;              // close handler
  onPick: (variable: Variable) => void; // called when a JSON key is picked
  variableGroups: VariableGroup[];  // available groups
  loading: boolean;                 // loading state
  zIndex?: number;                  // stacking
};

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

   const GAP = 8;
   const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number }>({
     top: -9999,
     left: -9999,
     maxHeight: 320,
   });

  // Calculate popup position relative to node config panel
  const updatePosition = useCallback(() => {
    const panel = document.querySelector('.custom-config-panel') as HTMLElement | null;
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const header = panel.querySelector('.config-panel-header') as HTMLElement | null;
    const headerRect = header?.getBoundingClientRect() ?? panelRect;
    // Top: just below the panel header + GAP
    const top = Math.round(headerRect.bottom + GAP);
    // Left: to the right side of the panel + GAP
    const left = Math.round(panelRect.right + GAP);
    // Height: viewport bottom minus GAP, leaving a GAP at the bottom too
    const maxHeight = Math.max(180, Math.floor(window.innerHeight - top - GAP));
    setPos({ top, left, maxHeight });
  }, []);


  // Reposition when opened / on scroll / on resize
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

  // Close on outside click
  useOutsideClick([popupRef], onClose, open);
  
  // Close handler when clicking outside a set of refs
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
      return () =>
        document.removeEventListener('mousedown', handler, { capture: true });
    }, [when, onOutside, refs]);
  }


  if (!open) return null;

  return createPortal(
    <div
      ref={popupRef}
      className="vp-popup"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex,
        width: 360,
        maxHeight: pos.maxHeight,
        background: 'var(--surface-color)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()} // keep focus in textbox
    >
      {/* Header */}
      <div
        className="vp-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '.5rem .75rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--background-color)',
        }}
      >
        <div className="vp-title" style={{ fontSize: '.85rem', fontWeight: 600 }}>
          Insert variable
        </div>
        <button
          className="vp-close"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        className="vp-body"
        style={{ maxHeight: Math.max(120, pos.maxHeight - 42), overflow: 'auto', padding: '.35rem .5rem .6rem' }}
      >
        {loading && (
          <div className="vp-loading" style={{ padding: '.75rem', fontSize: '.85rem' }}>
            Loading available variables…
          </div>
        )}

        {!loading && variableGroups.length === 0 && (
          <div className="vp-empty" style={{ padding: '.75rem', fontSize: '.85rem' }}>
            No variables available from previous steps.
          </div>
        )}

        {/* Render only JsonVisualizer per group */}
        {!loading &&
          variableGroups.map((g) => (
            <div key={g.nodeId} className="vp-group" style={{ paddingBottom: '.5rem' }}>
              <div
                className="vp-group-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  padding: '.25rem .5rem',
                  margin: '.25rem 0 .35rem',
                  backgroundColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '.03em',
                  borderRadius: 6,
                }}
              >
                <span
                  className="vp-node-type"
                  style={{
                    background: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 999,
                    padding: '0 .4rem',
                    fontSize: '.7rem',
                  }}
                >
                  {g.nodeType}
                </span>
                {g.nodeName}
              </div>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: '.4rem',
                  background: 'var(--surface-color)',
                }}
              >
                <JsonVisualizer
                  data={buildJsonFromVariables(g.variables)}
                  collapsed={false}
                  onKeyClick={(path) => {
                    // Use the same token format as VariableTextBox default
                    const fakeVar = {
                      key: path,
                      path,
                      type: 'any',
                      preview: undefined,
                    } as unknown as Variable;
                    onPick(fakeVar); // delegate insertion to VariableTextBox
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>,
    ensurePortalRoot()
  );
};

/* -----------------------------------------------------------------------------
 * VariableTextBox (opens popup; inserts via caret on pick)
 * -------------------------------------------------------------------------- */

type VariableTextBoxProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  cssClass?: string;
  variableGroups: VariableGroup[];
  variablesLoading: boolean;
  tokenFormatter?: (v: Variable) => string; // default: {{ <path> }}
  ej2Props?: Partial<TextBoxComponent>;
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
  // Wrapper helps locate the native EJ2 input
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Popup visibility
  const [open, setOpen] = useState(false);

  // Acquire native input after mount / mode changes
  const captureInput = useCallback(() => {
    inputRef.current = findNativeInput(wrapperRef.current!);
  }, []);
  useEffect(() => {
    captureInput();
  }, [captureInput, multiline]);

  // Subtle token class if value contains any {{ ... }}
  const computedCssClass = useMemo(() => {
    const base = cssClass ?? '';
    const tokenClass = /\{\{[^}]+\}\}/.test(value) ? ' has-variables' : '';
    return `${base}${tokenClass}`.trim();
  }, [cssClass, value]);

  // When a variable is picked from the popup
  const handlePick = useCallback(
    (v: Variable) => {
      const el = inputRef.current;
      if (!el) return;
      const token = tokenFormatter(v);
      const { nextValue, nextCaret } = insertAtCaret(el, token);
      onChange(nextValue);

      // Restore focus & caret after React updates
      requestAnimationFrame(() => {
        const el2 = inputRef.current;
        if (el2) {
          el2.focus();
          try {
            el2.setSelectionRange(nextCaret, nextCaret);
          } catch {
            /* ignore non-text inputs */
          }
        }
      });

      setOpen(false);
    },
    [onChange, tokenFormatter]
  );

  // Open the popup when focusing into the textbox
  const onFocusIn = useCallback(() => setOpen(true), []);

  return (
    <div ref={wrapperRef}>
      <TextBoxComponent
        value={value}
        placeholder={placeholder}
        change={(e: any) => onChange(e.value)}
        focus={onFocusIn}
        multiline={multiline}
        cssClass={computedCssClass}
        {...ej2Props}
      />

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
