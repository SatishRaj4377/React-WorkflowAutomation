import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@syncfusion/ej2-base';
import { ensurePortalRoot } from '../../helper/variablePickerUtils';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import './FormPreviewPopup.css';

export type PreviewFormField = {
  label: string;
  type: 'text' | 'textarea' | 'number' | 'password' | 'email' | 'dropdown';
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

interface FormPreviewPopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: PreviewFormField[];
  onSubmit?: (payload: { values: string[]; fields: PreviewFormField[] }) => void;
  showPreviewBadge?: boolean;
}

const emptyValFor = (t: PreviewFormField['type']) => (t === 'dropdown' ? '' : '');

const FormPreviewPopup: React.FC<FormPreviewPopupProps> = ({ open, onClose, title, description, fields, onSubmit: onSubmitExternal, showPreviewBadge }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const popupHeightRef = useRef('0px');
  const dragRef = useRef<Draggable | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const initialValues = useMemo(() => fields.map(f => emptyValFor(f.type)), [fields]);
  const [values, setValues] = useState<string[]>(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Reset when fields change or popup reopens
    if (open) {
      setValues(fields.map(f => emptyValFor(f.type)));
      setErrors([]);
      setSubmitted(false);
    }
  }, [open, fields]);

  useEffect(() => {
    if (!open || !popupRef.current) return;
    const el = popupRef.current;
    dragRef.current = new Draggable(el, {
      clone: false,
      handle: '.form-preview-header',
      dragArea: '.editor-container'
    });
    return () => {
      (dragRef.current as any)?.destroy?.();
      dragRef.current = null;
    };
  }, [open]);

  const toggleMinimize = () => {
    if (!popupRef.current) return;
    if (popupRef.current.style.height === '0px'){
      popupRef.current.style.height = popupHeightRef.current; // Restore
      setIsMinimized(false);
    } else {
      popupHeightRef.current = popupRef.current.style.height || `${popupRef.current.getBoundingClientRect().height}px`;
      popupRef.current.style.height = '0px';
      setIsMinimized(true);
    }
  };

  if (!open) return null;

  const onInputChange = (idx: number, val: string) => {
    const next = values.slice();
    next[idx] = val;
    setValues(next);
  };

  const validateLocal = () => {
    const errs = fields.map((f, i) => {
      if (f.required) {
        const v = (values[i] || '').trim();
        if (!v) return 'This field is required';
      }
      return '';
    });
    setErrors(errs);
    return errs.every(e => !e);
  };

  const renderField = (f: PreviewFormField, idx: number) => {
    const id = `preview-field-${idx}`;
    const commonProps: any = {
      id,
      placeholder: f.placeholder || '',
      value: values[idx] || '',
      onChange: (e: any) => onInputChange(idx, e?.target?.value ?? ''),
    };

    switch (f.type) {
      case 'textarea':
        return <textarea {...commonProps} className="form-control" rows={3} />;
      case 'number':
        return <input {...commonProps} className="form-control" type="number" />;
      case 'password':
        return <input {...commonProps} className="form-control" type="password" />;
      case 'email':
        return <input {...commonProps} className="form-control" type="email" />;
      case 'dropdown':
        return (
          <select {...commonProps} className="form-control">
            <option value="" disabled hidden>Select...</option>
            {(f.options || []).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return <input {...commonProps} className="form-control" type="text" />;
    }
  };

  const onSubmit = (e?: any) => {
    e?.preventDefault?.();
    if (validateLocal()) {
      if (onSubmitExternal) {
        onSubmitExternal({ values, fields });
        // Let the parent decide closing; still show success locally for preview usage
      }
      setSubmitted(true);
    }
  };

  return createPortal(
    <div ref={popupRef} className="form-preview-popup">
      <div className="form-preview-header">
        {showPreviewBadge && <div className="badge">Preview</div>}
        <div className="spacer" />
        <ButtonComponent
          className="icon-btn"
          title={isMinimized ? 'Maximize' : 'Minimize'}
          iconCss={isMinimized ? 'e-icons e-expand' : 'e-icons e-collapse-2'}
          onClick={toggleMinimize}
        />
        <ButtonComponent className="icon-btn" iconCss='e-icons e-close' onClick={onClose} />
      </div>
      <div className="form-preview-body">
        {(title || description) && (
          <div className="form-hero">
            {title && <h3 className="form-title centered">{title}</h3>}
            {description && <div className="form-description centered">{description}</div>}
          </div>
        )}

        {!submitted ? (
          <form className="preview-form" onSubmit={onSubmit}>
            {fields.map((f, i) => (
              <div key={i} className="form-group">
                {f.label && (
                  <label className="form-label">
                    {f.label}
                    {f.required && <span className="req">*</span>}
                  </label>
                )}
                {renderField(f, i)}
                {errors[i] && <div className="field-error">{errors[i]}</div>}
              </div>
            ))}

            <div className="actions">
              <ButtonComponent cssClass="submit-btn" onClick={onSubmit}>Submit</ButtonComponent>
            </div>
          </form>
        ) : (
          <div className="submitted">Form submitted successfully.</div>
        )}
      </div>
    </div>,
    ensurePortalRoot()
  );
};

export default FormPreviewPopup;
