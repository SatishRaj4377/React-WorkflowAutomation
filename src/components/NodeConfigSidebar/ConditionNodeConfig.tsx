import React, { useMemo } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { VariablePickerTextBox } from './VariablePickerTextBox';
import { ConditionComparator, ConditionJoiner, ConditionRow, ConditionValueKind } from '../../types';
import { OP_OPTIONS, OpKind, orderByPreferredGroup, usesRightOperand } from '../../constants';

// Infer kind from left value (heuristic at config-time; runtime does precise inference)
function inferKindFromLeftText(raw: string): ConditionValueKind {
  if (!raw || typeof raw !== 'string') return 'string';
  const s = raw.trim();
  if (s.startsWith('[') && s.endsWith(']')) return 'array';
  if (s.startsWith('{') && s.endsWith('}')) return 'object';
  if (/^(true|false)$/i.test(s)) return 'boolean';
  if (!isNaN(Number(s)) && s !== '') return 'number';
  if (/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?Z?)?$/.test(s)) return 'date';
  return 'string';
}

export interface ConditionNodeConfigProps {
  value?: ConditionRow[];
  onChange: (rows: ConditionRow[]) => void;
  variableGroups: any[];
  variablesLoading: boolean;
  label?: string;
  showJoiners?: boolean;
}

const ConditionNodeConfig: React.FC<ConditionNodeConfigProps> = ({
  value,
  onChange,
  variableGroups,
  variablesLoading,
  label = 'Conditions',
  showJoiners = true,
}) => {
  const rows: ConditionRow[] = useMemo(
    () => (value && value.length ? value : [{ left: '', comparator: 'is equal to', right: '' }]),
    [value]
  );

  const setRows = (next: ConditionRow[]) => {
    if (next.length > 0 && next[0].joiner) {
      next = [{ ...next[0], joiner: undefined }, ...next.slice(1)];       // first row never has joiner
    }
    onChange(next);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { joiner: 'AND', left: '', comparator: 'is equal to', right: '' },  // new row joins by AND by default
    ]);
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) return;                                        // at least one row
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, patch: Partial<ConditionRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch } as ConditionRow;
    setRows(next);
  };

  return (
    <>
      <div className="config-section">
        <label className="config-label">{label}</label>

        {rows.map((row, i) => {
          const kind: ConditionValueKind = inferKindFromLeftText(row.left ?? '');
          const preferredGroup: OpKind =
            kind === 'number' ? 'Number' :
            kind === 'boolean' ? 'Boolean' :
            kind === 'date' ? 'Date' :
            kind === 'array' ? 'Array' :
            kind === 'object' ? 'Object' : 'String';

          // DO NOT use hooks inside map; call pure helper
          const groupedOptions = orderByPreferredGroup(OP_OPTIONS, preferredGroup);

          // Show joiner *below current row* only if there is a next row
          const showJoinerBelow = i < rows.length - 1;
          const needsRight = usesRightOperand(row.comparator);

          return (
            <React.Fragment key={i}>
              <div style={{background: 'var(--border-color)', padding:'.5rem', borderRadius:'8px'}}>
                {/* Line 1: Value 1 + Operator + actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                  <ButtonComponent
                    style={{width: 45}}
                    cssClass="flat-btn e-flat"
                    iconCss="e-icons e-trash"
                    onClick={() => removeRow(i)}
                    title="Remove condition"
                    disabled={rows.length === 1}
                  />
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
                    <DropDownListComponent
                      value={row.comparator}
                      dataSource={groupedOptions as unknown as { [key: string]: object }[]}
                      fields={{ text: 'text', value: 'value', groupBy: 'group' }}
                      allowFiltering={true}
                      filterBarPlaceholder="Search operations…"
                      placeholder="Choose operation"
                      popupHeight="300px"
                      zIndex={1000000}
                      change={(e: any) => updateRow(i, { comparator: e.value as ConditionComparator })}
                    />
                  </div>

                </div>

                {/* Line 2: Value 2 - only for binary ops */}
                {needsRight && (
                  <div style={{ marginTop: 8, width: '85%', marginLeft: 'auto'}}>
                    <VariablePickerTextBox
                      value={row.right ?? ''}
                      placeholder="value 2"
                      onChange={(val) => updateRow(i, { right: val })}
                      cssClass="config-input"
                      variableGroups={variableGroups}
                      variablesLoading={variablesLoading}
                    />
                  </div>
                )}
              </div>
              {/* Line 3: AND/OR between rows, only if a next row exists */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', margin: '12px 0 6px'}}>
                {showJoiners && showJoinerBelow && (
                  <>
                    <div style={{ flex: 1, height: 1, background: 'var(--scrollbar-thumb)', opacity: 0.6 }} />
                      <DropDownListComponent
                        value={(rows[i + 1]?.joiner ?? 'AND') as ConditionJoiner}
                        dataSource={['AND', 'OR']}
                        popupHeight="200px"
                        zIndex={1000000}
                        width={'110px'}
                        change={(e: any) => updateRow(i + 1, { joiner: e.value as ConditionJoiner })}
                      />
                    <div style={{ flex: 1, height: 1, background: 'var(--scrollbar-thumb)', opacity: 0.6 }} />
                  </>
                  )}
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

export default ConditionNodeConfig;