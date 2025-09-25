// INTERFACES
export interface NodeConfig {
  id: string;
  displayName: string;
  nodeType: NodeType;
  category: NodeCategories;
  icon?: string;
  settings: {
    general: any;
    authentication?: any;
    advanced?: any;
  };
  status?: NodeStatus; // Added for execution tracking
  executionTime?: {
    start?: Date;
    end?: Date;
  };
}

export interface WorkflowData {
  metadata: {
    id: string;
    name: string;
    created: Date;
    modified: Date;
    version: number;
  };
  diagramString: string;
}

export interface ProjectData {
  id: string;
  name: string;
  lastModified: Date;
  thumbnail?: string;
  workflowData: WorkflowData;
  isBookmarked?: boolean;
  diagramSettings?: DiagramSettings;
}

export interface PaletteCategory {
  name: PaletteCategoryLabels;
  nodes: NodeTemplate[];
  collapsed: boolean;
}

export interface NodeTemplate {
  id: string;
  name: string;
  iconId?: string;
  nodeType: NodeType;
  category: NodeCategories;
  description: string;
}

export interface ThemeContext {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface AppState {
  currentView: 'home' | 'editor';
  currentProject: ProjectData | null;
  projects: ProjectData[];
  selectedNode: string | null;
  sidebarOpen: boolean;
  configPanelOpen: boolean;
}

export interface DiagramSettings {
  gridStyle: GridStyle;
  snapping: SnappingSettings;
  connectorType: ConnectorType;
  connectorCornerRadius: number;
  showOverview: boolean;
  showOverviewAlways: boolean; 
}

export interface StickyNotePosition {
  x: number;
  y: number;
  fromMouse?: boolean; 
}

export interface ToastMessage {
  id: string;
  title: string;
  content: string;
  type: ToastType;
  duration?: number;
}

// Workflow Execution Context
export interface ExecutionContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  lastError?: string;
}

// Node Execution Result
export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Workflow Execution Status
export interface WorkflowExecutionStatus {
  isExecuting: boolean;
  currentNodeId?: string;
  error?: string;
  executionPath: string[];
}

// Workflow Execution Options
export interface WorkflowExecutionOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  enableDebug?: boolean;
}

// TYPES
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

export type PortSide = 'Right' | 'Bottom';

export type NodeCategories = 'trigger' | 'action' | 'sticky' | 'condition';

export type PaletteCategoryLabels = 'Triggers' | 'Core' | 'Flow';

export type GridStyle = 'lines' | 'dotted' | 'none';

export type ConnectorType = 'Bezier' | 'Orthogonal' | 'Straight';

export type NodeType = 
  | 'Webhook'
  | 'Schedule'
  | 'Manual Click'
  | 'Chat'
  | 'AI Agent'
  | 'Azure Chat Model'
  | 'HTTP Request'
  | 'Gmail'
  | 'Google Sheets'
  | 'Telegram'
  | 'Google Calendar'
  | 'Google Docs'
  | 'Twilio'
  | 'If Condition'
  | 'Switch Case'
  | 'Filter'
;

export type Variable = {
  /** short key displayed prominently e.g., "subject" */
  key: string;
  /** fully qualified path to insert, e.g., "gmail_1.subject" */
  path: string;
  /** quick preview of the value from last execution */
  preview?: string;
  /** primitive or structured type hint */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'any';
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
