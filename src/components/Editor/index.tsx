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
import { NodeConstraints, PortVisibility } from '@syncfusion/ej2-react-diagrams';
import './Editor.css';

interface EditorProps {
  project: ProjectData;
  onSaveProject: (project: ProjectData) => void;
  onBackToHome: () => void;
}

const Editor: React.FC<EditorProps> = ({
  project,
  onSaveProject,
  onBackToHome,
}) => {
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
      setSelectedNode(null);
    }
    
    // Transform node configs to diagram nodes
    if (project.workflowData.nodeConfigs) {
      const nodes = Object.values(project.workflowData.nodeConfigs).map(nodeConfig => {
        return {
          id: nodeConfig.id,
          width: 80,
          height: 80,
          offsetX: nodeConfig.position.x,
          offsetY: nodeConfig.position.y,
          constraints: (NodeConstraints.Default & ~NodeConstraints.Rotate & ~NodeConstraints.Resize & ~NodeConstraints.InConnect & ~NodeConstraints.OutConnect) | NodeConstraints.HideThumbs,
          annotations: [
            {
              id: `${nodeConfig.id}-label`,
              content: nodeConfig.name,
              style: { color: 'Black', fontWeight: 'bold', textWrapping: 'NoWrap' },
              offset: { x: 0.5, y: 1 },
              margin: { top: 15 },
            }
          ],
          shape: { type: 'Flow', shape: nodeConfig.type === 'trigger' ? 'Terminator' : 'Process' },
          style: {
            fill: nodeConfig.type === 'trigger' 
              ? 'linear-gradient(45deg, #2563eb, #1d4ed8)'
              : 'linear-gradient(45deg, #3b82f6, #1e40af)',
            strokeColor: nodeConfig.type === 'trigger' ? '#1d4ed8' : '#1e40af',
            strokeWidth: 2,
          },
          ports: [
            {
              offset: { x: 0, y: 0.5 },
              shape: 'Circle',
              height: 12,
              width: 12,
              visibility: PortVisibility.Visible,
            },
            {
              offset: { x: 1, y: 0.5 },
              shape: 'Circle',
              height: 12,
              width: 12,
              visibility: PortVisibility.Visible,
            }
          ],
          addInfo: { nodeConfig }
        };
      });
      
      setDiagramNodes(nodes);
      
      // We would need to handle connectors here as well if they're part of the data
      // This is just a placeholder
      setDiagramConnectors([]);
    }
  }, [project.workflowData.nodeConfigs]);

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

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
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
            onNodeSelect={handleNodeSelect}
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