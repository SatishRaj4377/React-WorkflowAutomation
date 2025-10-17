import React, { useMemo } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { VariablePickerTextBox } from './VariablePickerTextBox';

export type IfJoiner = 'AND' | 'OR';

export type IfComparatorString =
  | 'is equal to'
  | 'is not equal to'
  | 'contains'
  | 'does not contain'
  | 'starts with'
  | 'ends with'
  | 'matches regex';

export type IfComparatorNumber =
  | 'is equal to'
  | 'is not equal to'
  | 'greater than'
  | 'greater than or equal to'
  | 'less than'
  | 'less than or equal to'
  | 'is between'
  | 'is not between';

export type IfComparatorBoolean =
  | 'is equal to'
  | 'is not equal to' // you can enter true/false in right value
  | 'is true'
  | 'is false';

export type IfComparatorDate =
  | 'is equal to'
  | 'is not equal to'
  | 'before'
  | 'after'
  | 'on or before'
  | 'on or after'
  | 'is between'
  | 'is not between';

export type IfComparatorArray =
  | 'is empty'
  | 'is not empty'
  | 'contains value'
  | 'length greater than'
  | 'length less than';

export type IfComparatorObject =
  | 'has key'
  | 'has property'
  | 'is empty'
  | 'is not empty';

export type IfComparator =
  | IfComparatorString
  | IfComparatorNumber
  | IfComparatorBoolean
  | IfComparatorDate
  | IfComparatorArray
  | IfComparatorObject;

export type IfRow = {
  left: string;
  comparator: IfComparator;
  right: string;
  /** applies from the second row onwards; defines how to combine with previous row */
  joiner?: IfJoiner;
};

export type IfRows = IfRow[];

/* ==== Canonical comparator lists by kind ==== */
const STRING_COMPARATORS: IfComparatorString[] = [
  'is equal to',
  'is not equal to',
  'contains',
  'does not contain',
  'starts with',
  'ends with',
  'matches regex',
];

const NUMBER_COMPARATORS: IfComparatorNumber[] = [
  'is equal to',
  'is not equal to',
  'greater than',
  'greater than or equal to',
  'less than',
  'less than or equal to',
  'is between',
  'is not between',
];

const BOOLEAN_COMPARATORS: IfComparatorBoolean[] = [
  'is equal to',
  'is not equal to',
  'is true',
  'is false',
];

const DATE_COMPARATORS: IfComparatorDate[] = [
  'is equal to',
  'is not equal to',
  'before',
  'after',
  'on or before',
  'on or after',
  'is between',
  'is not between',
];

const ARRAY_COMPARATORS: IfComparatorArray[] = [
  'is empty',
  'is not empty',
  'contains value',
  'length greater than',
  'length less than',
];

const OBJECT_COMPARATORS: IfComparatorObject[] = [
  'has key',
  'has property',
  'is empty',
  'is not empty',
];

const ALL_COMPARATORS: IfComparator[] = [
  ...STRING_COMPARATORS,
  ...NUMBER_COMPARATORS,
  ...BOOLEAN_COMPARATORS,
  ...DATE_COMPARATORS,
  ...ARRAY_COMPARATORS,
  ...OBJECT_COMPARATORS,
];

/* ==== Operator grouped options (for the new grouped DropDownList) ==== */
type OpKind = 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Object';
interface OpOption {
  group: OpKind;
  text: string;
  value: IfComparator; // we persist canonical comparator strings
  [key: string]: unknown;
}
const OP_OPTIONS: OpOption[] = [
  // String
  { group: 'String', text: 'is equal to', value: 'is equal to' },
  { group: 'String', text: 'is not equal to', value: 'is not equal to' },
  { group: 'String', text: 'contains', value: 'contains' },
  { group: 'String', text: 'does not contain', value: 'does not contain' },
  { group: 'String', text: 'starts with', value: 'starts with' },
  { group: 'String', text: 'ends with', value: 'ends with' },
  { group: 'String', text: 'matches regex', value: 'matches regex' },

  // Number
  { group: 'Number', text: 'is equal to', value: 'is equal to' },
  { group: 'Number', text: 'greater than', value: 'greater than' },
  { group: 'Number', text: 'less than', value: 'less than' },
  { group: 'Number', text: 'greater than or equal to', value: 'greater than or equal to' },
  { group: 'Number', text: 'less than or equal to', value: 'less than or equal to' },
  { group: 'Number', text: 'is between', value: 'is between' },

  // Boolean
  { group: 'Boolean', text: 'is equal to', value: 'is equal to' },
  { group: 'Boolean', text: 'is not equal to', value: 'is not equal to' },
  { group: 'Boolean', text: 'is true', value: 'is true' },
  { group: 'Boolean', text: 'is false', value: 'is false' },

  // Date
  { group: 'Date', text: 'is equal to', value: 'is equal to' },
  { group: 'Date', text: 'before', value: 'before' },
  { group: 'Date', text: 'after', value: 'after' },
  { group: 'Date', text: 'on or before', value: 'on or before' },
  { group: 'Date', text: 'on or after', value: 'on or after' },
  { group: 'Date', text: 'is between', value: 'is between' },

  // Array
  { group: 'Array', text: 'is empty', value: 'is empty' },
  { group: 'Array', text: 'is not empty', value: 'is not empty' },
  { group: 'Array', text: 'contains value', value: 'contains value' },
  { group: 'Array', text: 'length greater than', value: 'length greater than' },
  { group: 'Array', text: 'length less than', value: 'length less than' },

  // Object
  { group: 'Object', text: 'has key', value: 'has key' },
  { group: 'Object', text: 'has property', value: 'has property' },
  { group: 'Object', text: 'is empty', value: 'is empty' },
  { group: 'Object', text: 'is not empty', value: 'is not empty' },
];

/* ==== Kind inference + allowed sets ==== */
type ValueKind = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

/** Heuristic type inference:
 *  - explicit literals: true/false, numeric, ISO-like date, yyyy-mm-dd
 *  - simple array/object literal check: [] or {}
 *  - variables default to string (until you add metadata)
 */
function inferValueKind(raw: string): ValueKind {
  if (!raw || typeof raw !== 'string') return 'string';
  const trimmed = raw.trim();

  // variable token => default to string (plug your metadata here later)
  if (/^\{\{.*\}\}$/.test(trimmed)) return 'string';

  // obvious array/object literals (rough heuristic)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'array';
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'object';

  if (/^(true|false)$/i.test(trimmed)) return 'boolean';

  if (!isNaN(Number(trimmed)) && trimmed !== '') return 'number';

  // ISO date / yyyy-mm-dd (basic check)
  const isoLike =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?Z?)?$/;
  if (isoLike.test(trimmed)) return 'date';

  return 'string';
}

function getComparatorsFor(kind: ValueKind): IfComparator[] {
  switch (kind) {
    case 'number':
      return NUMBER_COMPARATORS;
    case 'boolean':
      return BOOLEAN_COMPARATORS;
    case 'date':
      return DATE_COMPARATORS;
    case 'array':
      return ARRAY_COMPARATORS;
    case 'object':
      return OBJECT_COMPARATORS;
    default:
      return STRING_COMPARATORS;
  }
}

/** Only coerce when the comparator is not recognized at all.
 *  This ensures a user-selected comparator from a different group isn't overridden.
 */
function coerceComparator(kind: ValueKind, current: IfComparator): IfComparator {
  if (ALL_COMPARATORS.includes(current)) return current;
  const allowed = getComparatorsFor(kind);
  return allowed[0];
}

/* ==== Component ==== */
export interface IfConditionNodeConfigProps {
  /** Current rows (state lives in NodeConfigSidebar settings.general.conditions) */
  value?: IfRows;
  /** Persist handler to parent */
  onChange: (rows: IfRows) => void;
  /** Variable picker plumbing */
  variableGroups: any[];
  variablesLoading: boolean;
  /** Optional: label text / customization */
  label?: string;
}

const IfConditionNodeConfig: React.FC<IfConditionNodeConfigProps> = ({
  value,
  onChange,
  variableGroups,
  variablesLoading,
  label = 'Conditions',
}) => {
  const rows: IfRows = useMemo(
    () => (value && value.length ? value : [{ left: '', comparator: 'is equal to', right: '' }]),
    [value]
  );

  const setRows = (next: IfRows) => {
    // ensure first row has no joiner
    if (next.length > 0 && next[0].joiner) {
      next = [{ ...next[0], joiner: undefined }, ...next.slice(1)];
    }
    onChange(next);
  };

  const addRow = () => {
    const prev = rows;
    const next: IfRows = [
      ...prev,
      {
        joiner: 'AND',
        left: '',
        comparator: 'is equal to',
        right: '',
      },
    ];
    setRows(next);
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
  };

  const updateRow = (i: number, patch: Partial<IfRow>) => {
    const next = rows.slice();
    const merged: IfRow = { ...next[i], ...patch } as IfRow;

    // type‑aware comparator coercion based on LEFT side only
    const kind = inferValueKind(merged.left);
    merged.comparator = coerceComparator(kind, merged.comparator);

    next[i] = merged;
    setRows(next);
  };

  const getGroupedOptions = (preferredGroup: OpKind): OpOption[] => {
    const first = OP_OPTIONS.filter(o => o.group === preferredGroup);
    const rest  = OP_OPTIONS.filter(o => o.group !== preferredGroup);
    return [...first, ...rest];
  };


  return (
    <>
      <div className="config-section">
        <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
          <label className="config-label">{label}</label>
          <TooltipComponent content="Create one or more conditions. Use AND/OR between rows to control.">
            <span className="e-icons e-circle-info help-icon"></span>
          </TooltipComponent>
        </div>

        {rows.map((row, i) => {
          const kind = inferValueKind(row.left);

          // For UX, show the inferred kind group first in the dropdown (but still include all)
          const preferredGroup: OpKind =
            kind === 'number'
              ? 'Number'
              : kind === 'boolean'
              ? 'Boolean'
              : kind === 'date'
              ? 'Date'
              : kind === 'array'
              ? 'Array'
              : kind === 'object'
              ? 'Object'
              : 'String';

          const groupedOptions = getGroupedOptions(preferredGroup);

          return (
            <React.Fragment key={i}>
              {/* === Joiner on its own, separate full-width line (from 2nd row on) === */}
              {i > 0 && (
                <div style={{ margin: '1rem 0' }}>
                  <DropDownListComponent
                    value={row.joiner ?? 'AND'}
                    dataSource={['AND', 'OR']}
                    change={(e: any) => updateRow(i, { joiner: e.value as IfJoiner })}
                    popupHeight="200px"
                    zIndex={1000000}
                    width={'110px'}
                  />
                </div>
              )}

              {/* === Condition row === */}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <div style={{ width: '60%' }}>
                  <VariablePickerTextBox
                    value={row.left ?? ''}
                    placeholder="value 1"
                    onChange={(val) => updateRow(i, { left: val })}
                    cssClass="config-input"
                    variableGroups={variableGroups}
                    variablesLoading={variablesLoading}
                  />
                </div>

                <div style={{ width: '40%' }}>
                  {/* New grouped operator selector */}
                  <DropDownListComponent
                    value={row.comparator}
                    dataSource={groupedOptions as { [key: string]: Object }[]}
                    fields={{ text: 'text', value: 'value', groupBy: 'group' }}
                    allowFiltering={true}
                    filterBarPlaceholder="Search operations…"
                    placeholder="Choose operation"
                    popupHeight="300px"
                    zIndex={1000000}
                    change={(e: any) => updateRow(i, { comparator: e.value as IfComparator })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, width: '100%', margin: '.5rem 0' }}>
                <div style={{ width: '100%' }}>
                  <VariablePickerTextBox
                    value={row.right ?? ''}
                    placeholder="value 2"
                    onChange={(val) => updateRow(i, { right: val })}
                    cssClass="config-input"
                    variableGroups={variableGroups}
                    variablesLoading={variablesLoading}
                  />
                </div>

                <ButtonComponent
                  cssClass="flat-btn e-flat"
                  iconCss="e-icons e-trash"
                  onClick={() => removeRow(i)}
                  title="Remove condition"
                  disabled={rows.length === 1}
                />
              </div>
            </React.Fragment>
          );
        })}

        <ButtonComponent className="add-field-btn" iconCss="e-icons e-plus" onClick={addRow}>
          Add condition
        </ButtonComponent>
      </div>
    </>
  );
};

export default IfConditionNodeConfig;