import React from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { VariablePickerTextBox } from './VariablePickerTextBox';

interface GmailNodeConfigProps {
  settings: any;
  onPatch: (patch: Record<string, any>) => void;
  variableGroups: any[];
  variablesLoading: boolean;
}

const GmailNodeConfig: React.FC<GmailNodeConfigProps> = ({
  settings = {},
  onPatch,
  variableGroups,
  variablesLoading,
}) => {
  const handle = (field: string, val: any) => onPatch({ [field]: val });
  const action = settings.action ?? 'Send';

  return (
    <>
      <div className="config-section">
        <label className="config-label">Action</label>
        <DropDownListComponent
          value={action}
          dataSource={['Send']} // keep minimal; matches current requirement
          placeholder="Select action"
          change={(e: any) => handle('action', e.value)}
          popupHeight="240px"
          zIndex={1000000}
        />
      </div>

      {action === 'Send' && (
        <>
          <div className="config-section">
            <label className="config-label">To</label>
            <VariablePickerTextBox
              value={settings.to ?? ''}
              placeholder="recipient@example.com"
              onChange={(val) => handle('to', val)}
              cssClass="config-input"
              variableGroups={variableGroups}
              variablesLoading={variablesLoading}
            />
          </div>

          <div className="config-section">
            <label className="config-label">Subject</label>
            <VariablePickerTextBox
              value={settings.subject ?? ''}
              placeholder="Subject"
              onChange={(val) => handle('subject', val)}
              cssClass="config-input"
              variableGroups={variableGroups}
              variablesLoading={variablesLoading}
            />
          </div>

          <div className="config-section">
            <label className="config-label">Message</label>
            <VariablePickerTextBox
              value={settings.message ?? ''}
              placeholder="Body text"
              onChange={(val) => handle('message', val)}
              cssClass="config-textarea"
              multiline
              variableGroups={variableGroups}
              variablesLoading={variablesLoading}
            />
          </div>
        </>
      )}
    </>
  );
};

export default GmailNodeConfig;