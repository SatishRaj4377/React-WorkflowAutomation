import React, { useState, useEffect, useCallback } from 'react';
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
import { ProjectData, NodeConfig, NodeTemplate, DiagramSettings, StickyNotePosition } from '../../types';
import WorkflowService from '../../services/WorkflowService';
import { applyStaggerMetadata, getNextStaggeredOffset } from '../../helper/stagger';
import './Editor.css';

interface EditorProps {
  project: ProjectData;
  onSaveProject: (project: ProjectData) => void;
  onBackToHome: () => void;
}

const Editor: React.FC<EditorProps> = ({project, onSaveProject, onBackToHome, }) => {
  const { theme } = useTheme();
  const [nodePaletteSidebarOpen, setNodePaletteSidebarOpen] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeConfig | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [diagramRef, setDiagramRef] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isPortSelectionMode, setIsPortSelectionMode] = useState(false);
  const [selectedPortConnection, setSelectedPortConnection] = useState<{nodeId: string, portId: string} | null>(null);
  const [selectedPortModel, setSelectedPortModel] = useState<PortModel | null>(null);
  const [showInitialAddButton, setShowInitialAddButton] = useState(
    !project.workflowData?.diagramString || project.workflowData.diagramString.trim() === ''
  );
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(() => {
    return {
      ...project.diagramSettings,
      gridStyle: project.diagramSettings?.gridStyle ?? 'dotted',
      enableSnapping: project.diagramSettings?.enableSnapping ?? false,
      showOverview: project.diagramSettings?.showOverview ?? true
    }
  });
  
  const blocker = useBlocker(React.useCallback(() => isDirty, [isDirty]));

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

  const handleSave = useCallback(() => {
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
        setIsInitialLoad(false);
        showSuccessToast('Workflow Saved', 'Your workflow has been saved successfully.');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showErrorToast('Save Failed', 'There was an error saving your workflow.');
    }
  }, [diagramRef, project, projectName, diagramSettings, onSaveProject]);

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
      let offsetX = sourceNode.offsetX + (sourceNode.width * 2);
      let offsetY = sourceNode.offsetY;

      if (selectedPortConnection.portId.includes('bottom')) {
        offsetX = sourceNode.offsetX;
        offsetY = sourceNode.offsetY + (sourceNode.height * 2);
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

  const handleExport = () => {
    try {
      if (diagramRef) {
        // Save current diagram state
        const diagramString = diagramRef.saveDiagram();
        
        const exportData = {
          ...project,
          name: projectName,
          workflowData: {
            ...(project.workflowData ?? {}),
            diagramString: diagramString
          },
          diagramSettings: diagramSettings,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        showSuccessToast('Export Complete', 'Project has been exported successfully.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      showErrorToast('Export Failed', 'There was an error exporting your project.');
    }
  };

  const handleImport = (importedProject: any) => {
    try {
      // Validate the imported data structure
      if (!importedProject || typeof importedProject !== 'object') {
        throw new Error('Invalid project file format');
      }

      // Set project data
      setProjectName(importedProject.name || 'Imported Project');
      setDiagramSettings(importedProject.diagramSettings || {
        gridStyle: 'dotted',
        enableSnapping: false,
        showOverview: true
      });

      // Load the diagram if available
      if (diagramRef && importedProject.workflowData?.diagramString) {
        diagramRef.loadDiagram(importedProject.workflowData.diagramString);
      }

      // Update parent component with imported project
      const updatedProject = {
        ...importedProject,
        id: project.id, // Keep current project ID to replace current project
        lastModified: new Date().toISOString()
      };
      
      onSaveProject(updatedProject);
      setIsDirty(false);
      setIsInitialLoad(false);
      
      showSuccessToast('Import Complete', 'Project has been imported successfully.');
    } catch (error) {
      console.error('Import failed:', error);
      showErrorToast('Import Failed', 'There was an error importing the project file.');
    }
  };

  const handleAddStickyNote = (position: StickyNotePosition) => {
    if (diagramRef) {
      if (
        !position ||
        typeof position !== 'object' ||
        typeof position.x !== 'number' ||
        typeof position.y !== 'number'
      ) {
        // Position the sticky note to center of the diagram
        position = {
          x: diagramRef.scrollSettings.viewPortWidth / 2,
          y: diagramRef.scrollSettings.viewPortHeight / 2,
        };
      }
      
      let x : number= position.x;
      let y :number = position.y;
      let index: number | undefined;

      // Apply staggering only if postion is not from mouse
      if (!position.fromMouse) {
        const staggered = getNextStaggeredOffset(diagramRef, x, y, {
          group: 'sticky',
          strategy: 'diagonal',
          stepX: 16,
          stepY: 16,
        });
        x = staggered.x;
        y = staggered.y;
        index = staggered.index;
      }
      const timestamp = Date.now();
      const stickyNote: NodeModel = {
        id: `sticky-${timestamp}`,
        width: 240,
        height: 240,
        offsetX: x,
        offsetY: y - 64, // removing the header height
        constraints: (NodeConstraints.Default & ~NodeConstraints.Rotate),
        addInfo: {
          nodeConfig: {
            id: `sticky-${timestamp}`,
            type: 'sticky',
            name: 'Sticky Note',
          } as NodeConfig
        }
      };

      // Persist stagger metadata only if staggering was applied
      if (index !== undefined) {
        applyStaggerMetadata(stickyNote, 'sticky', index);
      }

      diagramRef.add(stickyNote);
    }
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

  // Saved the workflow from keyboard shortcur (ctrl + s)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) {
          handleSave();
        } else {
          showSuccessToast('No Changes', 'Workflow is already saved.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isDirty]);

  return (
    <div className="editor-container" data-theme={theme}>
      <AppBar
        projectName={projectName}
        onBack={handleBackToHome}
        onSave={handleSave}
        enableSaveBtn={isInitialLoad || isDirty}
        onProjectNameChange={(name) => {
          setProjectName(name);
          setIsDirty(true);
        }}
        diagramSettings={diagramSettings}
        onDiagramSettingsChange={handleDiagramSettingsChange}
        onExport={handleExport}
        onImport={handleImport}
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
            onAddStickyNote={handleAddStickyNote}
            onPortClick={handlePortClick}
            diagramSettings={diagramSettings}
            showInitialAddButton={showInitialAddButton}
            onInitialAddClick={() => setNodePaletteSidebarOpen(true)}
            onNodeAddedFirstTime={() => setShowInitialAddButton(false)}
          />
        </div>
        
        {/* Floating Toolbar */}
        <div className="editor-toolbar">
          <Toolbar 
            onAddNode={() => setNodePaletteSidebarOpen(true)}
            onExecute={handleExecuteWorkflow}
            onCancel={handleCancelExecution}
            onFitToPage={() => diagramRef?.fitToPage({canZoomIn: false, canZoomOut: false, margin:{top: 100, left: 100, bottom: 100, right: 100} })}
            onZoomIn={() => diagramRef?.zoomTo({type: 'ZoomIn', zoomFactor: 0.2})}
            onZoomOut={() => diagramRef?.zoomTo({type: 'ZoomOut', zoomFactor: 0.2})}
            onResetZoom={() => diagramRef?.reset()}
            onAddSticky={handleAddStickyNote}
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