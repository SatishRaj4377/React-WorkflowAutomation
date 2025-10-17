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

export type DeleteDimParams = {
  spreadsheetId: string;
  sheetTitle: string;
  type: 'Row' | 'Column';
  startIndex: number;     // 1-based from UI
  count: number;          // >= 1
  columnLetter?: string;  // when type === 'Column', preferred input from UI
  accessToken: string;
};

export type IfJoiner = 'AND' | 'OR';

export type IfComparator =
  // generic equality / string
  | 'is equal to' | 'is not equal to'
  | 'contains' | 'does not contain' | 'starts with' | 'ends with' | 'matches regex'
  // number
  | 'greater than' | 'greater than or equal to' | 'less than' | 'less than or equal to'
  | 'is between' | 'is not between'
  // boolean
  | 'is true' | 'is false'
  // date
  | 'before' | 'after' | 'on or before' | 'on or after'
  // existence / emptiness (cross-kind)
  | 'exists' | 'does not exist' | 'is empty' | 'is not empty'
  // array/object
  | 'contains value' | 'length greater than' | 'length less than'
  | 'has key' | 'has property';

export type IfValueKind = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface IfRow {
  left: string;                 // Variable or literal; supports {{ }} and bare "$." expressions
  comparator: IfComparator;     // Operator picked from grouped list
  right: string;                // Variable/literal; may be unused for unary ops
  joiner?: IfJoiner;            // AND/OR from the second row onward (combines with previous)
}

export interface IfNodeOutput {
  conditionResult: boolean;     // final boolean outcome
  rowResults: boolean[];        // per-row outcomes (useful for debug/UX)
}