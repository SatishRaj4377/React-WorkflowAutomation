import React, { useRef, useEffect, useState } from 'react';
import {
  DiagramComponent,
  SnapSettingsModel,
  OverviewComponent,
  GridlinesModel,
  Inject,
  ConnectorModel,
  NodeModel,
  DiagramTools,
  UndoRedo,
  DataBinding,
  HierarchicalTree,
  DiagramContextMenu,
  NodeConstraints,
  PortVisibility,
  PortConstraints,
  Keys,
  KeyModifiers,
  CommandManagerModel,
  UserHandleModel,
  UserHandleEventsArgs,
  SelectorConstraints,
  ConnectorConstraints,
  Snapping,
  DiagramConstraints,
  DiagramModel,
} from '@syncfusion/ej2-react-diagrams';
import { DiagramSettings, NodeConfig, NodePortDirection } from '../../types';
import { applyStaggerMetadata, getNextStaggeredOffset } from '../../helper/stagger';
import { bringConnectorsToFront, convertMarkdownToHtml, getConnectorCornerRadius, getConnectorType, getFirstSelectedNode, getGridColor, getGridType, getOutConnectDrawPorts, getPortOffset, getPortSide, getSnapConstraints, getStickyNoteTemplate } from '../../helper/diagramUtils';
import './DiagramEditor.css';
import NodeTemplate from './NodeTemplate';

interface DiagramEditorProps {
  onAddNode?: () => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onDiagramRef?: (ref: any) => void;
  project?: any;
  onDiagramChange?: (args: any) => void;
  onAddStickyNote?: (position: { x: number; y: number }) => void;
  onUserhandleAddNodeClick?: (node: NodeModel, portId: string) => void;
  isUserHandleAddNodeEnabled?: boolean;
  diagramSettings: DiagramSettings;
  showInitialAddButton?: boolean;
  onInitialAddClick?: () => void;
  onNodeAddedFirstTime?: () => void;
  onCanvasClick?: () => void;
}

let isStickyNoteEditing = false;

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeDoubleClick,
  onDiagramRef,
  project,
  onDiagramChange,
  onAddStickyNote,
  onUserhandleAddNodeClick,
  isUserHandleAddNodeEnabled,
  diagramSettings,
  showInitialAddButton,
  onInitialAddClick,
  onNodeAddedFirstTime,
  onCanvasClick
}) => {

  const diagramRef = useRef<DiagramComponent>(null);
  const [previousDiagramTool, setPreviousDiagramTool] = useState<DiagramTools>(DiagramTools.SingleSelect | DiagramTools.MultipleSelect);
  const [isPanning, setIsPanning] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const overviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFirstNodeAdded, setHasFirstNodeAdded] = useState(false);
  const [zoomPercentage, setZoomPercentage] = useState<number>(100);
  const [showZoomPercentage, setShowZoomPercentage] = useState<boolean>(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [previousZoom, setPreviousZoom] = useState<number>(100);
  const [isWorkflowLocked, setIsWorkflowLocked] = useState(false);

  // User handles
  let userHandles: UserHandleModel[] = [
    {
      name: 'deleteConnector',
      pathData:
        'M0.97,3.04 L12.78,3.04 L12.78,12.21 C12.78,12.64,12.59,13,12.2,13.3 C11.82,13.6,11.35,13.75,10.8,13.75 L2.95,13.75 C2.4,13.75,1.93,13.6,1.55,13.3 C1.16,13,0.97,12.64,0.97,12.21 Z M4.43,0 L9.32,0 L10.34,0.75 L13.75,0.75 L13.75,2.29 L0,2.29 L0,0.75 L3.41,0.75 Z',
      tooltip: { content: 'Delete' },
      offset: 0.5,
      backgroundColor: '#9193a2ff',
      pathColor: '#f8fafc',
      borderColor: '#9193a2ff',
      disableNodes: true,
    },
  ];
  const firstSelectedNode = getFirstSelectedNode(diagramRef.current);
  if (firstSelectedNode) {
    const portBasedUserHandles = generatePortBasedUserHandles(firstSelectedNode);
    userHandles.push(...portBasedUserHandles);
  }

  // Context Menu Items for the diagram
  const contextMenuSettings = {
    show: true,
    showCustomMenuOnly: true,
    items: [
      // Node menu 
      { id: 'editNode', text: 'Edit Node', iconCss: 'e-icons e-edit' },
      { id: 'delete', text: 'Delete', iconCss: 'e-icons e-trash' },
      // Diagram menu
      { text: 'Add Node', id: 'addNode', iconCss: 'e-icons e-plus' },
      { text: 'Add Sticky Note', id: 'addSticky', iconCss: 'e-icons e-add-notes' },
      { text: 'Lock Workflow', id: 'lockWorkflow', iconCss: 'e-icons e-lock' },
      { text: 'Select All', id: 'selectAll', iconCss: 'e-icons e-select-all' }
    ]
  };

  // Grid and Snap Settings based on diagramSettings
  const snapSettings: SnapSettingsModel = {
    constraints: getSnapConstraints(diagramSettings),
    gridType: getGridType(diagramSettings),
    horizontalGridlines: { lineColor: getGridColor(diagramSettings) } as GridlinesModel,
    verticalGridlines: { lineColor: getGridColor(diagramSettings) } as GridlinesModel,
    snapObjectDistance: 5,
    snapLineColor: 'var(--secondary-color)',
    snapAngle: 5,
  };

  // Get default styles for nodes
  const getNodeDefaults = (obj: NodeModel): NodeModel => {
    if (!obj) return obj;

    const addInfo = obj.addInfo as any;
    const nodeConfig = addInfo?.nodeConfig as NodeConfig | undefined;
    const nodeCategory = nodeConfig?.category;
    const nodeId = nodeConfig?.id || '';
    
    if (nodeConfig && typeof nodeConfig === "object") {
      // Check if the ID contains specific node types
      const isIfOrSwitchCondition = nodeCategory === 'condition' && (nodeConfig.nodeType === 'If Condition' || nodeConfig.nodeType === 'Switch Case');
      const isAiAgent = nodeId.includes('ai-agent');
      
      updateNodeTemplates(nodeCategory, setUpStickyNote, obj);
      
      updateNodeSize(isAiAgent, obj, nodeCategory);

      updateNodeConstraints(obj, nodeCategory);

      updateNodePosition(obj, diagramRef);

      updateNodePorts(nodeCategory, obj, isAiAgent, isIfOrSwitchCondition);
    }

    return obj;
  };

  // Get default styles for connectors
  const getConnectorDefaults = (obj: ConnectorModel): ConnectorModel => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    obj.type = getConnectorType(diagramSettings);
    obj.cornerRadius = getConnectorCornerRadius(diagramSettings)
    obj.style = {
      strokeColor: '#9193a2ff',
      strokeWidth: 2,
    };
    obj.targetDecorator = {
      style: {
        fill: '#9193a2ff',
        strokeColor: '#9193a2ff',
      }
    };
    return obj;
  };

  // Handle the userhandle click
  const handleUserHandleMouseDown = (args: UserHandleEventsArgs) => {
    const handleName = (args.element as UserHandleModel)?.name || '';

    // Check if the handle is for adding a node
    if (handleName.startsWith('add-node-from-port-')) {
      // Parse the portId from the end of the handle's name
      const portId = handleName.substring('add-node-from-port-'.length);
      const selectedNode = diagramRef.current?.selectedItems?.nodes?.[0];

      if (selectedNode?.id && portId && onUserhandleAddNodeClick) {
        // Enable the connector drawing
        (diagramRef.current as any).drawingObject = { type: "Straight", sourceID: selectedNode.id, sourcePortID: portId };
        (diagramRef.current as DiagramModel).tool = DiagramTools.DrawOnce; 
        // Trigger the callback to the parent to open the palette and add node programmatically
        onUserhandleAddNodeClick(selectedNode, portId);
      }
      return;
    }

    // Check if delete Userhandle is clicked
    if (args.element && handleName === 'deleteConnector') {
      (diagramRef.current as any).remove();
    }
  };

  // Hanlde Scrollchange event of diagram to display the current zoom value on overview panel
  const handleScrollChange = (args: any) => {
    if (diagramRef.current) {
      const currentZoom = Math.round((diagramRef.current as any)?.scrollSettings.currentZoom * 100);
      
      // Only show zoom percentage if zoom level changed
      if (currentZoom !== previousZoom) {
        setZoomPercentage(currentZoom);
        setShowZoomPercentage(true);
        setPreviousZoom(currentZoom);
        
        // Clear existing zoom timeout
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        
        // Hide zoom percentage after 2 seconds
        zoomTimeoutRef.current = setTimeout(() => {
          setShowZoomPercentage(false);
        }, 2000);
      }
    }
    
    // Always show overview during scrolling (panning)
    setShowOverview(true);
    
    // Clear existing overview timeout
    if (overviewTimeoutRef.current) {
      clearTimeout(overviewTimeoutRef.current);
    }
    
    // Hide overview after 2 seconds, if showOverviewAlways is enabled in settings
    if (!diagramSettings.showOverviewAlways){
      overviewTimeoutRef.current = setTimeout(() => {
        setShowOverview(false);
      }, 2000);
    }
  };

  // on adding the connector, update the stroke dash and make it not able to disconnect
  const handleCollectionChange = (args: any) => {
    // If first node has been added initially, call onNodeAddedFirstTime
    if (args.type === 'Addition' && args.element && args.element.addInfo && args.element.id) {
      try {
        const diagram = diagramRef.current;
        if (diagram && typeof diagram.nodes !== 'undefined') {
          const nodesLength = diagram.nodes.length;
          if (!hasFirstNodeAdded && nodesLength === 1) {
            setHasFirstNodeAdded(true);
            if (onNodeAddedFirstTime) onNodeAddedFirstTime();
          }
        }
      } catch {}
    }
    // Handle the connector drawing action 
    if (args.type === 'Addition') {
      const connector = args.element;
      
      // Check if connector has both source and target connections
      if (connector && connector.sourceID && connector.targetID) {
        // Update to solid style when connection is completed
        setTimeout(() => {
          connector.style = {
            ...connector.style,
            strokeDashArray: '', // Remove dotted pattern
            opacity: 1
          };
          connector.constraints = ConnectorConstraints.Default & 
                    ~ConnectorConstraints.DragSourceEnd & 
                    ~ConnectorConstraints.DragTargetEnd &
                    ~ConnectorConstraints.Drag });
      }
    }
    if (args.type === 'Addition') {
      const connector = args.element;
      if (connector && (connector.sourceID === '' || connector.targetID === '')) {
        setTimeout(() => {
          (diagramRef.current as any).remove(connector);
        });
      }
    }
  };

  const handleDiagramLoaded = ()=> {
    // Hide the initial plus button
    if (onNodeAddedFirstTime) onNodeAddedFirstTime();
  }

  // Removes the disconnected connector
  const removeDisConnectedConnectors = (args: any) => {
    if (!args || args.objectType !== 'Connector') return;
    const connector = args.source;
    // Validate connector object
    if (!connector || typeof connector !== 'object') return;
    // Apply disconnected style early (before 'Completed' state)
    connector.style = {
      strokeColor: '#9193a2ff',
      strokeDashArray: '5 3',
      strokeWidth: 2,
    };
    if (args.state === 'Completed') {
      const isDisconnected =
        !connector.sourceID || connector.sourceID.trim() === '' ||
        !connector.targetID || connector.targetID.trim() === '';
      if (isDisconnected && diagramRef?.current) {
        setTimeout(() => {
          try {
            (diagramRef.current as any).remove(connector);
          } catch (error) {
            console.error('Failed to remove disconnected connector:', error);
          }
        }, 0);
      }
    }
  };

  // Handle diagram click, 
  const handleClick = (args: any) => {
    const clickedElement = args.element;
    // on userhandle add node process is ongoing, then on clicking on the diagram don't draw connector(reset the tool)
    if (isUserHandleAddNodeEnabled && diagramRef && diagramRef.current){
      diagramRef.current.tool = DiagramTools.Default;
    }

    // If Userhandle was clicked.
    // The onUserHandleMouseDown event handles opening the palette. We stop here to prevent this click from closing it.
    const isCustomUserHandleClick = clickedElement?.name?.startsWith('add-node-from-port-');
    if (isCustomUserHandleClick) {
      return; // Stop here to keep the palette open.
    }
    
    // If the click was not on a port or a custom handle, treat it as a canvas click.
    // This will close the node palette.
    if (onCanvasClick && args.actualObject === undefined) {
      onCanvasClick();
    }
  };

  // Handle diagram double click event
  const handleDoubleClick = (args: any) => {
    if (args && args.source && args.source.id) {
      const nodeId = args.source.id;
      const node = args.source;
      const nodeConfig = (node.addInfo as any)?.nodeConfig as NodeConfig | undefined;
      if (!nodeConfig) return; // Prevent exception if nodeConfig is undefined
      // Handle sticky note double-click
      if (nodeConfig.category === 'sticky') {
        handleStickyNoteEdit(node);
        return;
      }
      // Handle regular node double-click
      if (onNodeDoubleClick) {
        setSelectedNodeIds([nodeId]);
        updateNodeSelection([nodeId]);
        onNodeDoubleClick(nodeId);
      }
    }
  };

  // Handle diagram selection change event
  const handleSelectionChange = (args: any) => {
    if (args && args.newValue && args.newValue.length > 0) {
      const selectedNodeIds = args.newValue.map((item: any) => item.id);
      setSelectedNodeIds(selectedNodeIds);
      updateNodeSelection(selectedNodeIds);
      updateResizeHandleVisibility(selectedNodeIds);
    } else {
      // No selection
      setSelectedNodeIds([]);
      updateNodeSelection(null);
    }
  };

  // Show context menu for nodes / diagram and handle mixed selection
  const handleContextMenuOpen = (args: any) => {
    const diagram = diagramRef.current!;

    // Don't show context menu for sticky node
    const firstSelectedNode = getFirstSelectedNode(diagram);
    if (firstSelectedNode && (firstSelectedNode?.addInfo as any).nodeConfig?.type === "sticky"){
      args.cancel = true;
      return;
    }
    
    const selNodes = diagram?.selectedItems?.nodes ?? [];
    const selConns = diagram?.selectedItems?.connectors ?? [];

    const hasNode = selNodes.length > 0;
    const hasConnector = selConns.length > 0;
    const isMixed = hasNode && hasConnector;

    const availableIds: string[] = (args.items ?? [])
      .map((i: any) => i?.id)
      .filter(Boolean);

    // Define your logical groups (IDs must match your contextMenuSettings.items)
    const NODE_MENU    = ['editNode', 'delete'];
    const DIAGRAM_MENU = ['addNode', 'addSticky', 'lockWorkflow', 'selectAll'];

    // Helper: hide everything except a small allowlist (that is also available)
    const hideAllExcept = (allowIds: string[]) => {
      const allow = new Set(allowIds);
      args.hiddenItems = availableIds.filter((id) => !allow.has(id));
    };

    // Toggle Lock/Unlock label if the item is present
    const lockItem = (args.items || []).find((i: any) => i.id === 'lockWorkflow');
    if (lockItem) lockItem.text = isWorkflowLocked ? 'Unlock Workflow' : 'Lock Workflow';

    // Mixed selection (nodes + connectors) → show only Delete (if available)
    if (isMixed) {
      hideAllExcept(availableIds.includes('delete') ? ['delete'] : []);
      return;
    }

    // Connectors only → show nothing
    if (hasConnector && !hasNode) {
      hideAllExcept([]); // hide all available
      return;
    }

    // Nodes only → show node menu (edit + delete), but only those present
    if (hasNode) {
      const presentNodeMenu = NODE_MENU.filter((id) => availableIds.includes(id));
      hideAllExcept(presentNodeMenu);
      return;
    }

    // Diagram only → show diagram menu (addNode, addSticky, lockWorkflow, selectAll), only those present
    const presentDiagramMenu = DIAGRAM_MENU.filter((id) => availableIds.includes(id));
    hideAllExcept(presentDiagramMenu);
  };



  // handle conext menu click event
  const handleContextMenuClick = (args: any) => {
    if (!args || typeof args !== 'object' || !args.item || typeof args.item !== 'object') {
      console.warn('Invalid context menu click arguments');
      return;
    }

    const diagram = diagramRef.current;
    const itemId = args.item.id as string;
    if (!itemId || !diagram) return;

    switch (itemId) {
      // ----- Node items -----
      case 'duplicateNode': {
        diagram.copy();
        diagram.paste();
        break;
      }
      case 'editNode': {
        const firstSelectedNode = getFirstSelectedNode(diagram);
        if (firstSelectedNode && firstSelectedNode.id)
          onNodeDoubleClick(firstSelectedNode.id);
        break;
      }
      case 'delete': {
        diagram.remove();
        break;
      }

      // ----- Diagram items -----
      case 'addNode': {
        if (onAddNode) onAddNode();
        break;
      }
      case 'addSticky': {
        if (onAddStickyNote){
          const position = args.event && typeof args.event === 'object' 
            ? {x: args.event.pageX, y: args.event.pageY, fromMouse: true} : { x: 300, y: 300, fromMouse: false };
          onAddStickyNote(position);
        }
        break;
      }
      case 'lockWorkflow': {
        if (diagramRef.current) {
          const next = !isWorkflowLocked;
          setIsWorkflowLocked(next);
          applyLockState(next);
        }
        break;
      }
      case 'selectAll': {
        diagram.selectAll();
        break;
      }

      default:
        console.warn(`Unknown context menu item: ${itemId}`);
    }
  };

  const applyLockState = (locked: boolean) => {
    const diagram = diagramRef.current;
    if (!diagram) return;

    if (locked) {
      // Clear any selection
      diagram.clearSelection();

      diagram.constraints = diagram.constraints
        & ~DiagramConstraints.UserInteraction
        & ~DiagramConstraints.PageEditable
        & ~DiagramConstraints.UndoRedo;
    } else {
      diagram.constraints = DiagramConstraints.Default;
    }
  };


  // Customize the diagram command manager
  const getCommandManagerSettings = ()=> {
    const commandManager: CommandManagerModel = {
      commands: [
        {
          name: 'spacePan',
          canExecute: () => {
            return diagramRef.current != null && !isPanning && !isStickyNoteEditing;
          },
          execute: () => {
            if (diagramRef.current && !isPanning && !isStickyNoteEditing) {
              setPreviousDiagramTool(diagramRef.current.tool);
              diagramRef.current.tool = DiagramTools.ZoomPan;
              setIsPanning(true);
            }
          },
          gesture: { 
            key: Keys.Space,
            keyModifiers: KeyModifiers.None
          }
        },
        {
          name: 'group',
          canExecute: () => false, // prevent grouping action
          execute: () => {},
          gesture: {
            key: Keys.G,
            keyModifiers: KeyModifiers.Control
          }
        }
      ]
    };
    return commandManager;
  };

  // Set up styles for sticky notes node
  const setUpStickyNote = (stickyNode: NodeModel) => {
    // Implement the markdown editor template for annotations 
    stickyNode.annotations = [
    {
      id: "annotation",
      template: diagramRef.current 
          ? getStickyNoteTemplate(diagramRef.current, stickyNode.id as string)
          : '<div>Loading sticky note...</div>'
    }]

    // Set node minimum dimensions
    stickyNode.minWidth = 160;
    stickyNode.minHeight = 80;

    // setup sticky node style
    stickyNode.style = {
      fill: "var(--sticky-note-color)",
      strokeColor: "#9193a2ff",
      strokeWidth: 2,
      strokeDashArray: '10 4',
      opacity: .7
    }
    
    // Preserve existing width/height if they exist (for loaded nodes)
    if (!stickyNode.width || stickyNode.width < 160) {
      stickyNode.width = 200;
    }
    if (!stickyNode.height || stickyNode.height < 80) {
      stickyNode.height = 120;
    }
    
    // render the sticky note behind all the nodes
    setTimeout(()=> {
      setStickyZIndex(stickyNode)
    })
  }

  // Updates the z-index to negative for the sticky node element
  function setStickyZIndex(stickyNode: NodeModel) {
    const zIndex = -10000;

    if (stickyNode.id && diagramRef.current){
      // update the z-index of sticky node in dom
      const stikcyNodeElement = document.getElementById(`${stickyNode.id}_annotation_html_element`);
      if (stikcyNodeElement) stikcyNodeElement.style.zIndex = zIndex.toString();

      // update z-order of connectors - to avoid going behind the sticky note
      bringConnectorsToFront(diagramRef.current)
    }
  }

  // Update the custom selector style for node templates
  const updateNodeSelection = (nodeIds: string[] | null) => {
    // Remove selection from all node templates
    const allNodeTemplates = document.querySelectorAll('.node-template');
    allNodeTemplates.forEach(template => {
      template.classList.remove('selected');
    });

    // Add selection to all specified nodes
    if (nodeIds && nodeIds.length > 0) {
      nodeIds.forEach(nodeId => {
        const selectedTemplate = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (selectedTemplate) {
          selectedTemplate.classList.add('selected');
        }
      });
    }
  };

  // Control the diagram selector resize handle visiblity
  const updateResizeHandleVisibility = (nodeIds: string[]) => {
    if (!diagramRef.current) return;
    // show resize handle for the sticky nodes only
    if (nodeIds.length === 1 && nodeIds[0].startsWith('sticky-')) {
      diagramRef.current.selectedItems.constraints = SelectorConstraints.All & ~SelectorConstraints.ToolTip ;
    } 
    // Hide resize handles for multi-selection or non-sticky nodes
    else {
      diagramRef.current.selectedItems.constraints = 
        SelectorConstraints.All & ~SelectorConstraints.ToolTip & ~SelectorConstraints.ResizeAll;
    }
  };

  // Cleanup runs on unmount
  useEffect(() => {
    return () => {
      // Clear the timeout for hiding the overview panel.
      if (overviewTimeoutRef.current) {
        clearTimeout(overviewTimeoutRef.current);
      }
      // Clear the timeout for hiding the zoom percentage display.
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);


  // Update useEffect to handle selection updates when nodes change
  useEffect(() => {
    if (selectedNodeIds.length > 0) {
      setTimeout(() => {
        updateNodeSelection(selectedNodeIds);
      }, 100);
    }
  }, [selectedNodeIds]);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && isPanning) {
        event.preventDefault();
        if (diagramRef.current) {
          diagramRef.current.tool = previousDiagramTool;
          setIsPanning(false);
        }
      }
    };

    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning, previousDiagramTool]);

  // Update diagram when there is any change in the settings dialog
  useEffect(() => {
    if (diagramRef.current && diagramSettings) {
      const diagram = diagramRef.current;
      
      // Update the Grid and Snap Settings 
      const gridType = getGridType(diagramSettings);
      const gridColor = getGridColor(diagramSettings);
      const constraints = getSnapConstraints(diagramSettings);
      diagram.snapSettings = {
        ...diagram.snapSettings,
        gridType,
        constraints,
        horizontalGridlines: { ...diagram.snapSettings.horizontalGridlines, lineColor: gridColor },
        verticalGridlines: { ...diagram.snapSettings.verticalGridlines, lineColor: gridColor }
      };
      
      // Update Connector types and corner radius
      if (Array.isArray(diagram.connectors)) {
        diagram.connectors.forEach((connector: ConnectorModel) => {
          connector.type = getConnectorType(diagramSettings);
          connector.cornerRadius = getConnectorCornerRadius(diagramSettings);
        });
      }

      // Overview "always show"
      if (diagramSettings.showOverviewAlways) {
        setShowOverview(true);
      }

    }
  }, [diagramSettings]);

  // Pass diagram ref to parent component
  useEffect(() => {
    if (diagramRef.current && onDiagramRef) {
      onDiagramRef(diagramRef.current);
    }
  }, [diagramRef.current, onDiagramRef]);

  // Load diagram from project if available
  useEffect(() => {
    if (diagramRef.current && project && project.workflowData.diagramString && !isLoaded) {
      try {
        diagramRef.current.loadDiagram(project.workflowData.diagramString);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load diagram:', error);
        setIsLoaded(true); // Set as loaded even if failed to prevent infinite loop
      }
    } else if (diagramRef.current && !project.workflowData.diagramString) {
      setIsLoaded(true);
    }
  }, [project, diagramRef.current, isLoaded]);

  return (
    <div className="diagram-editor-container">
      {/* Big Center Plus Button  */}
      {showInitialAddButton && (
        <div className="center-initial-plus-btn">
          <button
            className="initial-plus-btn-actual"
            type="button"
            onClick={onInitialAddClick}
          >
            <span className="initial-plus-icon">+</span>
          </button>
          <div className="initial-plus-label">Add a trigger</div>
        </div>
      )}
      <DiagramComponent
        id="workflow-diagram"
        ref={diagramRef}
        width="100%"
        height="100%"
        nodes={[]}
        connectors={[]}
        nodeTemplate={NodeTemplate}
        getNodeDefaults={getNodeDefaults}
        getConnectorDefaults={getConnectorDefaults}
        elementDraw={removeDisConnectedConnectors}
        collectionChange={handleCollectionChange}
        snapSettings={snapSettings}
        scrollSettings={{scrollLimit: "Infinity"}}
        contextMenuSettings={contextMenuSettings}
        scrollChange={handleScrollChange}
        contextMenuClick={handleContextMenuClick}
        contextMenuOpen={handleContextMenuOpen}
        click={handleClick}
        doubleClick={handleDoubleClick}
        selectionChange={handleSelectionChange}
        commandManager={getCommandManagerSettings()}
        selectedItems={{ userHandles: userHandles  }}
        onUserHandleMouseDown={ handleUserHandleMouseDown }
        historyChange={onDiagramChange}
        loaded={handleDiagramLoaded}
      >
        <Inject services={[UndoRedo, DataBinding, HierarchicalTree, DiagramContextMenu, Snapping ]} />
      </DiagramComponent>

      {/* Overview Panel with integrated zoom percentage */}
      <div className='diagram-overview-container'
        style={{
          opacity: (showOverview && diagramSettings?.showOverview) ? 1 : 0,
          visibility: (showOverview && diagramSettings?.showOverview) ? 'visible' : 'hidden',
        }}
      >
        {showZoomPercentage && (
          <div className="zoom-percentage-display">
            {zoomPercentage}%
          </div>
        )}
        <OverviewComponent
          id="overview"
          sourceID="workflow-diagram"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
};

export default DiagramEditor;

// Generate Userhandles based on the `OutConnect` ports
function generatePortBasedUserHandles(node: NodeModel): UserHandleModel[] {
  const portHandlesInfo: Array<{ portId: string; direction: NodePortDirection }> = (node.addInfo as any)?.userHandlesFromPorts ?? [];
  return portHandlesInfo.map(({ portId, direction }) => ({
    name: `add-node-from-port-${portId}`,
    content: `
      <g>
        <rect x="1" y="1" width="14" height="14" rx="3" ry="3" fill="#9193a2ff" stroke="#9193a2ff" stroke-width="1.2"/>
        <path d="M8 5 V11 M5 8 H11" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
      </g>
    `,
    tooltip: { content: 'Add Node' },
    side: getPortSide(direction),
    offset: getPortOffset(direction),
    backgroundColor: '#9193a2ff',
    pathColor: '#f8fafc',
    borderColor: '#9193a2ff',
    disableConnectors: true,
    size: 20,
    visible: true,
  }));
}

// Configure ports based on node type (skip for existing nodes that already have ports)
function updateNodePorts(nodeType: string | undefined, obj: NodeModel, isAiAgent: boolean, isIfOrSwitchCondition: boolean) {
  if (!nodeType || nodeType !== "sticky") {
    // Only set ports if they don't already exist (for loaded nodes)
    const shouldSetPorts = !obj.ports || obj.ports.length === 0;

    if (shouldSetPorts) {
      if (isAiAgent) {
        // AI Agent with 5 ports
        obj.ports = [
          {
            id: "left-port",
            offset: { x: 0, y: 0.5 },
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.InConnect,
          },
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
          },
          {
            id: "bottom-left-port",
            offset: { x: 0.25, y: 1 },
            shape: "Square",
            height: 14,
            width: 14,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
            tooltip: { content: 'Chat Model' },
          },
          {
            id: "bottom-middle-port",
            offset: { x: 0.5, y: 1 },
            shape: "Square",
            height: 14,
            width: 14,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
            tooltip: { content: 'Memory' },
          },
          {
            id: "bottom-right-port",
            offset: { x: 0.75, y: 1 },
            shape: "Square",
            height: 14,
            width: 14,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
            tooltip: { content: 'Tools' },
          },
        ];
      } else if (isIfOrSwitchCondition) {
        // If or Switch Condition with 3 ports
        obj.ports = [
          {
            id: "left-port",
            offset: { x: 0, y: 0.5 },
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.InConnect,
          },
          {
            id: "right-top-port",
            offset: { x: 1, y: 0.3 },
            shape: "Circle",
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" }, // Green for true path
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
          },
          {
            id: "right-bottom-port",
            offset: { x: 1, y: 0.7 },
            shape: "Circle",
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" }, // Red for false path
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
          },
        ];
      } else if (nodeType === "trigger") {
        // Existing trigger ports setup
        obj.ports = [
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.Draw | PortConstraints.OutConnect,
          },
        ];
      } else {
        // Default action node ports
        obj.ports = [
          {
            id: "left-port",
            offset: { x: 0, y: 0.5 },
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.InConnect,
          },
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 20,
            width: 20,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
          },
        ];
      }
    }
  }

  // Add user handle metadata for connectable ports for later use
  const connectablePorts = getOutConnectDrawPorts(obj);
  if (connectablePorts.length > 0) {
    if (!obj.addInfo) obj.addInfo = {};
    (obj.addInfo as any).userHandlesFromPorts = connectablePorts.map(({ port, direction }) => ({
      portId: port.id,
      direction,
    }));
  }
}

// Set position for nodes, and apply the staggering effect to avoid overlapping
function updateNodePosition(obj: NodeModel, diagramRef: React.RefObject<DiagramComponent | null>) {
  if (!obj.offsetX || obj.offsetX === 0 || !obj.offsetY || obj.offsetY === 0) {
    const diagram = diagramRef.current as DiagramComponent;
    const baseX = diagram?.scrollSettings?.viewPortWidth != null
      ? diagram.scrollSettings.viewPortWidth / 3
      : 300;
    const baseY = diagram?.scrollSettings?.viewPortHeight != null
      ? diagram.scrollSettings.viewPortHeight / 4
      : 200;

    // Use stagger helper to compute next offset to avoid overlapping of nodes
    const { x, y, index } = getNextStaggeredOffset(diagram, baseX, baseY, {
      group: 'paletteNode',
      strategy: 'grid',
      stepX: 80 * 2, // add space of node width horizontally
      stepY: 80 * 2, // add space of node height vertically
      cols: 4,
      usePersistentIndex: true
    });

    obj.offsetX = x;
    obj.offsetY = y;

    // persist metadata so future calls continue the sequence
    applyStaggerMetadata(obj, 'paletteNode', index);
  }
}

// Sets the constraints for nodes
function updateNodeConstraints(obj: NodeModel, nodeType: string | undefined) {
  // Base constraints remain the same
  let baseConstraints = NodeConstraints.Default &
    ~NodeConstraints.Rotate &
    ~NodeConstraints.InConnect &
    ~NodeConstraints.OutConnect;

  // For sticky note node, don't hide the thumbs(this enables resizing for sticky notes)
  obj.constraints = nodeType === 'sticky'
    ? baseConstraints
    : (baseConstraints & ~NodeConstraints.Resize) | NodeConstraints.HideThumbs | NodeConstraints.ReadOnly;
}

// Set node size based on node type (preserve existing size for loaded nodes)
function updateNodeSize(isAiAgent: boolean, obj: NodeModel, nodeType: string | undefined) {
  if (isAiAgent) {
    if (!obj.width || obj.width === 0) obj.width = 160; // Larger for AI agent
    if (!obj.height || obj.height === 0) obj.height = 80;
  } else if (nodeType === 'sticky') {
    // For sticky notes, preserve existing size or set default
    if (!obj.width || obj.width === 0) obj.width = 200;
    if (!obj.height || obj.height === 0) obj.height = 120;
  } else {
    if (!obj.width || obj.width === 0) obj.width = 80;
    if (!obj.height || obj.height === 0) obj.height = 80;
  }
}

// Sets the node template for nodes
function updateNodeTemplates(nodeType: string | undefined, setUpStickyNote: (stickyNode: NodeModel) => void, obj: NodeModel) {
  if (nodeType === "sticky") {
    // For sticky notes render annotation template
    setUpStickyNote(obj);
  }
  else {
    // Set HTML template for all other nodes
    obj.shape = {
      type: "HTML",
    };
  }
}

// Handle sticky note editing
const handleStickyNoteEdit = (node: NodeModel) => {
  const preview = document.getElementById(`preview-${node.id}`);
  const editor = document.getElementById(`editor-${node.id}`) as HTMLTextAreaElement;
  const storedMarkdown = (node.addInfo as any)?.markdown || 'Double-click to edit\n\nYou can use **bold**, *italic*, `code`, and\n# Headers\n- Lists';

  if (preview && editor) {
    node.constraints = NodeConstraints.None;
    // Switch to edit mode
    preview.style.display = 'none';
    editor.style.display = 'block';
    editor.value = storedMarkdown;
    editor.focus();
    
    isStickyNoteEditing = true;

    // Prevent key bubbling for arrows, space, delete, etc.
    const keyDownBlocker = (e: KeyboardEvent) => {
      e.stopPropagation();
      // Prevent diagram actions for navigation, space, etc.
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ","Spacebar", "Delete", "Backspace", "Tab"].includes(e.key)
      ) {
        // Only block propagation so diagram/diagram shortcuts do NOT fire
        e.stopPropagation();
      }
    };
    editor.addEventListener('keydown', keyDownBlocker);

    // Handle blur event to save and switch back to preview
    const handleBlur = () => {
      const markdownContent = editor.value;
      const htmlContent = convertMarkdownToHtml(markdownContent);
      
      // Update preview content
      preview.innerHTML = htmlContent;
      
      // Switch back to preview mode
      editor.style.display = 'none';
      preview.style.display = 'block';
      
      // Save markdown content to node data
      if (!node.addInfo) node.addInfo = {};
      (node.addInfo as any).markdown = markdownContent;
      node.constraints =  
        NodeConstraints.Default &
        ~NodeConstraints.Rotate &
        ~NodeConstraints.InConnect &
        ~NodeConstraints.OutConnect;
      
      // Remove event listener
      editor.removeEventListener('blur', handleBlur);
      isStickyNoteEditing = false;
    };
    

    // Add blur event listener
    editor.addEventListener('blur', handleBlur);
    
    // Handle Escape key to cancel editing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        editor.blur();
        editor.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    editor.addEventListener('keydown', handleKeyDown);
  }
};
