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
    | 'is not equal to'; // keep right value; you can enter true/false

export type IfComparatorDate =
    | 'is equal to'
    | 'is not equal to'
    | 'before'
    | 'after'
    | 'on or before'
    | 'on or after'
    | 'is between'
    | 'is not between';

export type IfComparator =
    | IfComparatorString
    | IfComparatorNumber
    | IfComparatorBoolean
    | IfComparatorDate;

export type IfRow = {
    left: string;
    comparator: IfComparator;
    right: string;
    /** applies from the second row onwards; defines how to combine with previous row */
    joiner?: IfJoiner;
};

export type IfRows = IfRow[];

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

type ValueKind = 'string' | 'number' | 'boolean' | 'date';

/** Heuristic type inference:
 * - explicit literals: true/false, numeric, ISO-like date, yyyy-mm-dd
 * - otherwise default to string
 * - You can extend this to leverage variable metadata if available
 */
function inferValueKind(raw: string): ValueKind {
    if (!raw || typeof raw !== 'string') return 'string';

    const trimmed = raw.trim();

    // literal boolean
    if (/^\{\{.*\}\}$/.test(trimmed)) {
        // variable token – if you have metadata you can swap this out
        // default to string for safety
        return 'string';
    }
    if (/^(true|false)$/i.test(trimmed)) return 'boolean';

    // numeric literal
    if (!isNaN(Number(trimmed)) && trimmed !== '') return 'number';

    // simple date checks (ISO date/time or yyyy-mm-dd)
    const isoLike = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?Z?)?$/;
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
        default:
            return STRING_COMPARATORS;
    }
}

function coerceComparator(kind: ValueKind, current: IfComparator): IfComparator {
    const allowed = getComparatorsFor(kind);
    return allowed.includes(current) ? current : allowed[0];
}

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
                    const comparatorOptions = getComparatorsFor(kind);

                    return (
                        <React.Fragment key={i}>
                            {/* === Joiner on its own, separate full-width line (from 2nd row on) === */}
                            {i > 0 && (
                                <div style={{ margin:'1rem 0'}}>
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
                                    <DropDownListComponent
                                        value={row.comparator}
                                        dataSource={comparatorOptions}
                                        change={(e: any) => updateRow(i, { comparator: e.value as IfComparator })}
                                        popupHeight="260px"
                                        zIndex={1000000}
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