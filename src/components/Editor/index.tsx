import React, { useState, useEffect } from 'react';
import { useBlocker } from 'react-router';
import { NodeConstraints, NodeModel, PortConstraints, PortModel } from '@syncfusion/ej2-react-diagrams';
import AppBar from '../Header';
import DiagramEditor from '../DiagramEditor';
import Toolbar from '../Toolbar';
import Toast, { showSuccessToast, showErrorToast } from '../Toast';
import NodePaletteSidebar from '../NodePaletteSidebar';
import NodeConfigSidebar from '../NodeConfigSidebar';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmationDialog from '../ConfirmationDialog';
import { ProjectData, NodeConfig, NodeTemplate, DiagramSettings } from '../../types';
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [diagramRef, setDiagramRef] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(() => {
    return {
      ...project.diagramSettings,
      gridStyle: project.diagramSettings?.gridStyle ?? 'dotted',
      enableSnapping: project.diagramSettings?.enableSnapping ?? false,
      showOverview: project.diagramSettings?.showOverview ?? true
    }
  });
  const blocker = useBlocker(React.useCallback(() => isDirty, [isDirty]));
  // Port selection state for connecting nodes
  const [isPortSelectionMode, setIsPortSelectionMode] = useState(false);
  const [selectedPortConnection, setSelectedPortConnection] = useState<{nodeId: string, portId: string} | null>(null);
  const [selectedPortModel, setSelectedPortModel] = useState<PortModel | null>(null);

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

        const updatedProject = {
          ...project,
          name: projectName,
          workflowData: {
            ...(project.workflowData ?? {}),
            diagramString: diagramString
          },
          diagramSettings: diagramSettings
        };

        WorkflowService.saveProject(updatedProject);
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

  const handlePortClick = (nodeId: string, portId: string) => {
    if (!diagramRef) return;
    const node = diagramRef.getObject(nodeId);
    if (!node || !node.ports) return;
    const port: PortModel = node.ports.find((p: any) => p.id === portId);
    if (!port || port.constraints === undefined || port.constraints === null) return;
    
    // Only allow if port is OutConnect and Draw (connectable)
    const isConnectable =
      ((port.constraints & PortConstraints.OutConnect) !== 0) &&
      ((port.constraints & PortConstraints.Draw) !== 0);

    if (isConnectable) {
      setSelectedPortConnection({ nodeId, portId });
      setSelectedPortModel(port);
      setIsPortSelectionMode(true);
      setNodePaletteSidebarOpen(true);
    } else {
      // Not connectable, do nothing
      setIsPortSelectionMode(false);
      setSelectedPortConnection(null);
      setSelectedPortModel(null);
      setNodePaletteSidebarOpen(false);
    }
  };

  const handleAddNode = (nodeTemplate: NodeTemplate) => {
    if (isPortSelectionMode && selectedPortConnection && diagramRef) {
      // Handle port click connection
      const nodeId = `${nodeTemplate.id}-${Date.now()}`;

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

      // Position based on source port
      const sourceNode = diagramRef.getObject(selectedPortConnection.nodeId);
      let offsetX = sourceNode.offsetX + 200;
      let offsetY = sourceNode.offsetY;

      if (selectedPortConnection.portId.includes('bottom')) {
        offsetX = sourceNode.offsetX;
        offsetY = sourceNode.offsetY + 150;
      }

      const newNode = {
        id: nodeId,
        offsetX: offsetX,
        offsetY: offsetY,
        addInfo: { nodeConfig: newNodeConfig }
      };

      diagramRef.add(newNode);

      // Create connector
      const connector = {
        id: `connector-${Date.now()}`,
        sourceID: selectedPortConnection.nodeId,
        sourcePortID: selectedPortConnection.portId,
        targetID: nodeId,
        targetPortID: 'left-port'
      };

      diagramRef.add(connector);

      // Reset states
      setIsPortSelectionMode(false);
      setSelectedPortConnection(null);
      setSelectedPortModel(null);
      setNodePaletteSidebarOpen(false);
      setIsDirty(true);
    } else {
      // Normal node addition
      const nodeId = `${nodeTemplate.id}-${Date.now()}`;

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

      if (diagramRef) {
        const newNode = {
          id: nodeId,
          addInfo: { nodeConfig: newNodeConfig }
        };

        diagramRef.add(newNode);
        setSelectedNodeId(nodeId);
        setIsDirty(true);
      }
    }
  };

  const handleDiagramRef = (ref: any) => {
    setDiagramRef(ref);
  };

  const handleBackToHome = () => {
    onBackToHome();
  };

  const handleDiagramSettingsChange = (settings: DiagramSettings) => {
    setDiagramSettings(settings);
    setIsDirty(true);
    
    // Apply settings to diagram immediately
    if (diagramRef && diagramRef.snapSettings) {
      // Update grid style
      const gridType = settings.gridStyle === 'lines' ? 'Lines' : 'Dots';
      diagramRef.snapSettings.gridType = gridType;
      
      // Update snapping
      if (settings.enableSnapping) {
        diagramRef.snapSettings.constraints = diagramRef.snapSettings.constraints | 31; // All snap constraints
      } else {
        diagramRef.snapSettings.constraints = 0; // No snap constraints
      }
      
      diagramRef.dataBind();

      const updatedProject = { ...project, diagramSettings: settings };
      onSaveProject(updatedProject);
    }
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
      diagramRef.fitToPage();
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

  // When a navigation is blocked, open your confirmation dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowLeaveDialog(true);
    }
  }, [blocker.state]);

  // On page refresh or tab close action, show a warning to the user
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // triggers the native prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="editor-container" data-theme={theme}>
      <AppBar
        projectName={projectName}
        onBack={handleBackToHome}
        onSave={handleSave}
        enableSaveBtn={isDirty}
        onProjectNameChange={(name) => {
          setProjectName(name);
          setIsDirty(true);
        }}
        onThemeToggle={toggleTheme}
        showBackButton={true}
        diagramSettings={diagramSettings}
        onDiagramSettingsChange={handleDiagramSettingsChange}
      />
      
      <div className="editor-content">
        {/* Left Sidebar for Node Palette */}
        <NodePaletteSidebar 
          isOpen={nodePaletteSidebarOpen}
          onClose={() => setNodePaletteSidebarOpen(false)}
          onAddNode={handleAddNode}
          port={isPortSelectionMode ? selectedPortModel : null}
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
            onPortClick={handlePortClick}
            diagramSettings={diagramSettings}
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
      
      <ConfirmationDialog
        isOpen={showLeaveDialog}
        onDismiss={() => {
          // do nothing, stay in the same page
          setShowLeaveDialog(false);
          if (blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
        onConfirm={() => {
          // save the changes, navigate to home page
          handleSave();
          setShowLeaveDialog(false);
          if (blocker.state === 'blocked') {
            blocker.proceed();
          }
        }}
        onClose={() => {
          // discard changes, navigate to home page
          setShowLeaveDialog(false);
          if (blocker.state === 'blocked') {
            blocker.proceed();
          }
        }}
        content="You have unsaved changes. Do you want to save before leaving?"
        buttonContent={{ primary: 'Save & Leave', secondary: 'Discard Changes' }}
        variant="primary"
      />

    </div>
  );
};

export default Editor;