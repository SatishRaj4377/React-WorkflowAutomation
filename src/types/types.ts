export type ToolbarAction = 'addNode' | 'execute' | 'cancel' | 'fitToPage' | 'zoomIn' | 'zoomOut' | 'resetZoom' | 'addSticky' | 'togglePan';

export type NodeToolbarAction = 'edit' | 'delete';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type SnappingSettings = { isEnabled: boolean, enableSnapToObjects: boolean, enableSnapToGrid: boolean }

export type NodePortDirection =
  | 'right'
  | 'right-top'
  | 'right-bottom'
  | 'bottom-middle'
  | 'bottom-left'
  | 'bottom-right';

export type NodeDimensions = {
  WIDTH: number;
  HEIGHT: number;
  MIN_WIDTH?: number;
  MIN_HEIGHT?: number;
};

export type PortSide = 'Right' | 'Bottom';

export type NodeCategories = 'trigger' | 'action' | 'sticky' | 'condition' | 'ai-agent' | 'tool';

export type PaletteCategoryLabel = 'Triggers' | 'Core' | 'Flow' | 'Tools';

export type GridStyle = 'lines' | 'dotted' | 'none';

export type ConnectorType = 'Bezier' | 'Orthogonal' | 'Straight';

export type NodeType = 
  | 'Webhook'
  | 'Schedule'
  | 'Manual Click'
  | 'Chat'
  | 'AI Agent'
  | 'HTTP Request'
  | 'EmailJS'
  | 'Gmail'
  | 'Google Sheets'
  | 'Telegram'
  | 'Google Calendar'
  | 'Google Docs'
  | 'Twilio'
  | 'If Condition'
  | 'Switch Case'
  | 'Filter'
  | 'Azure Chat Model Tool'
  | 'EmailJS Tool'
  | 'Gmail Tool'
  | 'Google Sheets Tool'
  | 'Google Calendar Tool'
  | 'Google Docs Tool'
  | 'HTTP Request Tool'
;

export type Variable = {
  key: string; /** short key displayed prominently e.g., "subject" */
  path: string; /** fully qualified path to insert, e.g., "gmail_1.subject" */
  preview?: string; /** quick preview of the value from last execution */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'any'; /** primitive or structured type hint */
};

export type VariableGroup = {
  nodeId: string;
  nodeName: string;       // "Gmail 1" or "Webhook"
  nodeType: string;       // "Gmail" | "Google Sheets" | "Webhook" ...
  variables: Variable[];
};

export type VariablesProvider = (context?: {
  activeNodeId?: string | null;
}) => Promise<VariableGroup[]>;

// Node Status for workflow execution
export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export type EmailJSVariableType = Array<{ key: string; value: string }>;