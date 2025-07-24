import React, { useState } from 'react';
import { SidebarComponent, TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent, CheckBoxComponent, SwitchComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { NodeConfig } from '../../types';
import './ConfigPanel.css';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: NodeConfig | null;
  onNodeConfigChange: (nodeId: string, config: NodeConfig) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeConfigChange,
}) => {
  // Local state for panel maximization
  const [isMaximized, setIsMaximized] = useState(false);
  // Local state for active tab in the configuration tabs
  const [activeTab, setActiveTab] = useState(0);

  /**
   * Handles configuration changes for node settings
   * @param field - The field name to update
   * @param value - The new value for the field
   * @param section - The settings section (general, authentication, advanced)
   */
  const handleConfigChange = (field: string, value: any, section: 'general' | 'authentication' | 'advanced' = 'general') => {
    if (!selectedNode) return;

    const updatedConfig = {
      ...selectedNode,
      settings: {
        ...selectedNode.settings,
        [section]: {
          ...selectedNode.settings[section],
          [field]: value
        }
      }
    };

    onNodeConfigChange(selectedNode.id, updatedConfig);
  };

  /**
   * Handles node name changes
   */
  const handleNameChange = (value: string) => {
    if (!selectedNode) return;
    const updatedConfig = { ...selectedNode, name: value };
    onNodeConfigChange(selectedNode.id, updatedConfig);
  };

  /**
   * Handles node enable/disable toggle
   */
  const handleDisableToggle = (checked: boolean) => {
    if (!selectedNode) return;
    const updatedConfig = { ...selectedNode, disabled: !checked };
    onNodeConfigChange(selectedNode.id, updatedConfig);
  };

  /**
   * Toggles the maximized state of the config panel
   */
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  /**
   * Renders the General tab content with basic node configuration
   */
  const renderGeneralTab = () => {
    if (!selectedNode) return null;

    return (
      <div className="config-tab-content">
        <div className="config-section">
          <label className="config-label">Node Name</label>
          <TextBoxComponent
            value={selectedNode?.name || ''}
            placeholder="Enter node name"
            change={(e: any) => handleNameChange(e.value)}
            cssClass="config-input"
          />
        </div>

        <div className="config-section">
          <label className="config-label">Description</label>
          <TextBoxComponent
            value={selectedNode?.settings?.general?.description || ''}
            placeholder="Enter node description"
            change={(e: any) => handleConfigChange('description', e.value)}
            cssClass="config-textarea"
            multiline
          />
        </div>

        <div className="config-section">
          <div className="config-row">
            <label className="config-label">Enabled</label>
            <SwitchComponent
              checked={!selectedNode?.disabled}
              change={(e: any) => handleDisableToggle(e.checked)}
              cssClass="config-switch"
            />
          </div>
        </div>

        {/* Node-specific configuration based on type */}
        {selectedNode.type === 'trigger' && renderTriggerConfig()}
        {selectedNode.type === 'action' && renderActionConfig()}
        {selectedNode.type === 'form' && renderFormConfig()}
        {selectedNode.type === 'sticky' && renderStickyConfig()}
      </div>
    );
  };

  /**
   * Renders trigger-specific configuration options
   */
  const renderTriggerConfig = () => {
    if (!selectedNode) return null;
    const settings = selectedNode.settings.general || {};

    return (
      <>
        <div className="config-section">
          <label className="config-label">Trigger Type</label>
          <select
            value={settings.triggerType || 'webhook'}
            onChange={(e) => handleConfigChange('triggerType', e.target.value)}
            className="config-select"
          >
            <option value="webhook">Webhook</option>
            <option value="schedule">Schedule</option>
            <option value="email">Email</option>
            <option value="file">File Watcher</option>
          </select>
        </div>

        {settings.triggerType === 'webhook' && (
          <div className="config-section">
            <label className="config-label">Webhook URL</label>
            <TextBoxComponent
              value={settings.webhookUrl || ''}
              placeholder="https://your-webhook-url.com"
              change={(e: any) => handleConfigChange('webhookUrl', e.value)}
              cssClass="config-input"
            />
          </div>
        )}

        {settings.triggerType === 'schedule' && (
          <div className="config-section">
            <label className="config-label">Cron Expression</label>
            <TextBoxComponent
              value={settings.cronExpression || ''}
              placeholder="0 0 * * *"
              change={(e: any) => handleConfigChange('cronExpression', e.value)}
              cssClass="config-input"
            />
          </div>
        )}
      </>
    );
  };

  /**
   * Renders action-specific configuration options
   */
  const renderActionConfig = () => {
    if (!selectedNode) return null;
    const settings = selectedNode.settings.general || {};

    return (
      <>
        <div className="config-section">
          <label className="config-label">Action Type</label>
          <select
            value={settings.actionType || 'http'}
            onChange={(e) => handleConfigChange('actionType', e.target.value)}
            className="config-select"
          >
            <option value="http">HTTP Request</option>
            <option value="email">Send Email</option>
            <option value="transform">Transform Data</option>
            <option value="condition">Condition</option>
          </select>
        </div>

        {settings.actionType === 'http' && (
          <>
            <div className="config-section">
              <label className="config-label">URL</label>
              <TextBoxComponent
                value={settings.url || ''}
                placeholder="https://api.example.com/endpoint"
                change={(e: any) => handleConfigChange('url', e.value)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Method</label>
              <select
                value={settings.method || 'GET'}
                onChange={(e) => handleConfigChange('method', e.target.value)}
                className="config-select"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </>
        )}

        {settings.actionType === 'email' && (
          <>
            <div className="config-section">
              <label className="config-label">To Email</label>
              <TextBoxComponent
                value={settings.toEmail || ''}
                placeholder="recipient@example.com"
                change={(e: any) => handleConfigChange('toEmail', e.value)}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Subject</label>
              <TextBoxComponent
                value={settings.subject || ''}
                placeholder="Email subject"
                change={(e: any) => handleConfigChange('subject', e.value)}
                cssClass="config-input"
              />
            </div>
          </>
        )}
      </>
    );
  };

  /**
   * Renders form-specific configuration options
   */
  const renderFormConfig = () => {
    return (
      <div className="config-section">
        <label className="config-label">Form Fields</label>
        <p className="config-description">Configure form fields and validation rules.</p>
        <ButtonComponent
          content="Add Field"
          iconCss="e-icons e-plus"
          cssClass="add-field-btn"
        />
      </div>
    );
  };

  /**
   * Renders sticky note-specific configuration options
   */
  const renderStickyConfig = () => {
    if (!selectedNode) return null;
    const settings = selectedNode.settings.general || {};

    return (
      <div className="config-section">
        <label className="config-label">Sticky Note Color</label>
        <div className="color-picker-container">
          <input
            type="color"
            value={settings.color || '#fff59d'}
            onChange={(e) => handleConfigChange('color', e.target.value)}
            className="color-picker"
          />
        </div>
      </div>
    );
  };

  /**
   * Renders the Authentication tab content
   */
  const renderAuthenticationTab = () => {
    if (!selectedNode) return null;

    return (
      <div className="config-tab-content">
        <div className="config-section">
          <label className="config-label">Authentication Type</label>
          <select
            value={selectedNode.settings.authentication?.type || 'none'}
            onChange={(e) => handleConfigChange('type', e.target.value, 'authentication')}
            className="config-select"
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="oauth">OAuth 2.0</option>
            <option value="api-key">API Key</option>
          </select>
        </div>

        {selectedNode.settings.authentication?.type === 'basic' && (
          <>
            <div className="config-section">
              <label className="config-label">Username</label>
              <TextBoxComponent
                value={selectedNode.settings.authentication.username || ''}
                change={(e: any) => handleConfigChange('username', e.value, 'authentication')}
                cssClass="config-input"
              />
            </div>
            <div className="config-section">
              <label className="config-label">Password</label>
              <TextBoxComponent
                type="password"
                value={selectedNode.settings.authentication.password || ''}
                change={(e: any) => handleConfigChange('password', e.value, 'authentication')}
                cssClass="config-input"
              />
            </div>
          </>
        )}

        {selectedNode.settings.authentication?.type === 'bearer' && (
          <div className="config-section">
            <label className="config-label">Bearer Token</label>
            <TextBoxComponent
              type="password"
              value={selectedNode.settings.authentication.token || ''}
              change={(e: any) => handleConfigChange('token', e.value, 'authentication')}
              cssClass="config-input"
            />
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the Advanced tab content with advanced configuration options
   */
  const renderAdvancedTab = () => {
    if (!selectedNode) return null;

    return (
      <div className="config-tab-content">
        <div className="config-section">
          <label className="config-label">Timeout (seconds)</label>
          <TextBoxComponent
            type="number"
            value={selectedNode.settings.advanced?.timeout || '30'}
            change={(e: any) => handleConfigChange('timeout', parseInt(e.value), 'advanced')}
            cssClass="config-input"
          />
        </div>

        <div className="config-section">
          <label className="config-label">Retry Attempts</label>
          <TextBoxComponent
            type="number"
            value={selectedNode.settings.advanced?.retryAttempts || '3'}
            change={(e: any) => handleConfigChange('retryAttempts', parseInt(e.value), 'advanced')}
            cssClass="config-input"
          />
        </div>

        <div className="config-section">
          <div className="config-row">
            <label className="config-label">Continue on Error</label>
            <CheckBoxComponent
              checked={selectedNode.settings.advanced?.continueOnError || false}
              change={(e: any) => handleConfigChange('continueOnError', e.checked, 'advanced')}
              cssClass="config-checkbox"
            />
          </div>
        </div>

        <div className="config-section">
          <label className="config-label">Custom Headers (JSON)</label>
          <TextBoxComponent
            value={selectedNode.settings.advanced?.customHeaders || ''}
            placeholder='{"Content-Type": "application/json"}'
            change={(e: any) => handleConfigChange('customHeaders', e.value, 'advanced')}
            cssClass="config-textarea"
            multiline={true}
          />
        </div>
      </div>
    );
  };

  // Render the EJ2 Sidebar component for the configuration panel
  return (
    <SidebarComponent
      id="config-panel-sidebar"
      className={`custom-config-panel`}
      width={isMaximized ? "80%" : "400px"} // Dynamic width based on maximized state
      position="Right"
      type="Over"
      isOpen={isOpen}
      close={onClose}
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
          <div className="config-panel-header">
            <div className="config-panel-title">
              <span className="node-icon">{selectedNode?.icon}</span>
              <h3>{selectedNode?.name || 'Node'} Configuration</h3>
            </div>
            <div className="config-panel-actions">
              <ButtonComponent
                cssClass="maximize-btn"
                iconCss={`e-icons ${isMaximized ? 'e-zoom-to-fit' : 'e-zoom-to-fit'}`}
                onClick={toggleMaximize}
                title={isMaximized ? 'Minimize' : 'Maximize'}
              />
              <ButtonComponent
                cssClass="close-btn"
                iconCss="e-icons e-close"
                onClick={onClose}
              />
            </div>
          </div>

          <div className="config-panel-content">
            <TabComponent
              id="config-tab"
              selectedItem={activeTab}
              selecting={(e: any) => setActiveTab(e.selectedIndex)}
              cssClass="config-tabs"
            >
              <TabItemsDirective>
                <TabItemDirective header={{ text: 'General' }} content={renderGeneralTab}>
                </TabItemDirective>
                <TabItemDirective header={{ text: 'Authentication' }} content={renderAuthenticationTab}>
                </TabItemDirective>
                <TabItemDirective header={{ text: 'Advanced' }} content={renderAdvancedTab}>
                </TabItemDirective>
              </TabItemsDirective>
            </TabComponent>
          </div>
        </>
      )}
    </SidebarComponent>
  );
};

export default ConfigPanel;