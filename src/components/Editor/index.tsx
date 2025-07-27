import React, { useState, useEffect } from 'react';
import AppBar from '../Header';
import DiagramEditor from '../DiagramEditor';
import Toolbar from '../Toolbar';
import Toast, { showSuccessToast, showErrorToast } from '../Toast';
import NodePaletteSidebar from '../NodePaletteSidebar';
import NodeConfigSidebar from '../NodeConfigSidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { ProjectData, NodeConfig, NodeTemplate } from '../../types';
import WorkflowService from '../../services/WorkflowService';
import './Editor.css';

interface EditorProps {
  project: ProjectData;
  onSaveProject: (project: ProjectData) => void;
  onBackToHome: () => void;
}

const Editor: React.FC<EditorProps> = ({project, onSaveProject, onBackToHome, }) => {
  const { theme, toggleTheme } = useTheme();
  const [nodePaletteSidebarOpen, setNodePaletteSidebarOpen] = useState(true);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeConfig | null>(null);
  const [diagramNodes, setDiagramNodes] = useState<any[]>([]);
  const [diagramConnectors, setDiagramConnectors] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [projectName, setProjectName] = useState(project.name);

  useEffect(() => {
    // Update selected node data when ID changes
    if (selectedNodeId && project.workflowData.nodeConfigs[selectedNodeId]) {
      setSelectedNode(project.workflowData.nodeConfigs[selectedNodeId]);
      setConfigPanelOpen(true);
    } else {
      setConfigPanelOpen(false);
      setSelectedNode(null);
    }
    
    // Transform node configs to diagram nodes
    if (project.workflowData.nodeConfigs) {
      const nodes = Object.values(project.workflowData.nodeConfigs).map(nodeConfig => {
        return {
          id: nodeConfig.id,
          addInfo: { nodeConfig }
        };
      });
      
      setDiagramNodes(nodes);
      
      // We would need to handle connectors here as well if they're part of the data
      // This is just a placeholder
      setDiagramConnectors([]);
    }
  }, [selectedNodeId, project.workflowData.nodeConfigs]);

  const handleSave = () => {
    try {
      const updatedProject = WorkflowService.saveProject({
        ...project,
        name: projectName,
      });
      onSaveProject(updatedProject);
      showSuccessToast('Workflow Saved', 'Your workflow has been saved successfully.');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showErrorToast('Save Failed', 'There was an error saving your workflow.');
    }
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setConfigPanelOpen(true);
  };

  const handleNodeConfigChange = (nodeId: string, config: NodeConfig) => {
    setSelectedNode(config);
    
    // Update node configuration in the project
    const updatedProject = {
      ...project,
      workflowData: {
        ...project.workflowData,
        nodeConfigs: {
          ...project.workflowData.nodeConfigs,
          [nodeId]: config
        }
      }
    };
    
    onSaveProject(updatedProject);
  };

  const handleExecuteWorkflow = () => {
    setIsExecuting(true);
    
    // Simulate workflow execution
    setTimeout(() => {
      setIsExecuting(false);
      showSuccessToast('Workflow Executed', 'Your workflow has completed successfully.');
    }, 3000);
  };

  const handleCancelExecution = () => {
    setIsExecuting(false);
    showErrorToast('Execution Cancelled', 'Workflow execution has been cancelled.');
  };

  const handleAddNode = (nodeTemplate: NodeTemplate, position: { x: number; y: number }) => {
    const nodeId = `${nodeTemplate.id}-${Date.now()}`;
    
    // Create new node configuration
    const newNodeConfig: NodeConfig = {
      id: nodeId,
      type: nodeTemplate.type,
      name: nodeTemplate.name,
      icon: nodeTemplate.icon,
      settings: {
        general: {},
        authentication: {},
        advanced: {}
      },
      disabled: false,
      position: position
    };
    
    // Update node configurations in the project
    const updatedProject = {
      ...project,
      workflowData: {
        ...project.workflowData,
        nodeConfigs: {
          ...project.workflowData.nodeConfigs,
          [nodeId]: newNodeConfig
        }
      }
    };
    
    onSaveProject(updatedProject);
    
    // Select the new node
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="editor-container" data-theme={theme}>
      <AppBar
        projectName={projectName}
        onBack={onBackToHome}
        onSave={handleSave}
        onProjectNameChange={setProjectName}
        onThemeToggle={toggleTheme}
        showBackButton={true}
      />
      
      <div className="editor-content">
        {/* Left Sidebar for Node Palette */}
        <NodePaletteSidebar 
          isOpen={nodePaletteSidebarOpen}
          onClose={() => setNodePaletteSidebarOpen(false)}
          onNodeDrag={handleAddNode}
        />
        
        {/* Right Sidebar for Configuration */}
        <NodeConfigSidebar 
          isOpen={configPanelOpen}
          onClose={() => setConfigPanelOpen(false)}
          selectedNode={selectedNode}
          onNodeConfigChange={handleNodeConfigChange}
        />
        
        {/* Main Diagram Area */}
        <div className="diagram-container">
          <DiagramEditor 
            onAddNode={() => setNodePaletteSidebarOpen(true)}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodes={diagramNodes}
            connectors={diagramConnectors}
          />
        </div>
        
        {/* Floating Toolbar */}
        <div className="editor-toolbar">
          <Toolbar 
            onAddNode={() => setNodePaletteSidebarOpen(true)}
            onExecute={handleExecuteWorkflow}
            onCancel={handleCancelExecution}
            isExecuting={isExecuting}
          />
        </div>
      </div>
      
      <Toast position={{ X: 'Right', Y: 'Bottom' }} />
    </div>
  );
};

export default Editor;