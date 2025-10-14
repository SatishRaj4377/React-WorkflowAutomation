import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { showErrorToast } from '../Toast';
import {
  getSheetsTokenCached,
  sheetsListUserSpreadsheets as listDriveSpreadsheets,
  sheetsListSheets as listSheets,
} from '../../helper/googleSheetsClient';

import './NodeConfigSidebar.css';

type Props = {
  settings: any;                            // selectedNode.settings.general
  authEmail?: string | null;                // selectedNode.settings.authentication.googleAccountEmail
  onPatch: (patch: Record<string, any>) => void;
  googleClientId?: string;                  // not used here, kept for parity
};

// Reasonable client-side poll presets (we’ll map these to ms during execution)
const POLL_PRESETS = [
  { text: 'Every 30 seconds', value: '30s' },
  { text: 'Every minute',     value: '1m'  },
  { text: 'Every 5 minutes',  value: '5m'  },
  { text: 'Every 15 minutes', value: '15m' },
  { text: 'Every hour',       value: '1h'  },
];

const TRIGGER_ON = ['Row updated', 'Row added', 'Row added or updated'] as const;

type GDoc = { id: string; name: string };
type GSheet = { id: string; title: string };

const GoogleSheetsTriggerNodeConfig: React.FC<Props> = ({
  settings,
  authEmail,
  onPatch,
}) => {
  // State for pickers (same pattern as GoogleSheetsNodeConfig)
  const [docs, setDocs] = useState<GDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [sheetsByDoc, setSheetsByDoc] = useState<Record<string, GSheet[]>>({});
  const [sheetsLoading, setSheetsLoading] = useState(false);

  const didPreload = useRef(false);

  // Selections held in settings.general
  const pollMode: string = settings.pollMode ?? '1m';
  const triggerOn: (typeof TRIGGER_ON)[number] = settings.triggerOn ?? 'Row added or updated';

  const documentId: string | undefined = settings.documentId;
  const documentName: string | undefined = settings.documentName;
  const sheetId: string | undefined = settings.sheetId;
  const sheetName: string | undefined = settings.sheetName;

  const patch = (p: Record<string, any>) => onPatch(p);

  // Dropdown data
  const ej2Fields = useMemo(() => ({ text: 'text', value: 'value' }), []);
  const docDataSource = useMemo(() => docs.map(d => ({ text: d.name, value: d.id })), [docs]);
  const sheetsForSelectedDoc = useMemo(() => (documentId ? (sheetsByDoc[documentId] ?? []) : []), [documentId, sheetsByDoc]);
  const sheetDataSource = useMemo(
    () => (sheetsForSelectedDoc ?? []).map(s => ({ text: s.title, value: s.id })),
    [sheetsForSelectedDoc]
  );

  // Load docs once when connected (cached token only; never open a popup here)
  useEffect(() => {
    if (!authEmail) return;
    if (didPreload.current) return;
    didPreload.current = true;

    (async () => {
      try {
        setDocsLoading(true);
        const token = getSheetsTokenCached();
        if (!token) return; // not connected (yet)
        const files = await listDriveSpreadsheets(token);
        setDocs(files);
      } catch (e: any) {
        const msg = (e?.message ?? `${e}`).toString();
        if (msg.includes('403')) showErrorToast('Google Sheets (403)', 'Permission denied. Please re-connect your Google account.');
      } finally {
        setDocsLoading(false);
      }
    })();
  }, [authEmail]);

  // Preload sheets any time the document changes
  useEffect(() => {
      if (documentId) {
          void ensureSheetsForDoc(documentId);
      }
  }, [documentId]);

  // Load sheets for current document lazily
  const ensureSheetsForDoc = async (spreadsheetId: string) => {
    if (!spreadsheetId) return;
    if (sheetsByDoc[spreadsheetId]?.length) return;
    try {
      setSheetsLoading(true);
      const token = getSheetsTokenCached();
      if (!token) return;
      const sheets = await listSheets(spreadsheetId, token);
      setSheetsByDoc(prev => ({ ...prev, [spreadsheetId]: sheets }));
    } catch (e: any) {
      const msg = (e?.message ?? `${e}`).toString();
      if (msg.includes('403')) showErrorToast('Google Sheets (403)', 'Permission denied. Please re-connect your Google account.');
    } finally {
      setSheetsLoading(false);
    }
  };

  // --- Render blocks -------------------------------------------------

  const renderPollTimes = () => (
    <div className="config-section">
      <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
        <label className="config-label">Poll every</label>
        <TooltipComponent content="How often to check for changes while this editor tab is open.">
          <span className="e-icons e-circle-info help-icon"></span>
        </TooltipComponent>
      </div>
      <DropDownListComponent
        value={pollMode}
        dataSource={POLL_PRESETS}
        fields={ej2Fields}
        change={(e: any) => {
          if (e.value === pollMode) return;
          patch({ pollMode: e.value });
        }}
        popupHeight="220px"
        zIndex={1000000}
      />
    </div>
  );

  const renderDocPicker = () => (
    <div className="config-section">
      <label className="config-label">Document</label>
      <DropDownListComponent
        value={documentId ?? ''}
        dataSource={docDataSource}
        placeholder={
          authEmail
            ? docsLoading ? 'Loading documents...' : 'Select a document'
            : 'Connect Google in the Authentication tab'
        }
        change={(e: any) => {
          if (e.value === documentId) return;
          const selected = docs.find(d => d.id === e.value);
          patch({
            documentId: selected?.id ?? '',
            documentName: selected?.name ?? '',
            sheetId: undefined,
            sheetName: undefined,
          });
        }}
        open={() => {
          if (!docs.length && authEmail) {
            (async () => {
              try {
                setDocsLoading(true);
                const token = getSheetsTokenCached();
                if (!token) return;
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
                if (!token) return;
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
      {authEmail && docsLoading && <div className="textbox-info">Fetching your spreadsheets…</div>}
    </div>
  );

  const renderSheetPicker = () => (
    <div className="config-section">
      <label className="config-label">Sheet</label>
      <DropDownListComponent
        value={sheetId ?? ''}
        dataSource={sheetDataSource}
        placeholder={!documentId ? 'Select a document first' : sheetsLoading ? 'Loading sheets…' : 'Select a sheet'}
        change={(e: any) => {
          if (e.value === sheetId) return;
          const sel = (sheetsForSelectedDoc ?? []).find(s => s.id === e.value);
          patch({
            sheetId: sel?.id ?? '',
            sheetName: sel?.title ?? '',
          });
        }}
        open={() => { if (documentId) void ensureSheetsForDoc(documentId); }}
        focus={() => { if (documentId) void ensureSheetsForDoc(documentId); }}
        enabled={!!documentId}
        popupHeight="240px"
        zIndex={1000000}
        fields={ej2Fields}
      />
      {documentId && sheetsLoading && <div className="textbox-info">Loading available sheets…</div>}
    </div>
  );

  const renderTriggerOn = () => (
    <div className="config-section">
      <label className="config-label">Trigger on</label>
      <DropDownListComponent
        value={triggerOn}
        dataSource={TRIGGER_ON as unknown as string[]}
        placeholder="Choose event"
        change={(e: any) => {
          if (e.value === triggerOn) return;
          patch({ triggerOn: e.value });
        }}
        popupHeight="220px"
        zIndex={1000000}
      />
    </div>
  );

  return (
    <>
      {renderPollTimes()}
      {renderDocPicker()}
      {documentId && renderSheetPicker()}
      {renderTriggerOn()}

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

export default GoogleSheetsTriggerNodeConfig;