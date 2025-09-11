export interface NodeConfig {
  id: string;
  type: 'trigger' | 'action' | 'sticky' | 'form' | 'condition';
  name: string;
  icon?: string;
  settings: {
    general: any;
    authentication?: any;
    advanced?: any;
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
  name: 'Triggers' | 'Core' | 'Flow';
  nodes: NodeTemplate[];
  collapsed: boolean;
}

export interface NodeTemplate {
  id: string;
  name: string;
  icon?: React.ElementType;
  iconId?: string;
  type: 'trigger' | 'action' | 'sticky' | 'form';
  category: string;
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
  gridStyle: 'lines' | 'dotted' | 'none';
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
