import React, { useCallback, useEffect, useState } from 'react';
import {
  SidebarComponent,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-react-navigations';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { IconRegistry } from '../../assets/icons';
import { EmailJSVariableType, ExecutionContext, NodeConfig, NodeType } from '../../types';
import { getAvailableVariablesForNode, getNodeOutputAsVariableGroup } from '../../helper/variablePickerUtils';
import { Diagram } from '@syncfusion/ej2-diagrams';
import { VariablePickerTextBox } from './VariablePickerTextBox';
import { CopyableTextBox } from './CopyableTextBox';
import { buildJsonFromVariables } from '../../helper/variablePickerUtils';
import JsonVisualizer from './JsonVisualizer';
import { AUTH_NODE_TYPES, TIMEZONES } from '../../constants';
import './NodeConfigSidebar.css';
import GoogleAuthPanel from './GoogleAuthPanel';
import { updateSwitchPorts } from '../../helper/utilities/portUtils';
import GoogleSheetsNodeConfig from './GoogleSheetsNodeConfig';
import { getScopesForNode } from '../../helper/googleScopes';
import { GoogleAuth } from '../../helper/googleAuthClient';
import GmailNodeConfig from './GmailNodeConfig';
import ConditionNodeConfig from './ConditionNodeConfig';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: NodeConfig | null;
  diagram: Diagram | null;
  executionContext: ExecutionContext;
  onDeleteNode: (nodeId: string) => void;
  onNodeConfigChange: (nodeId: string, config: NodeConfig) => void;
  isChatOpen: boolean;
  setChatOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const NodeConfigSidebar: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  onDeleteNode,
  selectedNode,
  diagram,
  executionContext,
  onNodeConfigChange,
  isChatOpen,
  setChatOpen,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [availableVariables, setAvailableVariables] = useState<any[]>([]);
  const [nodeOutput, setNodeOutput] = useState<any>(null);
  const [variablesLoading, setVariablesLoading] = useState(true);

  const nodeIconSrc = selectedNode?.icon ? IconRegistry[selectedNode.icon] : null;
  const MessageIcon = IconRegistry['Message'];

  // Returns true if token for nodeType is cached OR if auth flags indicate a connection.
  // This lets Sheets work even when no Gmail email is available.
  const isGoogleConnectedFor = (nodeType: string, auth: any): boolean => {
    try {
      const scopes = getScopesForNode(nodeType);                // read union for this node
      const cached = GoogleAuth.getTokenCached(scopes);         // use cached token if present
      if (cached) return true;
    } catch { /* ignore */ }
    // Fall back to flags you already store in authentication
    if (nodeType === 'Gmail') return !!auth?.googleAccountEmail;
    if (nodeType === 'Google Sheets') return !!auth?.googleSheetsConnected || !!auth?.googleAccountEmail;
    return false;
  };

  // Fetch available variables and node output whenever the selected node or diagram changes.
  useEffect(() => {
    // Define an async function to fetch both available variables and node output
    const fetchData = async () => {
      // If there's no selected node or diagram, reset the state and stop loading
      if (!selectedNode || !diagram) {
        setAvailableVariables([]);
        setNodeOutput(null);
        setVariablesLoading(false);
        return;
      }

      // Start loading
      setVariablesLoading(true);

      // Fetch available variables for the selected node
      const vars = await getAvailableVariablesForNode(
        selectedNode.id,
        diagram,
        executionContext
      );

      // Get the output of the selected node
      const output = getNodeOutputAsVariableGroup(
        selectedNode.id,
        diagram,
        executionContext
      );

      // Update state with fetched data
      setAvailableVariables(vars);
      setNodeOutput(output);

      // Stop loading
      setVariablesLoading(false);
    };

    // Call the async function
    fetchData();

    // Initialize/Sync dynamic ports for Switch Case nodes when opening.
    // Only update if desired count differs from existing, to avoid height jump on open.
    if (selectedNode && diagram && selectedNode.nodeType === 'Switch Case') {
      const general = (selectedNode?.settings?.general as any) ?? {};
      const rules = general?.rules as any[] | undefined;
      const desired = Math.max(1, rules?.length ?? 1);
      const node: any = (diagram as any).getObject(selectedNode.id);
      const enableDefault = !!general?.enableDefaultPort;
      const existing = (node?.addInfo?.dynamicCaseCount)
        ?? (Array.isArray(node?.ports) ? node.ports.filter((p: any) => String(p.id).startsWith('right-case-')).length : 0)
        ?? 0;
      if (existing !== desired) {
        updateSwitchPorts(diagram as any, selectedNode.id, desired, enableDefault);
      }
    }
  }, [selectedNode?.id, diagram, executionContext]);

  /** Safely update settings */
  const handleConfigChange = (
    fieldOrPatch: string | Record<string, any>,
    value?: any,
    section: 'general' | 'authentication' | 'advanced' = 'general'
  ) => {
    if (!selectedNode) return;
    const prevSection = (selectedNode.settings && (selectedNode.settings as any)[section]) ?? {};

    const nextSection =
      typeof fieldOrPatch === 'object' && fieldOrPatch !== null
        ? { ...prevSection, ...fieldOrPatch }
        : { ...prevSection, [fieldOrPatch]: value };

    // make sure the editor only calls onNodeConfigChange when something actually changes
    let same = true;
    for (const k of Object.keys(nextSection)) {
      if (prevSection[k] !== nextSection[k]) { same = false; break; }
    }
    if (same) return;


    const updatedConfig: NodeConfig = {
      ...selectedNode,
      settings: {
        ...selectedNode.settings,
        [section]: nextSection,
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
              <CopyableTextBox
                value={settings.url ?? webhookUrl}
                cssClass="config-input"
                readonly={true}
              />
            </div>
          </>
        );

      case 'Schedule':
        return (
          <>
            <div className="config-section">
              <div className="config-row">
                <label className="config-label">Cron Expression</label>
                <TooltipComponent content="e.g., */5 * * * * for every 5 minutes">
                  <span className='e-icons e-circle-info help-icon'></span>
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


      case 'Chat': {
        const promptSuggestions: string[] = settings.promptSuggestions ?? [];
        const header: string = settings.promptSuggestionsHeader ?? '';

        const addSuggestion = () => {
          const next = [...promptSuggestions, ''];
          handleConfigChange({ promptSuggestions: next }); // general
        };

        const updateSuggestion = (i: number, val: string) => {
          const next = promptSuggestions.slice();
          next[i] = val;
          handleConfigChange({ promptSuggestions: next });
        };

        const removeSuggestion = (i: number) => {
          const next = promptSuggestions.filter((_, idx) => idx !== i);
          handleConfigChange({ promptSuggestions: next });
        };

        return (
          <>
            {/* --- Show/Hide Chat Button --- */}
            <div className="config-section">
              <ButtonComponent
                onClick={() => setChatOpen(prev => !prev)}
                className='show-chat-button'
              >
                <MessageIcon className='msg-svg-icon'/>
                <span className='show-chat-btn-text'>
                  {isChatOpen ? 'Hide Chat' : ' Open Chat'}
                </span>
              </ButtonComponent>
            </div>

            {/* --- Prompt suggestions --- */}
            <div className="config-section">
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Prompt suggestions (optional)</label>
                <TooltipComponent content="Add quick prompts that appear in the chat popup. Click a suggestion to auto-fill and send.">
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>

              {(promptSuggestions ?? []).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  {/* Use your VariablePickerTextBox to allow {{variables}} if needed */}
                  <VariablePickerTextBox
                    value={s}
                    onChange={(val) => updateSuggestion(i, val)}
                    placeholder="Type a suggestion…"
                    cssClass="config-input"
                    variableGroups={availableVariables}
                    variablesLoading={variablesLoading}
                  />
                  <ButtonComponent
                    cssClass="flat-btn e-flat"
                    iconCss="e-icons e-trash"
                    onClick={() => removeSuggestion(i)}
                    title="Remove"
                  />
                </div>
              ))}

              <ButtonComponent style={{border: '.1rem solid var(--scrollbar-thumb)', opacity: .8, color: 'var(--text-secondary)'}} className="e-flat add-field-btn" iconCss="e-icons e-plus" onClick={addSuggestion}>
                Add suggestion
              </ButtonComponent>
            </div>
          </>
        );
      }


      case 'AI Agent':
        return (
          <>
            <div className="config-section">
              <label className="config-label">Prompt</label>
              <VariablePickerTextBox
                value={settings.prompt ?? ''}
                onChange={(val) => handleConfigChange('prompt', val)}
                cssClass="config-input"
                placeholder='Eg: Hello, how can you help me?'
                variableGroups={availableVariables}
                variablesLoading={variablesLoading}
              />
            </div>
            <div className="config-section">
              <label className="config-label">System Message</label>
              <VariablePickerTextBox
                value={settings.systemMessage ?? ''}
                placeholder="Define the agent's objective"
                onChange={(val) => handleConfigChange('systemMessage', val)}
                cssClass="config-textarea"
                multiline
                variableGroups={availableVariables}
                variablesLoading={variablesLoading}
              />
            </div>
          </>
        );

      case 'HTTP Request':
      case 'HTTP Request Tool': {
        // Ensure defaults for GET-only implementation
        const method = 'GET';
        const queryParams: Array<{ key: string; value: string }> =
          Array.isArray(settings.queryParams) && settings.queryParams.length
            ? settings.queryParams
            : [{ key: '', value: '' }];

        const addQueryParam = () => {
          const next = [...queryParams, { key: '', value: '' }];
          handleConfigChange({ queryParams: next, method });
        };
        const updateQueryParam = (i: number, field: 'key' | 'value', val: string) => {
          const next = queryParams.slice();
          next[i] = { ...next[i], [field]: val };
          handleConfigChange({ queryParams: next, method });
        };
        const removeQueryParam = (i: number) => {
          const next = queryParams.filter((_, idx) => idx !== i);
          handleConfigChange({ queryParams: next.length ? next : [{ key: '', value: '' }], method });
        };

        return (
          <>
            <div className="config-section">
              <label className="config-label">URL</label>
              <VariablePickerTextBox
                value={settings.url ?? ''}
                placeholder="https://api.example.com/resource"
                onChange={(val) => handleConfigChange('url', val)}
                cssClass="config-input"
                variableGroups={availableVariables}
                variablesLoading={variablesLoading}
              />
            </div>

            <div className="config-section">
              <label className="config-label">Method</label>
              <DropDownListComponent
                value={method}
                dataSource={["GET"]}
                placeholder="GET"
                enabled={false}
                popupHeight="200px"
                zIndex={1000000}
              />
            </div>

            <div className="config-section">
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Query Parameters</label>
                <TooltipComponent content="Add query params as name/value pairs. Values support variables using the picker.">
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>

              {queryParams.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  {/* Name */}
                  <VariablePickerTextBox
                    value={row.key}
                    placeholder="name"
                    onChange={(val) => updateQueryParam(i, 'key', val)}
                    cssClass="config-input"
                    variableGroups={availableVariables}
                    variablesLoading={variablesLoading}
                  />

                  {/* Value */}
                  <VariablePickerTextBox
                    value={row.value}
                    placeholder="value"
                    onChange={(val) => updateQueryParam(i, 'value', val)}
                    cssClass="config-input"
                    variableGroups={availableVariables}
                    variablesLoading={variablesLoading}
                  />

                  <ButtonComponent
                    cssClass="flat-btn e-flat"
                    iconCss="e-icons e-trash"
                    onClick={() => removeQueryParam(i)}
                    title="Remove"
                  />
                </div>
              ))}

              <ButtonComponent className="add-field-btn" iconCss="e-icons e-plus" onClick={addQueryParam}>
                Add Query
              </ButtonComponent>
            </div>

            <div className="config-section">
              <label className="config-label">Headers (JSON)</label>
              <TextBoxComponent
                value={settings.headers ?? ''}
                placeholder='{"Authorization":"Bearer {{token}}"}'
                change={(e: any) => handleConfigChange('headers', e.value)}
                cssClass="config-textarea"
                multiline
              />
            </div>
          </>
        );
      }

      case 'EmailJS': 
      case 'EmailJS Tool': {
        const keyValues = (settings.emailjsVars ?? [{ key: '', value: '' }]) as EmailJSVariableType;

        const addVariable = () => {
          handleConfigChange('emailjsVars', [...keyValues, { key: '', value: '' }]);
        };
        const updateVariable = (i: number, field: 'key' | 'value', val: string) => {
          const next = keyValues.slice();
          next[i] = { ...next[i], [field]: val };
          handleConfigChange('emailjsVars', next);
        };
        const removeVariable = (i: number) => {
          const next = keyValues.filter((_, idx) => idx !== i);
          handleConfigChange('emailjsVars', next);
        };

        return (
          <>
            <div className="config-section">
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Template Variables</label>
                <TooltipComponent
                  content={
                    'Add key–value pairs where the key exactly matches your EmailJS template placeholder (e.g., {{name}}, {{user_email}}). ' +
                    'See EmailJS docs for more info.'
                  }
                >
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>

              {keyValues.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                  {/* Variable name (must match {{...}} in EmailJS template) */}
                  <TextBoxComponent
                    value={row.key}
                    width={'50%'}
                    placeholder="Variable Name"
                    change={(e: any) => updateVariable(i, 'key', e.value)}
                    cssClass="config-input"
                  />

                  {/* Variable value */}
                  <VariablePickerTextBox
                    value={row.value ?? ''}
                    placeholder="Value"
                    onChange={(val) => updateVariable(i, 'value', val)}
                    cssClass="config-input"
                    variableGroups={availableVariables}
                    variablesLoading={variablesLoading}
                  />

                  {/* Remove row */}
                  <ButtonComponent 
                    cssClass="flat-btn e-flat"
                    iconCss="e-icons e-trash"
                    onClick={() => removeVariable(i)}
                    title="Remove variable"
                  />
                </div>
              ))}

              <ButtonComponent className="add-field-btn" iconCss="e-icons e-plus" onClick={addVariable}>
                Add Variable
              </ButtonComponent>

              <div className="textbox-info">
                <br></br>
                <b>Tip:</b> Variable names must match the placeholders defined in your EmailJS template (e.g., <code>{`{{name}}`}</code>).  
                You can map values from previous nodes using the picker.
              </div>
            </div>
          </>
        );
      }

      case 'Gmail':
      case 'Gmail Tool': {
        return (
          <GmailNodeConfig
            settings={settings}
            onPatch={(patch) => handleConfigChange(patch, undefined, 'general')}
            variableGroups={availableVariables}
            variablesLoading={variablesLoading}
          />
        );
      }

      case 'Google Sheets': 
      case 'Google Sheets Tool': {
        const auth = (selectedNode?.settings?.authentication as any) ?? {};
        const connected = isGoogleConnectedFor('Google Sheets', auth);

        return (
          <GoogleSheetsNodeConfig
            settings={settings}
            authEmail={connected ? (auth.googleAccountEmail || '__connected__') : ''} 
            onPatch={(patch) => handleConfigChange(patch, undefined, 'general')}
            variableGroups={availableVariables}
            variablesLoading={variablesLoading}
          />
        );
      }

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

        case 'If Condition': {
          const conditions = (settings.conditions ?? [
            { left: '', comparator: 'is equal to', right: '' },
          ]) as any[];

          return (
            <ConditionNodeConfig
              value={conditions}
              onChange={(next) => handleConfigChange('conditions', next)}
              variableGroups={availableVariables}
              variablesLoading={variablesLoading}
              label="Conditions"
            />
          );
        }

      case 'Switch Case': {
        const rules = (settings.rules ?? [{ left: '', comparator: 'is equal to', right: '' }]) as Array<{ left: string; comparator: string; right: string }>;

        // Map Switch rows <-> IfCondition rows (joiner is unused)
        const rows = rules.map(r => ({ left: r.left, comparator: r.comparator, right: r.right }));

        const onRowsChange = (nextRows: any[]) => {
          // Persist back as 'rules' (ignore joiners)
          handleConfigChange('rules', nextRows.map(r => ({ left: r.left ?? '', comparator: r.comparator, right: r.right ?? '' })));
          if (diagram && selectedNode) {
            const count = Math.max(1, nextRows.length);
            updateSwitchPorts(diagram as any, selectedNode.id, count);
          }
        };

        // Default port UI is currently disabled; keep logic minimal here.

        return (
          <>
            <ConditionNodeConfig
              value={rows as any}
              onChange={onRowsChange}
              variableGroups={availableVariables}
              variablesLoading={variablesLoading}
              label="Cases"
              showJoiners={false} // <-- hide AND/OR for Switch Case
            />

            {/* Enable default port */}
            {/* <div className="config-section" style={{ marginTop: 8 }}>
              <label className="config-label">Default Port</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={enableDefault}
                  onChange={(e) => onToggleDefault(e.currentTarget.checked)}
                  id="switch-default-port"
                />
                <label htmlFor="switch-default-port">Enable default port (executes if no case matches)</label>
              </div>
            </div> */}
          </>
        );
      }

      case 'Filter':{
        const conditions = (settings.conditions ?? [
          { left: '', comparator: 'is equal to', right: '' },
        ]) as any[];

        return (
          <>
            {/* Items (list) input expression */}
            <div className="config-section">
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Items (list) to filter</label>
                <TooltipComponent content="Select an array from previous nodes using the picker (e.g., $.NodeName#ID.rows). This defines $.item for conditions.">
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>
              <VariablePickerTextBox
                value={settings.input ?? ''}
                placeholder="$.previousNode.items"
                onChange={(val) => handleConfigChange('input', val)}
                cssClass="config-input"
                variableGroups={availableVariables}
                variablesLoading={variablesLoading}
              />
            </div>

            <ConditionNodeConfig
              value={conditions}
              onChange={(next) => handleConfigChange('conditions', next)}
              variableGroups={availableVariables}
              variablesLoading={variablesLoading}
              label="Conditions"
              // Make left operands item-relative using the Items expression
              leftMode={'itemField'}
              leftBaseListExpr={settings.input ?? ''}
            />
          </>
        );
      }

      case 'Loop': {
        return (
          <>
            <div className="config-section">
              <div className="config-row" style={{ alignItems: 'center', gap: 8 }}>
                <label className="config-label">Items (list) to iterate</label>
                <TooltipComponent content="Choose an array from previous nodes (e.g., $.Google_Sheets#123.rows). Each downstream node will run once per item as $.item.">
                  <span className="e-icons e-circle-info help-icon"></span>
                </TooltipComponent>
              </div>
              <VariablePickerTextBox
                value={settings.input ?? ''}
                placeholder="$.previousNode.items"
                onChange={(val) => handleConfigChange('input', val)}
                cssClass="config-input"
                variableGroups={availableVariables}
                variablesLoading={variablesLoading}
              />
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  /** General tab */
  const renderGeneralTab = useCallback(() => {
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
  }, [selectedNode, availableVariables, isChatOpen]);

  /** Output tab (shows when a node is executed) */
  const renderOutputTab = useCallback(() => {
    if (!nodeOutput) {
      return (
        <div className="config-tab-content">
          <div className="config-section-empty">
            <p>This node has not been executed yet or did not produce an output.</p>
            <p>Run the workflow to see the output here.</p>
          </div>
        </div>
      );
    }

    const outputJson = buildJsonFromVariables(nodeOutput.variables);

    return (
      <div className="config-tab-content">
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '.4rem',
            background: 'var(--surface-color)',
          }}
        >
          <JsonVisualizer data={outputJson} collapsed={false} />
        </div>
      </div>
    );
  }, [ nodeOutput ]);

  /** Authentication tab */
  const renderAuthenticationTab = useCallback(() => {
    if (!selectedNode) return <div></div>;

    const authSettings =(selectedNode?.settings && selectedNode.settings.authentication) || {};

    // Render Azure Chat Model node specific authentication fields
    switch (selectedNode.nodeType) {
        case 'Azure Chat Model Tool':
          return (
            <div className="config-tab-content">
              <div className="config-section">
                <label className="config-label">API Key</label>
                <TextBoxComponent
                  value={authSettings.azureApiKey ?? ''}
                  type='password'
                  change={(e: any) => handleConfigChange('azureApiKey', e.value, 'authentication')}
                  cssClass="config-input"
                  />
              </div>
              <div className="config-section">
                <label className="config-label">Endpoint</label>
                <TextBoxComponent
                  value={authSettings.azureEndpoint ?? ''}
                  change={(e: any) => handleConfigChange('azureEndpoint', e.value, 'authentication')}
                  cssClass="config-input"
                  />
              </div>
              <div className="config-section">
                  <div className="config-row">
                    <label className="config-label">Model (Deployment) Name</label>
                    <TooltipComponent content="The name of the model(deployment) to use (e.g., gpt-4, gpt-35-turbo)">
                      <span className='e-icons e-circle-info help-icon'></span>
                    </TooltipComponent>
                  </div>
                  <TextBoxComponent
                    value={authSettings.azureDeploymentName ?? ''}
                    change={(e: any) => handleConfigChange('azureDeploymentName', e.value, 'authentication')}
                    cssClass="config-input"
                  />
                </div>
            </div>
          );
        
        case 'EmailJS':
        case 'EmailJS Tool':
          return (
            <div className="config-tab-content">
              {/* Public Key */}
              <div className="config-section">
                <div className="config-row">
                  <label className="config-label">Public Key</label>
                  <TooltipComponent
                    content={'EmailJS Public Key (Account → Integration).'}
                  >
                    <span className="e-icons e-circle-info help-icon"></span>
                  </TooltipComponent>
                </div>
                <TextBoxComponent
                  value={authSettings.publicKey ?? ''}
                  placeholder="e.g., xxxxxxxxPUBLICxxxxxxxx"
                  change={(e: any) => handleConfigChange('publicKey', e.value, 'authentication')}
                  cssClass="config-input"
                />
              </div>

              {/* Service ID */}
              <div className="config-section">
                <div className="config-row">
                  <label className="config-label">Service ID</label>
                  <TooltipComponent
                    content={'EmailJS Service ID (from Services).'}
                  >
                    <span className="e-icons e-circle-info help-icon"></span>
                  </TooltipComponent>
                </div>
                <TextBoxComponent
                  value={authSettings.serviceId ?? ''}
                  placeholder="e.g., service_abc123"
                  change={(e: any) => handleConfigChange('serviceId', e.value, 'authentication')}
                  cssClass="config-input"
                />
              </div>

              {/* Template ID */}
              <div className="config-section">
                <div className="config-row">
                  <label className="config-label">Template ID</label>
                  <TooltipComponent
                    content={'EmailJS Template ID (from Templates).'}
                  >
                    <span className="e-icons e-circle-info help-icon"></span>
                  </TooltipComponent>
                </div>
                <TextBoxComponent
                  value={authSettings.templateId ?? ''}
                  placeholder="e.g., template_xyz789"
                  change={(e: any) => handleConfigChange('templateId', e.value, 'authentication')}
                  cssClass="config-input"
                />
              </div>
            </div>
          );


        case 'Gmail': 
        case 'Gmail Tool': {
          const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ?? '200986169390-on3tgm86r3i88mj8gil2o3li0gdvlcel.apps.googleusercontent.com';
          return (
            <div className="config-tab-content">
              <GoogleAuthPanel
                clientId={CLIENT_ID}
                nodeType="Gmail"
                onConnected={(email) => {
                  handleConfigChange('googleAccountEmail', email, 'authentication');
                }}
              />
            </div>
          );
        }

        case 'Google Sheets':
        case 'Google Sheets Tool': {
          const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ?? '200986169390-on3tgm86r3i88mj8gil2o3li0gdvlcel.apps.googleusercontent.com';
          return (
            <div className="config-tab-content">
              <GoogleAuthPanel
                clientId={CLIENT_ID}
                nodeType="Google Sheets"
                onConnected={(email) => {
                  handleConfigChange('googleSheetsConnected', true, 'authentication');
                  handleConfigChange('googleAccountEmail', email || '', 'authentication');
                }}
              />
            </div>
          );
        }

        default:
          // For all other auth-required nodes (e.g., Gmail, Telegram)
          const typeVal = authSettings.type ?? '';
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
                      value={authSettings.username ?? ''}
                      change={(e: any) => handleConfigChange('username', e.value, 'authentication')}
                      cssClass="config-input"
                    />
                  </div>
                  <div className="config-section">
                    <label className="config-label">Password</label>
                    <TextBoxComponent
                      type="password"
                      value={authSettings.password ?? ''}
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
                    value={authSettings.token ?? ''}
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
                      value={authSettings.account ?? ''}
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
                      value={authSettings.scopes ?? ''}
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
    }
  }, [selectedNode]);


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
                <TabItemDirective header={{ text: 'General' }} content={renderGeneralTab} />
                {requiresAuthTab && (
                  <TabItemDirective header={{ text: 'Authentication' }} content={renderAuthenticationTab} />
                )}
                {nodeOutput && (
                  <TabItemDirective header={{ text: 'Output' }} content={renderOutputTab} />
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
