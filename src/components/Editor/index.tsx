import React, { useState, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router';
import { DiagramTools, NodeConstraints, NodeModel, PortConstraints, PortModel } from '@syncfusion/ej2-react-diagrams';
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
import { calculateNewNodePosition, generateOptimizedThumbnail, getNodePortById } from '../../helper/diagramUtils';
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
  const [isPanActive, setIsPanActive] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isUserhandleAddNodeSelectionMode, setUserhandleAddNodeSelectionMode] = useState(false);
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
        setNodePaletteSidebarOpen(false);
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

  const handleSave = useCallback(async () => {
    try {
      if (diagramRef) {
        // Save diagram as string using EJ2's built-in method
        const diagramString = diagramRef.saveDiagram();

        // Generate thumbnail with current diagram output
        const thumbnailBase64 = await generateOptimizedThumbnail(diagramRef.id);

        const updatedProject: ProjectData = {
          ...project,
          name: projectName,
          workflowData: {
            ...(project.workflowData ?? {}),
            diagramString: diagramString,
          },
          diagramSettings: diagramSettings,
          thumbnail: thumbnailBase64 ?? project.thumbnail,
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
    setNodePaletteSidebarOpen(false);
  };

  const handleNodeConfigChange = (nodeId: string, config: NodeConfig) => {
    setSelectedNode(config);
    
    // Update the node's addInfo in the diagram directly
    if (diagramRef) {
      const node = diagramRef.getObject(nodeId);
      if (node) {
        node.addInfo = { nodeConfig: config };
        diagramRef.refresh(); // refresh the diagram to update the changes
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

  const handleUserhandleAddNodeClick = (node: NodeModel, portId: string) => {
    if (!diagramRef && !node) return;
    const port = getNodePortById(node, portId); 
    if (!port || port.constraints === undefined || port.constraints === null) return;
    
    // Only allow if port is OutConnect and Draw (connectable)
    const isConnectable =
      ((port.constraints & PortConstraints.OutConnect) !== 0) &&
      ((port.constraints & PortConstraints.Draw) !== 0);

    if (isConnectable) {
      setSelectedPortConnection({ nodeId: node?.id as string, portId });
      setSelectedPortModel(port);
      setUserhandleAddNodeSelectionMode(true);
      setConfigPanelOpen(false);
      setNodePaletteSidebarOpen(true);
    } else {
      // Not connectable, do nothing
      setUserhandleAddNodeSelectionMode(false);
      setSelectedPortConnection(null);
      setSelectedPortModel(null);
      setNodePaletteSidebarOpen(false);
    }
  };

  const handleAddNode = (nodeTemplate: NodeTemplate) => {
    if (isUserhandleAddNodeSelectionMode) {
      addNodeFromPort(nodeTemplate);
    } else {
      addNodeToDiagram(nodeTemplate);
    }
    setIsDirty(true);
  };

  // Handles adding a new node connected to a selected userhandles node port
  const addNodeFromPort = (nodeTemplate: NodeTemplate) => {
    if (!diagramRef || !selectedPortConnection) return;

    const nodeId = `${nodeTemplate.id}-${Date.now()}`;
    const newNodeConfig: NodeConfig = {
      id: nodeId,
      type: nodeTemplate.type,
      name: nodeTemplate.name,
      icon: nodeTemplate.iconId,
      settings: { general: {}, authentication: {}, advanced: {} },
    };

    // Get the source node where the user handle was triggered
    const sourceNode = diagramRef.getObject(selectedPortConnection.nodeId);
    if (!sourceNode) {
      console.error('Source node not found for connection.');
      return;
    }

    // Calculate position for the new node based on the source
    const { offsetX, offsetY } = calculateNewNodePosition(sourceNode, selectedPortConnection.portId);

    // Create the new node and connector configuration
    const newNode = {
      id: nodeId,
      offsetX,
      offsetY,
      addInfo: { nodeConfig: newNodeConfig },
    };
    const connector = {
      id: `connector-${Date.now()}`,
      sourceID: selectedPortConnection.nodeId,
      sourcePortID: selectedPortConnection.portId,
      targetID: nodeId,
      targetPortID: 'left-port',
    };

    // Add the new elements to the diagram
    diagramRef.add(newNode);
    diagramRef.add(connector);
    diagramRef.clearSelection();
    diagramRef.tool = DiagramTools.Default; // Reset the diagram tool

    // Reset the component's state after connection
    setUserhandleAddNodeSelectionMode(false);
    setSelectedPortConnection(null);
    setSelectedPortModel(null);
    setNodePaletteSidebarOpen(false);
  };

  // Handles adding a new node directly to the diagram canvas
  const addNodeToDiagram = (nodeTemplate: NodeTemplate) => {
    if (!diagramRef) return;

    const nodeId = `${nodeTemplate.id}-${Date.now()}`;
    const newNodeConfig: NodeConfig = {
      id: nodeId,
      type: nodeTemplate.type,
      name: nodeTemplate.name,
      icon: nodeTemplate.iconId,
      settings: { general: {}, authentication: {}, advanced: {} },
    };

    // Create and add the new node to the diagram
    const newNode = {
      id: nodeId,
      addInfo: { nodeConfig: newNodeConfig },
    };
    diagramRef.add(newNode);
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

  const handleTogglePan = () => {
    if (!diagramRef) return;
    const currentlyPan = diagramRef.tool === DiagramTools.ZoomPan;
    diagramRef.tool = currentlyPan ? DiagramTools.Default : DiagramTools.ZoomPan;
    setIsPanActive(!currentlyPan);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Spacebar toggles temporary pan in EJ2; reflect active while pressed
      // Only toggle pan if not editing text (input, textarea, etc.)
      const activeElement = document.activeElement;
      const isEditingText = activeElement instanceof HTMLInputElement || 
                           activeElement instanceof HTMLTextAreaElement ||
                           activeElement?.getAttribute('contenteditable') === 'true';
      
      if (e.code === 'Space' && !isEditingText) {
        setIsPanActive(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Only handle space key up if not editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement instanceof HTMLInputElement || 
                           activeElement instanceof HTMLTextAreaElement ||
                           activeElement?.getAttribute('contenteditable') === 'true';
      
      if (e.code === 'Space' && !isEditingText) {
        // After space released, reflect actual tool state
        const active = diagramRef?.tool === DiagramTools.ZoomPan;
        setIsPanActive(!!active);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [diagramRef]);

  const handleExport = () => {
    if (diagramRef) {
      const diagramString = diagramRef.saveDiagram();
      const currentProjectData = {
        ...project,
        name: projectName,
        workflowData: {
          ...(project.workflowData ?? {}),
          diagramString,
        },
        diagramSettings,
      };

      WorkflowService.exportProject(currentProjectData);
      showSuccessToast('Export Complete', 'Project has been exported successfully.');
    }
  };

  const handleImport = (importedProject: any) => {
    try {
      // Validate the imported data structure
      if (!importedProject || typeof importedProject !== 'object') {
        throw new Error('Invalid project file format');
      }
      const now = new Date();

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
        isBookmarked: false,
        lastModified: now.toISOString(),
        workflowData: {
          ...importedProject.workflowData,
          metadata: {
            ...importedProject.workflowData.metadata,
            created: now, // Set new creation date
            modified: now, // Set new modification date
          },
        },
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
        onBack={() => onBackToHome()}
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
        {/* Sidebar for Configuration */}
        <NodeConfigSidebar 
          isOpen={configPanelOpen}
          onClose={() => setConfigPanelOpen(false)}
          selectedNode={selectedNode}
          onNodeConfigChange={handleNodeConfigChange}
        />

        {/* Sidebar for Node Palette */}
        <NodePaletteSidebar 
          isOpen={nodePaletteSidebarOpen}
          onClose={() => setNodePaletteSidebarOpen(false)}
          onAddNode={handleAddNode}
          port={isUserhandleAddNodeSelectionMode ? selectedPortModel : null}
        />
                
        {/* Main Diagram Area */}
        <div className="diagram-container">
          <DiagramEditor 
            onAddNode={() => {
              setConfigPanelOpen(false);
              setNodePaletteSidebarOpen(true);
            }}
            onNodeDoubleClick={handleNodeDoubleClick}
            onDiagramRef={(ref) => setDiagramRef(ref)}
            project={project}
            onDiagramChange={handleDiagramChange}
            onAddStickyNote={handleAddStickyNote}
            onUserhandleAddNodeClick={handleUserhandleAddNodeClick}
            isUserHandleAddNodeEnabled= {isUserhandleAddNodeSelectionMode}
            diagramSettings={diagramSettings}
            showInitialAddButton={showInitialAddButton}
            onInitialAddClick={() => {
              setConfigPanelOpen(false);
              setNodePaletteSidebarOpen(true);
            }}
            onNodeAddedFirstTime={() => setShowInitialAddButton(false)}
            onCanvasClick={() => setNodePaletteSidebarOpen(false)}
          />
        </div>
        
        {/* Floating Toolbar */}
        <div className="editor-toolbar">
          <Toolbar 
            onAddNode={() => {
              setConfigPanelOpen(false);
              setNodePaletteSidebarOpen(true);
            }}
            onExecute={handleExecuteWorkflow}
            onCancel={handleCancelExecution}
            onFitToPage={() => diagramRef?.fitToPage({canZoomIn: false, canZoomOut: false, margin:{top: 100, left: 100, bottom: 100, right: 100} })}
            onZoomIn={() => diagramRef?.zoomTo({type: 'ZoomIn', zoomFactor: 0.2})}
            onZoomOut={() => diagramRef?.zoomTo({type: 'ZoomOut', zoomFactor: 0.2})}
            onResetZoom={() => diagramRef?.reset()}
            onAddSticky={handleAddStickyNote}
            isExecuting={isExecuting}
            onTogglePan={handleTogglePan}
            isPanActive={isPanActive}
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