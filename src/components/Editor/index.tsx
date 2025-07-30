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
  try {
    if (!diagramRef) {
      showErrorToast('Error', 'Diagram reference not available');
      return;
    }

    const nodes = diagramRef.nodes;
    const connectors = diagramRef.connectors;

    if (!nodes || !nodes.length) {
      showErrorToast('Error', 'No nodes to arrange');
      return;
    }

    // Skip sticky notes from arrangement
    const workflowNodes = nodes.filter((node: any) => {
      const nodeConfig = node.addInfo?.nodeConfig;
      return nodeConfig?.type !== 'sticky';
    });

    if (workflowNodes.length === 0) {
      showErrorToast('Info', 'No workflow nodes to arrange');
      return;
    }

    // First determine which nodes are connected
    const nodeConnections = buildNodeConnectionsMap(connectors);
    const { inputNodes, outputNodes, isolatedNodes } = categorizeNodes(workflowNodes, nodeConnections);
    
    // Special case: if everything is isolated (no connections exist)
    if (isolatedNodes.length === workflowNodes.length) {
      arrangeNodesInGrid(diagramRef, isolatedNodes);
      return;
    }
    
    // Has connections, use hierarchical layout
    applyHierarchicalLayout(diagramRef, workflowNodes, inputNodes);
    
    // If there are any isolated nodes, arrange them below the connected nodes
    if (isolatedNodes.length > 0) {
      const connectedNodesBottom = findBottomOfNodes(workflowNodes.filter((n: any) => !isolatedNodes.includes(n)));
      arrangeNodesInGrid(diagramRef, isolatedNodes, { 
        startY: connectedNodesBottom + 150,
        startX: 100
      });
    }
    
    showSuccessToast('Success', 'Workflow has been automatically arranged');
    diagramRef.reset();
    diagramRef.fitToPage({canZoomIn: true, canZoomOut: true, margin:{top: 100, left: 100, bottom: 200, right: 100} });
  } catch (error) {
    console.error('Error in auto-arrange workflow:', error);
    showErrorToast('Error', 'Failed to arrange workflow');
  }
};

// Helper function to build a map of node connections
const buildNodeConnectionsMap = (connectors: any[]) => {
  const nodeConnections = {
    incoming: new Map<string, string[]>(), // targetID -> sourceIDs
    outgoing: new Map<string, string[]>()  // sourceID -> targetIDs
  };
  
  if (connectors && connectors.length) {
    connectors.forEach(connector => {
      if (connector.sourceID && connector.targetID) {
        // Track incoming connections
        if (!nodeConnections.incoming.has(connector.targetID)) {
          nodeConnections.incoming.set(connector.targetID, []);
        }
        nodeConnections.incoming.get(connector.targetID)?.push(connector.sourceID);
        
        // Track outgoing connections
        if (!nodeConnections.outgoing.has(connector.sourceID)) {
          nodeConnections.outgoing.set(connector.sourceID, []);
        }
        nodeConnections.outgoing.get(connector.sourceID)?.push(connector.targetID);
      }
    });
  }
  
  return nodeConnections;
};

// Helper function to categorize nodes based on connectivity
const categorizeNodes = (nodes: any[], nodeConnections: any) => {
  const inputNodes: any[] = []; // Nodes with no incoming connections but have outgoing
  const outputNodes: any[] = []; // Nodes with no outgoing connections but have incoming
  const isolatedNodes: any[] = []; // Nodes with no connections at all
  
  nodes.forEach(node => {
    const hasIncoming = nodeConnections.incoming.has(node.id);
    const hasOutgoing = nodeConnections.outgoing.has(node.id);
    
    if (!hasIncoming && hasOutgoing) {
      inputNodes.push(node);
    } else if (hasIncoming && !hasOutgoing) {
      outputNodes.push(node);
    } else if (!hasIncoming && !hasOutgoing) {
      isolatedNodes.push(node);
    }
  });
  
  return { inputNodes, outputNodes, isolatedNodes };
};

// Apply hierarchical layout to connected nodes
const applyHierarchicalLayout = (diagram: any, nodes: any[], startNodes: any[]) => {
  // If no specific start nodes found, use first node as root
  if (startNodes.length === 0 && nodes.length > 0) {
    startNodes.push(nodes[0]);
  }
  
  const layoutManager = diagram.layout;
  layoutManager.type = 'HierarchicalTree';
  layoutManager.orientation = 'LeftToRight';
  layoutManager.horizontalSpacing = 100;
  layoutManager.verticalSpacing = 80;
  layoutManager.margin = { left: 50, top: 50, right: 50, bottom: 50 };
  
  // Connect to diagram layout options
  diagram.layout = {
    ...layoutManager,
    enableAnimation: true,
    getLayoutInfo: (node: any, options: any): any => {
      // Start nodes are at level 0
      if (node.id && startNodes.some(n => n.id === node.id)) {
        options.level = 0;
      }
      return options;
    }
  };
  
  // Apply layout
  diagram.dataBind();
  diagram.doLayout();
  
  // Ensure everything is visible
  setTimeout(() => {
    diagram.fitToPage({ mode: 'Page', region: 'Content', margin: { left: 50, top: 50, right: 50, bottom: 50 } });
  }, 100);
};

// Arrange unconnected nodes in a grid pattern
const arrangeNodesInGrid = (diagram: any, nodes: any[], options = { startX: 100, startY: 100 }) => {
  if (!nodes.length) return;
  
  const { startX, startY } = options;
  const gridSpacing = 150;
  const nodesPerRow = 5;
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;
    
    node.offsetX = startX + col * gridSpacing;
    node.offsetY = startY + row * gridSpacing;
  });
  
  diagram.dataBind();
};

// Find the bottom-most position of a set of nodes
const findBottomOfNodes = (nodes: any[]) => {
  if (!nodes.length) return 0;
  
  let maxY = 0;
  nodes.forEach(node => {
    const bottom = (node.offsetY || 0) + (node.height || 0) / 2;
    maxY = Math.max(maxY, bottom);
  });
  
  return maxY;
};



  // Handle browser navigation (back button)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && !isNavigatingAway) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
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