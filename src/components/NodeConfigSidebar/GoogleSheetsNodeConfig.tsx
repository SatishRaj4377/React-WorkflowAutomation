import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { TextBoxComponent, NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { VariablePickerTextBox } from './VariablePickerTextBox';
import {
  getSheetsTokenCached,
  sheetsListUserSpreadsheets as listDriveSpreadsheets,
  sheetsListSheets as listSheets,
  sheetsGetHeaderRow as getHeaderRow,
} from '../../helper/googleSheetsClient';
import './NodeConfigSidebar.css';

type Props = {
    settings: any;                               // selectedNode.settings.general
    authEmail?: string | null;                   // selectedNode.settings.authentication.googleAccountEmail
    onPatch: (patch: Record<string, any>) => void; // merged patch writer for settings.general
    variableGroups: any[];
    variablesLoading: boolean;
};

type GDoc = { id: string; name: string };
type GSheet = { id: string; title: string };

const OPERATIONS = [
    'Create Sheet',
    'Delete Sheet',
    'Append Row',
    'Update Row',
    'Delete Row/Column',
    'Get Row(s)',
] as const;

const COMBINE_FILTERS = [
    { text: 'AND (match all)', value: 'AND' },
    { text: 'OR (match any)', value: 'OR' },
];

const GoogleSheetsNodeConfig: React.FC<Props> = ({
    settings,
    authEmail,
    onPatch,
    variableGroups,
    variablesLoading,
}) => {
    const [docs, setDocs] = useState<GDoc[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);

    const [sheetsByDoc, setSheetsByDoc] = useState<Record<string, GSheet[]>>({});
    const [sheetsLoading, setSheetsLoading] = useState(false);

    const [columnsBySheet, setColumnsBySheet] = useState<Record<string, string[]>>({});
    const [colsLoading, setColsLoading] = useState(false);

    const [reloading, setReloading] = useState(false);

    // Selections
    const operation: typeof OPERATIONS[number] = settings.operation ?? '';
    const documentId: string | undefined = settings.documentId;
    const documentName: string | undefined = settings.documentName;
    const sheetId: string | undefined = settings.sheetId;
    const sheetName: string | undefined = settings.sheetName;

    // Helpers
    const patch = (p: Record<string, any>) => onPatch(p);

    const documentUrl = useMemo(() => {
        if (!documentId) return '';
        const base = `https://docs.google.com/spreadsheets/d/${documentId}`;
        return sheetId ? `${base}/edit#gid=${encodeURIComponent(sheetId)}` : base;
    }, [documentId, sheetId]);

    const sheetsForSelectedDoc = useMemo(() => {
        return documentId ? (sheetsByDoc[documentId] ?? []) : [];
    }, [documentId, sheetsByDoc]);

    const columnsForSelectedSheet = useMemo(() => {
        if (!documentId || !sheetId) return [];
        return columnsBySheet[`${documentId}:${sheetId}`] ?? [];
    }, [documentId, sheetId, columnsBySheet]);

    const docDataSource = useMemo(
        () => docs.map(d => ({ text: d.name, value: d.id })),
        [docs]
    );

    const sheetDataSource = useMemo(
        () => (sheetsForSelectedDoc ?? []).map(s => ({ text: s.title, value: s.id })),
        [sheetsForSelectedDoc]
    );
    
    const ej2Fields = useMemo(() => ({ text: 'text', value: 'value' }), []);

    const didPreload = useRef(false);

    useEffect(() => {
        if (documentId) {
            void ensureSheetsForDoc(documentId);
        }
    }, [documentId]);


    useEffect(() => {
        if (!authEmail) return;
        if (didPreload.current) return;

        didPreload.current = true;
        // Initialize GSI (no popup) then preload docs
        (async () => {
            try {
                setDocsLoading(true);
                const token = await getSheetsTokenCached();
                if (!token) return; 
                const files = await listDriveSpreadsheets(token);
                setDocs(files);
            } catch (e) {
            } finally {
                setDocsLoading(false);
            }
        })();
    }, [authEmail]);

    // If user manually types/chooses doc and sheet already set, fetch headers
    useEffect(() => {
        if (documentId && sheetId && sheetName) {
            void ensureColumnsForSheet(documentId, sheetId, sheetName);
        }
    }, [documentId, sheetId, sheetName]);

    // Load sheets when a document is selected or dropdown is focused/opened
    const ensureSheetsForDoc = async (spreadsheetId: string) => {
        if (!spreadsheetId) return;
        if (sheetsByDoc[spreadsheetId]?.length) return;
        try {
            setSheetsLoading(true);
            const token = getSheetsTokenCached();
            if (!token) return;
            const sheets = await listSheets(spreadsheetId, token);
            setSheetsByDoc((prev) => ({ ...prev, [spreadsheetId]: sheets }));
        } catch (e) {
        } finally {
            setSheetsLoading(false);
        }
    };

    // Fetch latest documents and (if a doc is selected) its sheets.
    // Keeps current selections where possible; does not clear anything.
    const fetchLatest = async () => {
        if (!authEmail || reloading) return;
        setReloading(true);
        try {
            const token = getSheetsTokenCached();
            if (!token) return;

            // 1) Reload documents
            const files = await listDriveSpreadsheets(token);
            setDocs(files);

            // 2) If a document is selected, reload its sheets
            if (documentId) {
                const sheets = await listSheets(documentId, token);
                setSheetsByDoc(prev => ({ ...prev, [documentId]: sheets }));
            }
        } finally {
            setReloading(false);
        }
    };


    // Load column headers (row 1) for selected sheet
    const ensureColumnsForSheet = async (spreadsheetId: string, shId: string, shName: string) => {
        const key = `${spreadsheetId}:${shId}`;
        if (columnsBySheet[key]?.length) return;
        try {
            setColsLoading(true);
            const token = getSheetsTokenCached();
            if (!token) return;
            const headers = await getHeaderRow(spreadsheetId, shName, token);
            setColumnsBySheet((prev) => ({ ...prev, [key]: headers }));
        } catch (e) {
        } finally {
            setColsLoading(false);
        }
    };

    const colLetterToIndex = (s: string): number => {
        if (!s) return 0;
        let n = 0;
        const up = s.trim().toUpperCase();
        for (let i = 0; i < up.length; i++) {
            const c = up.charCodeAt(i);
            if (c < 65 || c > 90) return 0;
            n = n * 26 + (c - 64);
        }
        return n;
    };

    const colIndexToLetter = (n: number): string => {
        if (!n || n < 1) return '';
        let s = '';
        while (n > 0) {
            const rem = (n - 1) % 26;
            s = String.fromCharCode(65 + rem) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };

    // ------------- Render helpers -------------
    const renderDocPicker = () => (
        <div className="config-section">
            <label className="config-label">Document</label>
            <DropDownListComponent
                value={documentId ?? ''}
                dataSource={docDataSource}
                placeholder={
                    authEmail
                        ? docsLoading
                            ? 'Loading documents...'
                            : 'Select a document'
                        : 'Connect Google in the Authentication tab'
                }
                change={(e: any) => {
                    if (e.value === documentId) return;
                    const selected = docs.find((d) => d.id === e.value);
                    // Atomic patch: set document, clear dependents
                    patch({
                        documentId: selected?.id ?? '',
                        documentName: selected?.name ?? '',
                        sheetId: undefined,
                        sheetName: undefined,
                        appendValues: undefined,
                        update: undefined,
                        delete: undefined,
                        getRows: undefined,
                    });
                }}
                open={() => {
                    // If docs not loaded yet, load on first open
                    if (!docs.length && authEmail) {
                        (async () => {
                            try {
                                setDocsLoading(true);
                                const token = getSheetsTokenCached();
                                if (!token) return
                                const files = await listDriveSpreadsheets(token);
                                setDocs(files);
                            } finally {
                                setDocsLoading(false);
                            }
                        })();
                    }
                }}
                focus={() => {
                    if (!docs.length && authEmail) {
                        (async () => {
                            try {
                                setDocsLoading(true);
                                const token = getSheetsTokenCached();
                                if (!token) return
                                const files = await listDriveSpreadsheets(token);
                                setDocs(files);
                            } finally {
                                setDocsLoading(false);
                            }
                        })();
                    }
                }}
                enabled={!!authEmail}
                popupHeight="280px"
                zIndex={1000000}
                fields={ej2Fields}
            />

            {/* Inline loading hint */}
            {authEmail && docsLoading && <div className="textbox-info">Fetching your spreadsheets…</div>}
        </div>
    );

    const renderSheetPicker = () => (
        <div className="config-section">
            <label className="config-label">Sheet</label>
            <DropDownListComponent
                value={sheetId ?? ''}
                dataSource={sheetDataSource}
                placeholder={
                    !documentId ? 'Select a document first' : sheetsLoading ? 'Loading sheets…' : 'Select a sheet'
                }
                change={(e: any) => {
                    if (e.value === sheetId) return;
                    const sel = (sheetsForSelectedDoc || []).find((s) => s.id === e.value);
                    // Atomic patch: set sheet, clear op-specific fields
                    patch({
                        sheetId: sel?.id ?? '',
                        sheetName: sel?.title ?? '',
                        appendValues: undefined,
                        update: undefined,
                        delete: undefined,
                        getRows: undefined,
                    });
                    if (sel && documentId) void ensureColumnsForSheet(documentId, sel.id, sel.title);
                }}
                open={() => {
                    if (documentId) void ensureSheetsForDoc(documentId);
                }}
                focus={() => {
                    if (documentId) void ensureSheetsForDoc(documentId);
                }}
                enabled={!!documentId}
                popupHeight="240px"
                zIndex={1000000}
                fields={ej2Fields}
            />

            {/* Inline loading hint */}
            {documentId && sheetsLoading && <div className="textbox-info">Loading available sheets…</div>}
        </div>
    );


    const renderUrlRow = () =>
        operation !== 'Create Sheet' && sheetName && documentUrl ? (
            <div className="config-section">
                <div
                    className="config-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                    {/* URL preview shown as a button */}
                    <ButtonComponent
                        cssClass="e-flat"
                        iconCss='e-icons e-open-link'
                        onClick={() => window.open(documentUrl, '_blank', 'noopener,noreferrer')}
                        title="Open in Google Sheets"
                        style={{ maxWidth: '60%', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', border:'1.2px dashed var(--scrollbar-thumb)' }}
                    >
                        {`Open ${documentName} - ${sheetName}` || 'Open in Google Sheets'}
                    </ButtonComponent>

                    {/* Fetch latest button beside it */}
                    <ButtonComponent
                        cssClass="flat-btn e-flat"
                        iconCss="e-icons e-refresh"
                        onClick={fetchLatest}
                        disabled={!authEmail || reloading}
                        title="Refresh documents and sheets"
                    >
                        {reloading ? 'Refreshing…' : 'Fetch latest'}
                    </ButtonComponent>
                </div>
                <hr></hr>
            </div>
        ) : null;


    // ---------- Operation-specific renders ----------
    const renderCreateSheet = () => {
        const create = settings.create ?? {};
        const headers: string[] = Array.isArray(create.headers) ? create.headers : [];

        const setCreate = (p: any) => patch({ create: { ...(settings.create ?? {}), ...p } });
        const addHeader = () => setCreate({ headers: [...headers, ''] });
        const updateHeader = (i: number, val: string) => {
            const next = headers.slice();
            next[i] = val;
            setCreate({ headers: next });
        };
        const removeHeader = (i: number) => setCreate({ headers: headers.filter((_, idx) => idx !== i) });

        return (
            <>
            {renderDocPicker()}
            <div className="config-section">
                <label className="config-label">Title</label>
                <TextBoxComponent
                value={settings.title ?? ''}
                placeholder="New sheet title"
                change={(e: any) => patch({ title: e.value })}
                cssClass="config-input"
                />
            </div>

            {/* Optional Column headers, shown BELOW the Title input */}
            <div className="config-section">
                <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                    <label className="config-label">Column headers <em>(optional)</em></label>
                    <TooltipComponent content="If provided, these will be written into row&nbsp;1 of the new sheet (left to right).">
                        <span className="e-icons e-circle-info help-icon"></span>
                    </TooltipComponent>
                </div>

                {headers.length === 0 ? (
                <div className="textbox-info">No headers added. Click “Add header” to add one.</div>
                ) : (
                <div className="columns-grid">
                    {headers.map((h, i) => (
                    <div
                        key={i}
                        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                    >
                        <TextBoxComponent
                        value={h}
                        placeholder={`Header ${i + 1}`}
                        change={(e: any) => updateHeader(i, String(e.value ?? ''))}
                        cssClass="config-input"
                        />
                        <ButtonComponent
                        cssClass="flat-btn e-flat"
                        iconCss="e-icons e-trash"
                        onClick={() => removeHeader(i)}
                        title="Remove header"
                        />
                    </div>
                    ))}
                </div>
                )}

                <ButtonComponent className="add-field-btn" iconCss="e-icons e-plus" onClick={addHeader}>
                Add header
                </ButtonComponent>
            </div>
            </>
        );
    };

    const renderDeleteSheet = () => (
        <>
            {renderDocPicker()}
            {documentId && renderSheetPicker()}
            {renderUrlRow()}
        </>
    );

    const renderAppendRow = () => {
        const appendValues = settings.appendValues ?? {};
        const setValue = (col: string, val: string) => patch({ appendValues: { ...appendValues, [col]: val } });

        return (
            <>
                {renderDocPicker()}
                {documentId && renderSheetPicker()}
                {renderUrlRow()}

                <div className="config-section">
                    <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                        <label className="config-label">Values to send</label>
                        <TooltipComponent content="Provide values for columns to append a new row at the end.">
                            <span className="e-icons e-circle-info help-icon"></span>
                        </TooltipComponent>
                    </div>

                    {!documentId || !sheetId ? (
                        <div className="textbox-info">Select a document and a sheet to load columns.</div>
                    ) : colsLoading ? (
                        <div className="textbox-info">Loading column headers…</div>
                    ) : !columnsForSelectedSheet.length ? (
                        <div className="textbox-info">
                            No column headers found. Create headers in row 1 and <a onClick={() => sheetName && documentId && ensureColumnsForSheet(documentId, sheetId, sheetName)}>reload</a>.
                        </div>
                    ) : (
                        <div className="columns-grid">
                            {columnsForSelectedSheet.map((col) => (
                                <div key={col} className="column-value-row">
                                    <div className="subtitle">{col}</div>
                                    <VariablePickerTextBox
                                        value={appendValues[col] ?? ''}
                                        onChange={(val) => setValue(col, val)}
                                        placeholder="Value"
                                        cssClass="config-input"
                                        variableGroups={variableGroups}
                                        variablesLoading={variablesLoading}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderUpdateRow = () => {
        const update = settings.update ?? {};
        const values = update.values ?? {};
        const setUpdate = (p: any) => patch({ update: { ...(settings.update ?? {}), ...p } });

        const selectedMatch = String(update.matchColumn ?? '');

        return (
            <>
                {renderDocPicker()}
                {documentId && renderSheetPicker()}
                {renderUrlRow()}

                <div className="config-section">
                    <label className="config-label">Column to match on</label>
                    <DropDownListComponent
                        value={selectedMatch}
                        dataSource={columnsForSelectedSheet}
                        placeholder={
                            !documentId || !sheetId ? 'Select a sheet first' : colsLoading ? 'Loading columns…' : 'Select column'
                        }
                        change={(e: any) => {
                            if (e.value === update.matchColumn) return;
                            setUpdate({ matchColumn: e.value });
                        }}
                        enabled={!!documentId && !!sheetId}
                        popupHeight="240px"
                        zIndex={1000000}
                        fields={ej2Fields}
                    />
                </div>

                <div className="config-section">
                    <label className="config-label">Values to update</label>
                    {!documentId || !sheetId ? (
                        <div className="textbox-info">Select a document and a sheet to load columns.</div>
                    ) : colsLoading ? (
                        <div className="textbox-info">Loading column headers…</div>
                    ) : !columnsForSelectedSheet.length ? (
                        <div className="textbox-info">No columns available. Add headers in row 1 and <a onClick={() => sheetName && documentId && ensureColumnsForSheet(documentId, sheetId, sheetName)}>reload</a>.</div>
                    ) : (
                        <div className="columns-grid">
                            {columnsForSelectedSheet.map((col) => (
                                <div key={col} className="column-value-row">
                                    <div className="subtitle">
                                        {col}
                                        {selectedMatch && selectedMatch === col ? <em>  (used to match)</em> : ''}
                                    </div>
                                    <VariablePickerTextBox
                                        value={values[col] ?? ''}
                                        onChange={(val) => setUpdate({ values: { ...values, [col]: val } })}
                                        placeholder="New value"
                                        cssClass="config-input"
                                        variableGroups={variableGroups}
                                        variablesLoading={variablesLoading}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderDeleteRowOrColumn = () => {
        const del = settings.delete ?? {};
        const setDel = (p: any) => patch({ delete: { ...(settings.delete ?? {}), ...p } });

        const isRow = (del.target ?? 'Row') === 'Row';

        return (
            <>
                {renderDocPicker()}
                {documentId && renderSheetPicker()}
                {renderUrlRow()}

                <div className="config-section">
                    <label className="config-label">To delete</label>
                    <DropDownListComponent
                        value={del.target ?? 'Row'}
                        dataSource={['Row', 'Column']}
                        change={(e: any) => setDel({ target: e.value })}
                        popupHeight="200px"
                        zIndex={1000000}
                    />
                </div>
                <div className="config-section grid-2">
                    <div>
                        <label className="config-label">{isRow ? 'Start row number' : 'Start column (letter)'}</label>

                        {isRow ? (
                            // ROW: numeric only, default 1
                            <NumericTextBoxComponent
                                value={del.startIndex ?? 1}
                                min={1}
                                format="n0"
                                change={(e: any) => setDel({ startIndex: e.value })}
                                cssClass="config-input"
                            />
                        ) : (
                            // COLUMN: letters only, default A
                            <TextBoxComponent
                                value={
                                    del.startColumnLetter ??
                                    (del.startIndex ? colIndexToLetter(del.startIndex) : 'A')
                                }
                                placeholder="A"
                                change={(e: any) => {
                                    const letter = String(e.value || '')
                                        .toUpperCase()
                                        .replace(/[^A-Z]/g, ''); // restrict to A-Z only
                                    const idx = colLetterToIndex(letter);
                                    setDel({
                                        startColumnLetter: letter || 'A',
                                        startIndex: idx || 1, // keep numeric for execution
                                    });
                                }}
                                cssClass="config-input"
                            />
                        )}
                    </div>

                    <div>
                        <label className="config-label">{isRow ? 'Number of rows' : 'Number of columns'}</label>
                        <NumericTextBoxComponent
                            value={del.count ?? 1}
                            min={1}
                            format="n0"
                            change={(e: any) => setDel({ count: e.value })}
                            cssClass="config-input"
                        />
                    </div>
                </div>
            </>
        );
    };

    const renderGetRows = () => {
        const getRows = settings.getRows ?? {};
        const filters = (getRows.filters ?? []) as Array<{ column?: string; value?: string }>;
        const setGetRows = (p: any) => patch({ getRows: { ...(settings.getRows ?? {}), ...p } });

        const updateFilter = (i: number, p: Partial<{ column: string; value: string }>) => {
            const next = filters.slice();
            next[i] = { ...next[i], ...p };
            setGetRows({ filters: next });
        };
        const addFilter = () => setGetRows({ filters: [...filters, { column: '', value: '' }] });
        const removeFilter = (i: number) => setGetRows({ filters: filters.filter((_, idx) => idx !== i) });

        return (
            <>
                {renderDocPicker()}
                {documentId && renderSheetPicker()}
                {renderUrlRow()}

                <div className="config-section">
                    <label className="config-label">Filters</label>
                    <div className="textbox-info" style={{ marginTop: 4 }}>
                        <span style={{ marginRight: 8 }}>Combine with</span>
                        <DropDownListComponent
                            value={getRows.combineWith ?? 'AND'}
                            dataSource={COMBINE_FILTERS}
                            fields={ej2Fields}
                            change={(e: any) => {
                                const curr = getRows.combineWith ?? 'AND';
                                if (e.value === curr) return;
                                setGetRows({ combineWith: e.value });
                            }}
                            width="180px"
                            popupHeight="200px"
                            zIndex={1000000}
                        />
                    </div>
                    <div className="textbox-info" style={{ marginTop: 8 }}>
                      Leave filters empty to return <b>all rows</b> from the selected sheet.
                    </div>
                </div>

                <div className="config-section">
                    {(filters ?? []).map((f, i) => (
                        <div key={i} className="filter-row">
                            <DropDownListComponent
                                value={f.column ?? ''}
                                dataSource={columnsForSelectedSheet}
                                placeholder={!documentId || !sheetId ? 'Select a sheet first' : colsLoading ? 'Loading…' : 'Column'}
                                change={(e: any) => {
                                    if (e.value === f.column) return;
                                    updateFilter(i, { column: e.value });
                                }}
                                enabled={!!documentId && !!sheetId}
                                popupHeight="240px"
                                zIndex={1000000}
                                width={'45%'}
                                fields={ej2Fields}
                            />
                            <VariablePickerTextBox
                                value={f.value ?? ''}
                                onChange={(val) => updateFilter(i, { value: val })}
                                placeholder="Value"
                                cssClass="config-input"
                                variableGroups={variableGroups}
                                variablesLoading={variablesLoading}
                            />
                            <ButtonComponent
                                cssClass="flat-btn e-flat"
                                iconCss="e-icons e-trash"
                                onClick={() => removeFilter(i)}
                                title="Remove filter"
                            />
                        </div>
                    ))}

                    <ButtonComponent className="add-field-btn" iconCss="e-icons e-plus" onClick={addFilter}>
                        Add Filter
                    </ButtonComponent>
                </div>
            </>
        );
    };

    // -------------- Component render --------------
    return (
        <>
            {/* Operation */}
            <div className="config-section">
                <label className="config-label">Operation</label>
                <DropDownListComponent
                    value={operation}
                    dataSource={OPERATIONS as unknown as string[]}
                    placeholder="Select operation"
                    change={(e: any) => {
                        patch({
                            operation: e.value,
                            // clear op-specific payloads atomically
                            appendValues: undefined,
                            update: undefined,
                            delete: undefined,
                            getRows: undefined,
                            create: undefined,
                        });
                    }}
                    popupHeight="260px"
                    zIndex={1000000}
                />
            </div>

            {/* Body per operation */}
            {operation === 'Create Sheet' && renderCreateSheet()}
            {operation === 'Delete Sheet' && renderDeleteSheet()}
            {operation === 'Append Row' && renderAppendRow()}
            {operation === 'Update Row' && renderUpdateRow()}
            {operation === 'Delete Row/Column' && renderDeleteRowOrColumn()}
            {operation === 'Get Row(s)' && renderGetRows()}

            {/* Nudge to connect */}
            {!authEmail && (
                <div className="config-section">
                    <div className="textbox-info">
                        Connect your Google account in the <b>Authentication</b> tab to list documents and sheets.
                    </div>
                </div>
            )}
        </>
    );
};

export default GoogleSheetsNodeConfig;
