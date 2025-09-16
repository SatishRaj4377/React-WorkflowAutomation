export interface WebhookConfig {
  name: string;
  description?: string;
  nodeId: string;
}

export interface Webhook {
  id: string;
  url: string;
  config: WebhookConfig;
  createdAt: string;
  lastTrigger?: {
    timestamp: string;
    payload: any;
  };
}

export interface NodeConfig {
  id: string;
  displayName: string;
  nodeType: NodeType;
  category: NodeCategories
  icon?: string;
  settings: {
    general: any;
    authentication?: any;
    advanced?: any;
  };
  webhook?: Webhook;
}

export interface WorkflowData {
  metadata: {
    id: string;
    name: string;
    created: Date;
    modified: Date;
    version: number;
  };
  diagramString: string; // Serialized diagram string from saveDiagram()
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
  icon?: React.ElementType;
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
  enableSnapping: boolean;
  showOverview: boolean;
}

export interface StickyNotePosition {
  x: number;
  y: number;
  fromMouse?: boolean; 
}

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