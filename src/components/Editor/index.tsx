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
import { NodeConstraints, NodeModel } from '@syncfusion/ej2-react-diagrams';

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
  const [isExecuting, setIsExecuting] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [diagramRef, setDiagramRef] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  useEffect(() => {
    // Handle selected node changes - will be managed by DiagramEditor
    if (selectedNodeId && diagramRef) {
      // Get node from diagram
      const nodes = diagramRef.nodes;
      const node = nodes.find((n: any) => n.id === selectedNodeId);
      if (node && node.addInfo && node.addInfo.nodeConfig) {
        setSelectedNode(node.addInfo.nodeConfig);
        setConfigPanelOpen(true);
      } else {
        setConfigPanelOpen(false);
        setSelectedNode(null);
      }
    } else {
      setConfigPanelOpen(false);
      setSelectedNode(null);
    }
  }, [selectedNodeId, diagramRef]);

  const handleSave = () => {
    try {
      if (diagramRef) {
        // Save diagram as string using EJ2's built-in method
        const diagramString = diagramRef.saveDiagram();
        
        const updatedProject = WorkflowService.saveProject({
          ...project,
          name: projectName,
          workflowData: {
            ...project.workflowData,
            diagramString: diagramString
          }
        });
        onSaveProject(updatedProject);
        setIsDirty(false);
        showSuccessToast('Workflow Saved', 'Your workflow has been saved successfully.');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showErrorToast('Save Failed', 'There was an error saving your workflow.');
    }
  };

  const handleDiagramChange = () => {
    // Mark as dirty when diagram changes
    setIsDirty(true);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setConfigPanelOpen(true);
  };

  const handleNodeConfigChange = (nodeId: string, config: NodeConfig) => {
    setSelectedNode(config);
    
    // Update the node's addInfo in the diagram directly
    if (diagramRef) {
      const node = diagramRef.getObject(nodeId);
      if (node) {
        node.addInfo = { nodeConfig: config };
        diagramRef.dataBind();
        setIsDirty(true); // Mark as dirty when node config changes
      }
    }
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

  const handleAddNode = (nodeTemplate: NodeTemplate) => {
    const nodeId = `${nodeTemplate.id}-${Date.now()}`;
    
    // Create new node configuration
    const newNodeConfig: NodeConfig = {
      id: nodeId,
      type: nodeTemplate.type,
      name: nodeTemplate.name,
      icon: nodeTemplate.icon,
      iconUrl: nodeTemplate.iconUrl,
      settings: {
        general: {},
        authentication: {},
        advanced: {}
      },
      disabled: false
    };
    
    // Add node directly to diagram
    if (diagramRef) {
      const newNode = {
        id: nodeId,
        addInfo: { nodeConfig: newNodeConfig }
      };
      
      diagramRef.add(newNode);
      setSelectedNodeId(nodeId);
      setIsDirty(true); // Mark as dirty when adding node
    }
  };

  const handleDiagramRef = (ref: any) => {
    setDiagramRef(ref);
  };

  const handleBackToHome = () => {
    if (isDirty && !isNavigatingAway) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Do you want to save before leaving?'
      );
      
      if (shouldSave) {
        handleSave();
      }
    }
    setIsNavigatingAway(true);
    onBackToHome();
  };

  const handleAddStickyNote = (position: { x: number; y: number }) => {
    if (diagramRef) {
      // Validate position parameter
      if (!position || typeof position !== 'object' || 
          typeof position.x !== 'number' || typeof position.y !== 'number') {
        // Position the sticky note to center of the diagram
        position = { x: diagramRef.scrollSettings.viewPortWidth / 2 , y:  diagramRef.scrollSettings.viewPortHeight / 2 };
      }
      const timestamp = Date.now();
      const stickyNote: NodeModel = {
        id: `sticky-${timestamp}`,
        width: 240,
        height: 240,
        offsetX: position.x,
        offsetY: position.y - 64, // removing the header height
        zIndex: -10000,
        constraints: (NodeConstraints.Default & ~NodeConstraints.Rotate),
        addInfo: {
          nodeConfig: {
            id: `sticky-${timestamp}`,
            type: 'sticky',
            name: 'Sticky Note',
          } as NodeConfig
        }
      };
      diagramRef.add(stickyNote);
    }
  };

  const handleAutoAlignNodes = () => {
    if (!diagramRef) {
      return;
    }

    const nodes = diagramRef.nodes;
    if (!nodes || !Array.isArray(nodes)) {
      console.warn('No nodes available for alignment');
      return;
    }

    let x = 100;
    let y = 100;
    const spacing = 200;

    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const addInfo = node.addInfo as any;
      const nodeConfig = addInfo?.nodeConfig;
      const nodeType = nodeConfig?.type;

      if (nodeType !== 'sticky') {
        node.offsetX = x;
        node.offsetY = y;

        x += spacing;
        if ((index + 1) % 4 === 0) {
          x = 100;
          y += spacing;
        }
      }
    });

    try {
      diagramRef.dataBind();
    } catch (error) {
      console.error('Error during data binding:', error);
    }
  };

  // Handle browser navigation (back button)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && !isNavigatingAway) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      if (isDirty && !isNavigatingAway) {
        // Prevent the navigation
        event.preventDefault();
        
        window.history.pushState(null, '', window.location.href);
        
        const shouldSave = window.confirm(
          'You have unsaved changes. Do you want to save before leaving?'
        );
        
        if (shouldSave) {
          handleSave();
        }
        
        // Now allow navigation
        setIsNavigatingAway(true);
        setTimeout(() => {
          window.history.back();
        }, 100);
      }
    };

    // Add a state to the history when component mounts
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, isNavigatingAway]);

  return (
    <div className="editor-container" data-theme={theme}>
      <AppBar
        projectName={projectName}
        onBack={handleBackToHome}
        onSave={handleSave}
        onProjectNameChange={(name) => {
          setProjectName(name);
          setIsDirty(true); // Mark as dirty when project name changes
        }}
        onThemeToggle={toggleTheme}
        showBackButton={true}
      />
      
      <div className="editor-content">
        {/* Left Sidebar for Node Palette */}
        <NodePaletteSidebar 
          isOpen={nodePaletteSidebarOpen}
          onClose={() => setNodePaletteSidebarOpen(false)}
          onAddNode={handleAddNode}
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
            onDiagramRef={handleDiagramRef}
            project={project}
            onDiagramChange={handleDiagramChange}
            onAddStickyNote= {handleAddStickyNote}
            onAutoAlignNodes={handleAutoAlignNodes}
          />
        </div>
        
        {/* Floating Toolbar */}
        <div className="editor-toolbar">
          <Toolbar 
            onAddNode={() => setNodePaletteSidebarOpen(true)}
            onExecute={handleExecuteWorkflow}
            onCancel={handleCancelExecution}
            onFitToPage={() => diagramRef?.fitToPage({canZoomIn: true, canZoomOut: true, margin:{top: 100, left: 100, bottom: 100, right: 100} })}
            onZoomIn={() => diagramRef?.zoomTo({type: 'ZoomIn', zoomFactor: 0.2})}
            onZoomOut={() => diagramRef?.zoomTo({type: 'ZoomOut', zoomFactor: 0.2})}
            onResetZoom={() => diagramRef?.reset()}
            onAddSticky={handleAddStickyNote}
            onAutoAlign={handleAutoAlignNodes}
            isExecuting={isExecuting}
          />
        </div>
      </div>
      
      <Toast position={{ X: 'Right', Y: 'Bottom' }} />
    </div>
  );
};

export default Editor;