import React, { useState } from 'react';
import {
  SidebarComponent,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-react-navigations';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { CheckBoxComponent, ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';

import { IconRegistry } from '../../assets/icons';
import { NodeConfig, NodeType } from '../../types';
import './NodeConfigSidebar.css';
import { VariableTextBox } from './VariablePicker';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: NodeConfig | null;
  onDeleteNode: (nodeId: string) => void;
  onNodeConfigChange: (nodeId: string, config: NodeConfig) => void;
}

/** Shared lists */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

/** Node types that require an Authentication tab */
const AUTH_NODE_TYPES: NodeType[] = [
  'Gmail',
  'Google Sheets',
  'Google Calendar',
  'Google Docs',
  'Telegram',
  'Twilio',
  'Azure Chat Model',
];

/** Component */
const NodeConfigSidebar: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  onDeleteNode,
  selectedNode,
  onNodeConfigChange,
}) => {
  // Hooks first — no conditional hooks to satisfy eslint rules-of-hooks
  const [activeTab, setActiveTab] = useState(0);

  // Resolve icon component only when node exists
  const nodeIconSrc =
    selectedNode?.icon ? (IconRegistry as any)[selectedNode.icon] : null;

  /** Safely update settings */
  const handleConfigChange = (
    field: string,
    value: any,
    section: 'general' | 'authentication' | 'advanced' = 'general'
  ) => {
    if (!selectedNode) return;

    const prevSection =
      (selectedNode.settings && (selectedNode.settings as any)[section]) || {};

    const updatedConfig: NodeConfig = {
      ...selectedNode,
      settings: {
        ...selectedNode.settings,
        [section]: {
          ...prevSection,
          [field]: value,
        },
      },
    };
    onNodeConfigChange(selectedNode.id, updatedConfig);
  };

  const handleNameChange = (value: string) => {
    if (!selectedNode) return;
    const updatedConfig: NodeConfig = { ...selectedNode, displayName: value };
    onNodeConfigChange(selectedNode.id, updatedConfig);
  };

  /** Node-specific fields inside the General tab */
  const renderNodeSpecificFields = (type: NodeType, settings: any) => {
    switch (type) {
      case 'Webhook':
        const webhookUrl = `http://localhost:3001/webhook/${selectedNode?.id}`;
        return (
          <>
            <div className="config-section">
              <label className="config-label">Webhook URL</label>
              <TextBoxComponent
                value={settings.url ?? webhookUrl}
                readOnly={true}
                cssClass="config-input"
              />
            </div>
          </>
        );

      case 'Schedule':
        return (
          <>
            <div className="config-section">
              <div className="config-row" style={{ justifyContent: 'space-between' }}>
                <label className="config-label">Cron Expression</label>
                <TooltipComponent content="e.g., */5 * * * * for every 5 minutes">
                  <span style={{ color: 'var(--text-secondary)', cursor: 'help' }} className='e-icons e-circle-info'></span>
                </TooltipComponent>
              </div>
              <TextBoxComponent
                value={settings.cronExpression ?? ''}
                placeholder="*/5 * * * *"
                change={(e: any) => handleConfigChange('cronExpression', e.value)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Timezone</label>
              <DropDownListComponent
                value={settings.timezone ?? ''}
                dataSource={TIMEZONES}
                placeholder="Pick a timezone"
                change={(e: any) => handleConfigChange('timezone', e.value)}
                popupHeight="240px"
                zIndex={1000000}
              />
            </div>
          </>
        );

      case 'Manual Click':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Button Label</label>
              <TextBoxComponent
                value={settings.buttonLabel ?? 'Run'}
                placeholder="Run"
                change={(e: any) => handleConfigChange('buttonLabel', e.value)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Instruction</label>
              <TextBoxComponent
                value={settings.instruction ?? ''}
                placeholder="Optional instruction for the operator"
                change={(e: any) => handleConfigChange('instruction', e.value)}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        );

      case 'Chat':
        return (
          <>
            {/* Implement AI Chat component */}
          </>
        );

      case 'AI Agent':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Role</label>
              <VariableTextBox
                value={settings.role ?? 'Assistant'}
                onChange={(val) => handleConfigChange('role', val)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Goal</label>
              <VariableTextBox
                value={settings.goal ?? ''}
                placeholder="Define the agent's objective"
                onChange={(val) => handleConfigChange('goal', val)}
                cssClass="config-textarea"
                multiline
              />
            </div>
            <div className="config-section">
              <label className="config-label">Allow Tools</label>
              <CheckBoxComponent
                checked={!!settings.allowTools}
                change={(e: any) => handleConfigChange('allowTools', !!e.checked)}
                cssClass="config-checkbox"
              />
            </div>
          </>
        );

      case 'Azure Chat Model':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Deployment</label>
              <TextBoxComponent
                value={settings.deployment ?? ''}
                placeholder="Deployment name"
                change={(e: any) => handleConfigChange('deployment', e.value)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Temperature</label>
              <TextBoxComponent
                type="number"
                value={settings.temperature ?? 1}
                change={(e: any) => handleConfigChange('temperature', e.value)}
                cssClass="config-input"
              />
            </div>
          </>
        );

      case 'HTTP Request':
        return (
          <>
            <div className="config-section">
              <label className="config-label">URL</label>
              <VariableTextBox
                value={settings.url ?? ''}
                placeholder="https://api.example.com/resource"
                onChange={(val) => handleConfigChange('url', val)}
                cssClass="config-input"
              />
            </div>

            <div className="config-section">
              <label className="config-label">Method</label>
              <DropDownListComponent
                value={settings.method ?? ''}
                dataSource={HTTP_METHODS}
                placeholder="Select method"
                change={(e: any) => handleConfigChange('method', e.value)}
                popupHeight="240px"
                zIndex={1000000}
              />
            </div>

            <div className="config-section">
              <label className="config-label">Headers (JSON)</label>
              <TextBoxComponent
                value={settings.headers ?? ''}
                placeholder='{"Content-Type":"application/json"}'
                change={(e: any) => handleConfigChange('headers', e.value)}
                cssClass="config-textarea"
                multiline
              />
            </div>

            <div className="config-section">
              <label className="config-label">Body</label>
              <VariableTextBox
                value={settings.body ?? ''}
                placeholder='{"key":"value"}'
                onChange={(val) => handleConfigChange('body', val)}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        );

      case 'Gmail':
      case 'Google Sheets':
      case 'Google Calendar':
      case 'Google Docs':
      case 'Telegram':
      case 'Twilio':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Action</label>
              <DropDownListComponent
                value={settings.action ?? ''}
                dataSource={['Create', 'Read', 'Update', 'Delete', 'List', 'Send', 'Search']}
                placeholder="Select action"
                change={(e: any) => handleConfigChange('action', e.value)}
                popupHeight="240px"
                zIndex={1000000}
              />
            </div>
          </>
        );

      case 'If Condition':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Condition</label>
              <VariableTextBox
                value={settings.condition ?? ''}
                placeholder="Use an expression or template variable"
                onChange={(val) => handleConfigChange('condition', val)}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        );

      case 'Switch Case':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Expression</label>
              <VariableTextBox
                value={settings.expression ?? ''}
                placeholder="e.g., {{ $.data.status }}"
                onChange={(val) => handleConfigChange('expression', val)}
                cssClass="config-input"
              />
            </div>
          </>
        );

      case 'Filter':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Predicate</label>
              <VariableTextBox
                value={settings.predicate ?? ''}
                placeholder="e.g., item.amount > 1000"
                onChange={(val) => handleConfigChange('predicate', val)}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  /** General tab */
  const renderGeneralTab = () => {
    const settings = (selectedNode?.settings && selectedNode.settings.general) || {};
    return (
      <div className="config-tab-content">
        <div className="config-section">
          <label className="config-label">Node Name</label>
          <TextBoxComponent
            value={selectedNode?.displayName ?? ''}
            placeholder="Enter node name"
            change={(e: any) => handleNameChange(e.value)}
            cssClass="config-input"
          />
        </div>

        {renderNodeSpecificFields(selectedNode!.nodeType, settings)}
      </div>
    );
  };

  /** Authentication tab (only when required) */
  const renderAuthenticationTab = () => {
    const auth = (selectedNode?.settings && selectedNode.settings.authentication) || {};
    const typeVal = auth.type ?? '';
    return (
      <div className="config-tab-content">
        <div className="config-section">
          <label className="config-label">Authentication Type</label>
          <DropDownListComponent
            value={typeVal}
            dataSource={['Basic Auth', 'Bearer Token', 'OAuth2']}
            placeholder="Select authentication"
            change={(e: any) => handleConfigChange('type', e.value, 'authentication')}
            popupHeight="240px"
            zIndex={1000000}
          />
        </div>

        {typeVal === 'Basic Auth' && (
          <>
            <div className="config-section">
              <label className="config-label">Username</label>
              <TextBoxComponent
                value={auth.username ?? ''}
                change={(e: any) => handleConfigChange('username', e.value, 'authentication')}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Password</label>
              <TextBoxComponent
                type="password"
                value={auth.password ?? ''}
                change={(e: any) => handleConfigChange('password', e.value, 'authentication')}
                cssClass="config-input"
              />
            </div>
          </>
        )}

        {typeVal === 'Bearer Token' && (
          <div className="config-section">
            <label className="config-label">Bearer Token</label>
            <TextBoxComponent
              value={auth.token ?? ''}
              change={(e: any) => handleConfigChange('token', e.value, 'authentication')}
              cssClass="config-input"
            />
          </div>
        )}

        {typeVal === 'OAuth2' && (
          <>
            <div className="config-section">
              <label className="config-label">Account</label>
              <DropDownListComponent
                value={auth.account ?? ''}
                dataSource={['Connect new…']}
                placeholder="Choose or connect account"
                change={(e: any) => handleConfigChange('account', e.value, 'authentication')}
                popupHeight="240px"
                zIndex={1000000}
              />
            </div>
            <div className="config-section">
              <label className="config-label">Scopes</label>
              <TextBoxComponent
                value={auth.scopes ?? ''}
                placeholder="space-separated scopes"
                change={(e: any) => handleConfigChange('scopes', e.value, 'authentication')}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const requiresAuthTab = !!selectedNode && AUTH_NODE_TYPES.includes(selectedNode.nodeType);

  return (
    <SidebarComponent
      id="config-panel-sidebar"
      className={`custom-config-panel`}
      width={'400px'}
      position="Left"
      type="Over"
      isOpen={isOpen}
      close={onClose}
      enableGestures={false}
      target=".editor-content"
    >
      {!selectedNode ? (
        <div className="config-panel-empty">
          <div className="empty-state-icon">⚙️</div>
          <h3>No Node Selected</h3>
          <p>Select a node from the diagram to configure its properties</p>
        </div>
      ) : (
        <>
          {/* === Header (kept exactly as you requested) === */}
          <div className="config-panel-header">
            <div className="config-panel-title">
              <span className="node-icon">
                {typeof nodeIconSrc === 'string' && (
                  <img
                    src={nodeIconSrc}
                    draggable={false}
                  />
                )}
              </span>
              <TooltipComponent content={`${selectedNode?.nodeType || 'Node'} Configuration`}>
                <h3>{selectedNode?.nodeType || 'Node'} Configuration</h3>
              </TooltipComponent>
            </div>
            <div>
              <ButtonComponent
                cssClass="close-btn"
                iconCss="e-icons e-trash"
                onClick={() => {
                  if (selectedNode && onDeleteNode) {
                    onDeleteNode(selectedNode.id);
                    onClose();
                  }
                }}
              />
              <ButtonComponent
                cssClass="close-btn"
                iconCss="e-icons e-close"
                onClick={onClose}
              />
            </div>
          </div>
          

          {/* === Body === */}
          <div className="config-panel-content">
            <TabComponent
              heightAdjustMode="None"
              selected={(e: any) => setActiveTab(e.selectedIndex)}
              selectedItem={activeTab}
              cssClass="config-tabs"
            >
              <TabItemsDirective>
                <TabItemDirective header={{ text: 'General' }} content={() => renderGeneralTab()} />
                {requiresAuthTab && (
                  <TabItemDirective header={{ text: 'Authentication' }} content={() => renderAuthenticationTab()} />
                )}
              </TabItemsDirective>
            </TabComponent>
          </div>
        </>
      )}
    </SidebarComponent>
  );
};

export default NodeConfigSidebar;
