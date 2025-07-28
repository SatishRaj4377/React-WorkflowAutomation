export interface NodeConfig {
  id: string;
  type: 'trigger' | 'action' | 'sticky' | 'form' | 'condition';
  name: string;
  icon: string;
  settings: {
    general: any;
    authentication?: any;
    advanced?: any;
  };
  disabled: boolean;
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
}

export interface PaletteCategory {
  name: 'Triggers' | 'Core' | 'Flow' | 'Custom';
  nodes: NodeTemplate[];
  collapsed: boolean;
}

export interface NodeTemplate {
  id: string;
  name: string;
  icon: string;
  type: 'trigger' | 'action' | 'sticky' | 'form';
  iconUrl?: string;
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