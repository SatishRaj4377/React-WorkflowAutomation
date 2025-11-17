import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { UploaderComponent, SelectedEventArgs } from '@syncfusion/ej2-react-inputs';
import { RichTextEditorComponent, Inject, HtmlEditor, Toolbar, Image, Link, QuickToolbar, Table, PasteCleanup, ImportExport, Resize } from '@syncfusion/ej2-react-richtexteditor';
import { VariablePickerTextBox, VariablePickerPopup } from './VariablePickerTextBox';
import { insertAtCaret, buildJsonFromVariables } from '../../helper/variablePickerUtils';
import './NodeConfigSidebar.css';

// Import showcase default Word files
import DefaultTemplate1 from '../../data/Word Files/Syncfusion_Offer_Letter_Template_Doc.docx';

export type WordNodeOperation = 'Write' | 'Read' | 'Update (Mapper)';

type Props = {
  settings: any; // selectedNode.settings.general
  onPatch: (patch: Record<string, any>) => void; // merges into settings.general
  variableGroups: any[];
  variablesLoading: boolean;
};

// Showcase defaults list
const DEFAULT_WORD_FILES: Array<{ key: string; name: string; url: string }> = [
  { key: 'offer-letter', name: 'Syncfusion Offer Letter Template', url: DefaultTemplate1 },
];

const OPERATIONS: WordNodeOperation[] = ['Write', 'Read', 'Update (Mapper)'];

const WordNodeConfig: React.FC<Props> = ({ settings, onPatch, variableGroups, variablesLoading }) => {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localFileUrl, setLocalFileUrl] = useState<string>('');
  const [previewError, setPreviewError] = useState<string>('');

  // Detected placeholders from the selected doc (for Update Mapper)
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  
  // Variable picker popup state for RichTextEditor
  const [rteVarPickerOpen, setRteVarPickerOpen] = useState(false);
  const rteEditorRef = useRef<RichTextEditorComponent | null>(null);

  // Handler for inserting variables into the RTE. Defined at component scope
  // to comply with hook rules (avoid calling hooks inside nested functions).
  const handleRteVariablePick = useCallback(
    (variable: any) => {
      const token = `{{ ${variable.path} }}`;

      const rte = rteEditorRef.current as any;
      const contentEl = (rte?.element?.querySelector?.('.e-rte-content') as HTMLElement) || (rte?.element as HTMLElement) || (document.querySelector('.e-rte-content') as HTMLElement | null);
      if (contentEl) {
        const { nextValue } = insertAtCaret(contentEl, token);
        onPatch({ write: { ...(settings.write ?? {}), content: nextValue } });
      } else {
        // Fallback: append token to stored content
        const currentContent = (settings?.write?.content as string) ?? '';
        onPatch({ write: { ...(settings.write ?? {}), content: currentContent + token } });
      }
      setRteVarPickerOpen(false);
    },
    [settings, onPatch]
  );

  const uploaderRef = useRef<UploaderComponent | null>(null);

  const operation: WordNodeOperation | '' = settings.operation ?? '';

  // Selected file: either a default item or a local file
  const selectedDefaultKey: string | undefined = settings.defaultFileKey;
  const selectedDefault = useMemo(
    () => DEFAULT_WORD_FILES.find((f) => f.key === selectedDefaultKey),
    [selectedDefaultKey]
  );

  const fields = useMemo(() => ({ text: 'name', value: 'key' }), []);

  const fileChosen = !!selectedDefault || !!localFile;
  const chosenName = localFile?.name || selectedDefault?.name || '';
  const chosenUrl = localFileUrl || selectedDefault?.url || '';

  useEffect(() => {
    return () => {
      if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    };
  }, [localFileUrl]);

  const patch = (p: Record<string, any>) => onPatch(p);

  // Uploader handlers - Fixed to prevent document disappearing
  const onUploaderSelected = useCallback((args: SelectedEventArgs) => {
    const raw = (args as any)?.filesData?.[0];
    const file: File | undefined = (raw && (raw as any).rawFile) || (args as any)?.event?.target?.files?.[0];
    if (!file) return;
    
    const valid = /\.(docx?|DOCX?)$/i.test(file.name);
    if (!valid) {
      setPreviewError('Please select a .doc or .docx file.');
      return;
    }
    
    // Revoke old URL if exists
    if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    
    // Create new blob URL and persist it
    const url = URL.createObjectURL(file);
    setLocalFile(file);
    setLocalFileUrl(url);
    setPreviewError('');
    
    // Update config without clearing
    patch({ 
      defaultFileKey: undefined, 
      fileSource: 'device', 
      fileName: file.name 
    });
    
    // Clear uploader file list to avoid UI confusion, but keep our state
    if (uploaderRef.current) {
      uploaderRef.current.clearAll();
    }
  }, [localFileUrl]);

  const onRemoveChosen = useCallback(() => {
    if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    setLocalFile(null);
    setLocalFileUrl('');
    // Clear any default selection too
    patch({ fileSource: undefined, fileName: undefined, defaultFileKey: undefined });
  }, [localFileUrl]);

  const onSelectDefault = (e: any) => {
    if (!e?.value) return;
    const sel = DEFAULT_WORD_FILES.find((d) => d.key === e.value);
    if (sel) {
      // Clear any local-file and persist default selection
      if (localFileUrl) URL.revokeObjectURL(localFileUrl);
      setLocalFile(null);
      setLocalFileUrl('');
      setPreviewError('');
      patch({
        defaultFileKey: sel.key,
        fileSource: 'default',
        fileName: sel.name,
      });
    }
  };

  // Simple preview - just open the file in system
  const onPreview = useCallback(() => {
    setPreviewError('');
    if (!chosenUrl && !localFile) {
      setPreviewError('No file selected.');
      return;
    }
    
    try {
      // For local files, open the blob URL
      if (localFile && localFileUrl) {
        window.open(localFileUrl, '_blank');
        return;
      }
      
      // For default templates, fetch and open
      if (chosenUrl) {
        fetch(chosenUrl)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            // Note: blobUrl will be cleaned up when tab is closed
          })
          .catch(() => {
            setPreviewError('Unable to open file.');
          });
      }
    } catch (err) {
      console.error('Error opening file:', err);
      setPreviewError('Unable to open file.');
    }
  }, [chosenUrl, localFile, localFileUrl]);

  // --- Placeholder detection (for Update Mapper) ---
  const extractPlaceholders = async () => {
    const loadArrayBuffer = async (): Promise<ArrayBuffer> => {
      if (localFile) return await localFile.arrayBuffer();
      if (chosenUrl) {
        const resp = await fetch(chosenUrl);
        const buf = await resp.arrayBuffer();
        return buf;
      }
      return new ArrayBuffer(0);
    };
    try {
      setParsing(true);
      const PizZip = (await import('pizzip')).default;
      const buf = await loadArrayBuffer();
      const zip = new PizZip(buf);

      // Gather text from all relevant XML parts to handle split runs
      const targets = Object.keys(zip.files).filter((k) => k.startsWith('word/') && k.endsWith('.xml'));
      const textSegments: string[] = [];
      for (const key of targets) {
        const xml = zip.file(key)?.asText() || '';
        // Extract text nodes content by stripping tags; this approximates concatenated text
        const stripped = xml.replace(/<[^>]+>/g, '');
        textSegments.push(stripped);
      }
      const fullText = textSegments.join('\n');
      const re = /\{\{\s*([a-zA-Z0-9_\.\-]+)\s*\}\}/g;
      const set = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(fullText))) set.add(m[1]);
      const tags = Array.from(set);
      setPlaceholders(tags);
      return tags;
    } catch (e) {
      setPlaceholders([]);
      return [] as string[];
    } finally {
      setParsing(false);
    }
  };

  // Auto-parse when switching to Update operation and a file is present
  useEffect(() => {
    if (operation === 'Update (Mapper)' && fileChosen) {
      void extractPlaceholders();
    }
  }, [operation, fileChosen, chosenUrl]);

  // --- Renders ---
  const renderFilePicker = () => (
    <div className="config-section">
      <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
        <label className="config-label">Word document</label>
        <TooltipComponent content="Upload a Word file or select a built-in sample below. Drag & drop is supported.">
          <span className="e-icons e-circle-info help-icon"></span>
        </TooltipComponent>
      </div>

      {/* Uploader on top - hide when a default file is selected */}
      {!selectedDefault && (
        <UploaderComponent
          ref={uploaderRef as any}
          autoUpload={false}
          multiple={false}
          allowedExtensions=".doc,.docx"
          selected={onUploaderSelected}
          dropArea=".config-panel-content"
          showFileList={false}
        />
      )}

      {/* Default file dropdown below - hide when a local file is selected */}
      {!localFile && (
        <div style={{ marginTop: 10 }}>
          <DropDownListComponent
            value={selectedDefaultKey ?? ''}
            dataSource={DEFAULT_WORD_FILES}
            placeholder="Or select a sample file"
            change={onSelectDefault}
            popupHeight="240px"
            zIndex={1000000}
            fields={fields as any}
            width="100%"
          />
        </div>
      )}

      {/* Display selected file with remove option */}
      {(localFile || selectedDefault) && (
        <div className="textbox-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            ✓ {chosenName}
          </span>
          <ButtonComponent 
            cssClass="flat-btn e-flat" 
            iconCss="e-icons e-close" 
            title="Remove file" 
            onClick={() => {
              onRemoveChosen();
              if (uploaderRef.current) {
                uploaderRef.current.clearAll();
              }
            }} 
          />
        </div>
      )}

      {/* Preview button */}
      {fileChosen && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ButtonComponent 
            cssClass="e-flat" 
            iconCss="e-icons e-eye" 
            onClick={onPreview}
          >
            {`Open - ${chosenName}`}
          </ButtonComponent>
          {previewError && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{previewError}</div>}
        </div>
      )}
    </div>
  );

  const renderOperationPicker = () => (
    <div className="config-section">
      <label className="config-label">Operation</label>
      <DropDownListComponent
        value={operation}
        dataSource={OPERATIONS as unknown as string[]}
        placeholder={fileChosen ? 'Select operation' : 'Choose a document first'}
        change={(e: any) => {
          patch({
            operation: e.value,
            write: undefined,
            read: undefined,
            update: undefined,
          });
        }}
        enabled={!!fileChosen}
        popupHeight="240px"
        zIndex={1000000}
      />
    </div>
  );

  const renderWrite = () => {
    const write = settings.write ?? {};
    
    const toolbarItems = [
      'Undo', 'Redo', '|',
      'Bold', 'Italic', 'Underline', 'StrikeThrough', '|',
      'FontName', 'FontSize', 'FontColor', 'BackgroundColor', '|',
      'Formats', 'Alignments', 'Blockquote', '|', 'NumberFormatList', 'BulletFormatList',
      '|', 'CreateLink', 'Image', 'CreateTable', '|', 'ClearFormat'
    ];

    // Uses component-level `handleRteVariablePick` defined outside to insert variables

    return (
      <div className="config-section">
        <div className="textbox-info" style={{ marginBottom: 12 }}>
          Warning: This operation will clear all existing content in the selected file and write fresh content.
        </div>

        {/* Rich Text Editor for content input */}
        <div className="config-row" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <label className="config-label">Content to Write</label>
          <TooltipComponent content="Enter formatted content to write into the document. Supports formatting, tables, images, variables, and paste from Word files with formatting preserved. Focus to open variable picker.">
            <span className="e-icons e-circle-info help-icon"></span>
          </TooltipComponent>
        </div>
        
        {/* Resizable container with min height */}
        <RichTextEditorComponent
          ref={(ref: any) => {
            if (ref) rteEditorRef.current = ref;
          }}
          id="word-write-editor"
          value={write.content ?? ''}
          enableResize={true}
          change={(e: any) => patch({ write: { ...write, content: e.value } })}
          height="400px"
          toolbarSettings={{ items: toolbarItems as any }}
          enableXhtml={true}
          pasteCleanupSettings={{ 
            deniedTags: ['script', 'style'],
            keepFormat: true 
          }}
          focus={() => setRteVarPickerOpen(true)}
        >
          <Inject services={[Toolbar, HtmlEditor, Image, Link, QuickToolbar, Table, PasteCleanup, ImportExport, Resize]} />
        </RichTextEditorComponent>
  

        {/* Variable Picker Popup for RTE */}
        <VariablePickerPopup
          anchorEl={rteEditorRef.current?.element ?? null}
          open={rteVarPickerOpen}
          onClose={() => setRteVarPickerOpen(false)}
          onPick={handleRteVariablePick}
          variableGroups={variableGroups}
          loading={variablesLoading}
          zIndex={1000020}
        />
      </div>
    );
  };

  const renderRead = () => (
    <div className="config-section">
      <div className="textbox-info">Reads the attached file. No additional inputs are required.</div>
    </div>
  );

  const renderUpdateMapper = () => {
    const update = settings.update ?? {};
    const values: Record<string, string> = update.values ?? {};

    return (
      <>
        <div className="config-section">
          {!fileChosen ? (
            <div className="textbox-info">Attach a Word file to discover template placeholders like {'{{name}}'}.</div>
          ) : parsing ? (
            <div className="textbox-info">Analyzing document for placeholders…</div>
          ) : placeholders.length === 0 ? (
            <div className="textbox-info" style={{ color: 'var(--danger-color)' }}>
              No placeholders found in this document.
            </div>
          ) : (
            <>
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Template placeholders</label>
                <TooltipComponent content="Values will replace {{placeholders}} in the document during execution.">
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>

              {(placeholders || []).map((key) => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ minWidth: 180 }} className="subtitle">{`{{${key}}}`}</div>
                  <VariablePickerTextBox
                    value={values[key] ?? ''}
                    onChange={(val) => patch({ update: { ...update, values: { ...(values || {}), [key]: val } } })}
                    placeholder="Value"
                    cssClass="config-input"
                    variableGroups={variableGroups}
                    variablesLoading={variablesLoading}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {renderFilePicker()}
      {renderOperationPicker()}

      {operation === 'Write' && renderWrite()}
      {operation === 'Read' && renderRead()}
      {operation === 'Update (Mapper)' && renderUpdateMapper()}
    </>
  );
};

export default WordNodeConfig;
