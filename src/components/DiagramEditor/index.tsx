import React, { useRef, useEffect, useState } from 'react';
import {
  DiagramComponent,
  SnapSettingsModel,
  OverviewComponent,
  GridlinesModel,
  Inject,
  ConnectorModel,
  NodeModel,
  SnapConstraints,
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
  ScrollSettingsModel,
  UserHandleModel,
  UserHandleEventsArgs,
} from '@syncfusion/ej2-react-diagrams';
import { NodeConfig } from '../../types';
import './DiagramEditor.css';

interface DiagramEditorProps {
  onAddNode?: () => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onDiagramRef?: (ref: any) => void;
  project?: any;
  onDiagramChange?: (args: any) => void;
  onAddStickyNote?: (position: { x: number; y: number }) => void;
  onAutoAlignNodes?: () => void;
  onPortClick?: (nodeId: string, portId: string) => void; 
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeDoubleClick,
  onDiagramRef,
  project,
  onDiagramChange,
  onAddStickyNote,
  onAutoAlignNodes,
  onPortClick
}) => {

  const diagramRef = useRef<DiagramComponent>(null);
  const [previousDiagramTool, setPreviousDiagramTool] = useState<DiagramTools>(DiagramTools.SingleSelect | DiagramTools.MultipleSelect);
  const [isPanning, setIsPanning] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const overviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [zoomPercentage, setZoomPercentage] = useState<number>(100);
  const [showZoomPercentage, setShowZoomPercentage] = useState<boolean>(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [previousZoom, setPreviousZoom] = useState<number>(100);

  // User handles for Connectors
  let userHandles: UserHandleModel[] =  [
    {
      name: 'deleteConnector',
      pathData:
        'M0.97,3.04 L12.78,3.04 L12.78,12.21 C12.78,12.64,12.59,13,12.2,13.3 C11.82,13.6,11.35,13.75,10.8,13.75 L2.95,13.75 C2.4,13.75,1.93,13.6,1.55,13.3 C1.16,13,0.97,12.64,0.97,12.21 Z M4.43,0 L9.32,0 L10.34,0.75 L13.75,0.75 L13.75,2.29 L0,2.29 L0,0.75 L3.41,0.75 Z ',
      tooltip: { content: 'Delete' },
      offset: 0.5,
      backgroundColor: '#effdff',
      pathColor: '#656565ff',
      borderColor: '#333333ff',
      disableNodes: true,
    }
  ];

  const handleUserHandleMouseDown = (args: UserHandleEventsArgs) => {
    if (args.element){
      (diagramRef.current as any).remove();
    }
  };

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
    
    // Hide overview after 2 seconds
    overviewTimeoutRef.current = setTimeout(() => {
      setShowOverview(false);
    }, 2000);
  };

  // Grid and Snap Settings
  const snapSettings: SnapSettingsModel = {
    constraints: SnapConstraints.All,
    gridType: 'Dots',
    horizontalGridlines: {
      lineColor: '#a6b4caff',
    } as GridlinesModel,
    verticalGridlines: {
      lineColor: '#a6b4caff',
    } as GridlinesModel,
  };

    // Grid and Snap Settings
  const scrollSettings: ScrollSettingsModel = {
     scrollLimit: 'Infinity',
  };

  // Set up styles for sticky notes node
  const setUpStickyNoteStyles = (stickyNode: NodeModel) => {
    stickyNode.minWidth = 160;
    stickyNode.minHeight = 80;
    stickyNode.style= {
      fill: '#e7f8ffff',
      strokeColor: '#778a9fff',
      strokeWidth: 2,
      strokeDashArray: '10 4',
      opacity: 0.7,
    };
    stickyNode.annotations= [
      {
        content: 'Type your content here...',
        horizontalAlignment: 'Left',
        verticalAlignment: 'Top',
        offset: {x: 0, y: 0},
        margin: {left: 20, top: 60, bottom: 0, right: 0},
        width: 160,
        style: {
          color: '#585b5fff',
          fontSize: 14,
          textAlign: 'Left',
          textWrapping: 'Wrap',
          textOverflow: 'Ellipsis',
        },  
      },
      {
        content: "Note",
        horizontalAlignment: 'Left',
        verticalAlignment: 'Top',
        margin: {left: 20, top: 20, bottom: 0, right: 0},
        offset: {x: 0, y: 0},
        style: {
          color: '#142336ff',
          fontSize: 20,
          bold: true,
        },
      },
    ]
  }

  // HTML Templates for different node types
  const getNodeTemplate = (nodeConfig: NodeConfig, nodeId: string): string => {
    if (!nodeConfig || typeof nodeConfig !== 'object') {
      console.warn('Invalid nodeConfig provided to getNodeTemplate');
      return '<div>Invalid Node</div>';
    }

    // Determine ports HTML based on node type
    let portsHtml = '';
    
    // Check if the ID contains specific node types
    const isIfCondition = nodeConfig.type === 'condition' || 
                          (nodeConfig.id && nodeConfig.id.includes('if-condition'));
    
    const isAiAgent = nodeConfig.id && nodeConfig.id.includes('ai-agent');
    
    // Special case for If node with two output ports
    if (isIfCondition) {
      portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right-top true-port"></div>
        <div class="node-port-right-bottom false-port"></div>
      `;
    } 
    // Special case for AI Agent with multiple ports
    else if (isAiAgent) {
      portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right"></div>
        <div class="node-port-bottom-left"></div>
        <div class="node-port-bottom-middle"></div>
        <div class="node-port-bottom-right"></div>
      `;
    }
    // Default case for trigger nodes
    else if (nodeConfig.type === 'trigger') {
      portsHtml = `<div class="node-port-right"></div>`;
    } 
    // Default case for action nodes
    else {
      portsHtml = `
        <div class="node-port-left"></div>
        <div class="node-port-right"></div>
      `;
    }

    // Node content based on type
    let contentHtml = `
      <div class="node-img-content">
        <img src="${nodeConfig.iconUrl}" alt="${nodeConfig.name}" />
      </div>
    `;

    // Add a special class for different node types
    const nodeTypeClass = 
      isIfCondition ? 'condition-node' : 
      isAiAgent ? 'ai-agent-node' : '';

    return `
      <div class="node-template-container">
        <div class="node-template ${nodeTypeClass}" data-node-id="${nodeId}">
          ${portsHtml}
          ${contentHtml}
        </div>
        ${nodeConfig.type !== 'sticky' ? `<div class="node-name-bar">${nodeConfig.name ? nodeConfig.name : ''}</div>` : ''}
      </div>
    `;
  };

  // Get default styles for nodes
  const getNodeDefaults = (obj: NodeModel): NodeModel => {
    if (!obj) return obj;

    const addInfo = obj.addInfo as any;
    const nodeConfig = addInfo?.nodeConfig as NodeConfig | undefined;
    const nodeType = nodeConfig?.type;
    const nodeId = nodeConfig?.id || '';
    
    if (nodeConfig && typeof nodeConfig === "object") {
      // Check if the ID contains specific node types
      const isIfCondition = nodeType === 'condition' || nodeId.includes('if-condition');
      const isAiAgent = nodeId.includes('ai-agent');
      
      if (nodeType === "sticky") {
        setUpStickyNoteStyles(obj);
      }
      else {
        obj.shape = {
          type: "HTML",
          content: getNodeTemplate(nodeConfig, obj.id as string),
        };
      }
      
      // Set node size based on node type
      if (isAiAgent) {
        obj.width = 160;  // Larger for AI agent
        obj.height = 80;
      } else if (isIfCondition) {
        obj.width = 80;  // Width for condition node
        obj.height = 80;
      } else if (nodeType === 'sticky') {
        obj.width = 200;
        obj.height = 120;
      } else {
        obj.width = 80;
        obj.height = 80;
      }

      // Base constraints remain the same
      let baseConstraints =
        NodeConstraints.Default &
        ~NodeConstraints.Rotate &
        ~NodeConstraints.InConnect &
        ~NodeConstraints.OutConnect;

      obj.constraints = nodeType === 'sticky' 
        ? baseConstraints 
        : (baseConstraints & ~NodeConstraints.Resize) | NodeConstraints.HideThumbs | NodeConstraints.ReadOnly;

      // Set position if not already set
      if (!obj.offsetX) {
        obj.offsetX = (diagramRef.current as any)?.scrollSettings.viewPortWidth / 2 || 300;
      }
      if (!obj.offsetY) {
        obj.offsetY = (diagramRef.current as any)?.scrollSettings.viewPortHeight / 2 || 200;
      }

      // Configure ports based on node type
      if (!nodeType || nodeType !== "sticky") {
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
        } else if (isIfCondition) {
          // If Condition with 3 ports
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

    return obj;
  };

  // Get default styles for connectors
  const getConnectorDefaults = (obj: ConnectorModel): ConnectorModel => {
    // Ensure obj exists before modifying it
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    obj.zIndex =  1000;
    obj.type = 'Bezier';
    obj.segments= [{ type: 'Bezier' }];
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

  // Removes the disconnected connector
  const removeDisConnectedConnectors = (args: any) => {
    if (args.state === 'Completed' && args.objectType === 'Connector') {
      const connector = args.source;
      if (
        connector &&
        (connector.sourceID === '' || connector.targetID === '')
      ) {
        (diagramRef.current as any).remove(connector);
      }
    }
  };

  // Context Menu Items for the diagram
  const contextMenuSettings = {
    show: true,
    items: [
      {
        text: 'Add Node',
        id: 'addNode',
        iconCss: 'e-icons e-plus'
      },
      {
        text: 'Add Sticky Note',
        id: 'addSticky',
        iconCss: 'e-icons e-add-notes'
      },
      {
        text: 'Lock Workflow',
        id: 'lockWorkflow',
        iconCss: 'e-icons e-lock'
      },
      {
        text: 'Auto Align',
        id: 'autoAlign',
        iconCss: 'e-icons e-ai-chat'
      },
            {
        text: 'Select All',
        id: 'selectAll',
        iconCss: 'e-icons e-select-all'
      }
    ],
    showCustomMenuOnly: true,
  };

  // Event Handlers
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
        } else {
          console.warn(`Could not find template for node: ${nodeId}`);
        }
      });
    }
  };


  const handleClick = (args: any) => {
    // Check if clicked element is a port
    if (args && args.element && args.element.constructor.name === 'PointPort' && args.actualObject) {
      const portId = args.element.id;
      const nodeId = args.actualObject.id;
      
      if (onPortClick) {
        onPortClick(nodeId, portId);
      }
    }
  };

  const handleDoubleClick = (args: any) => {
    if (args && args.source && args.source.id && onNodeDoubleClick) {
      const nodeId = args.source.id;
      setSelectedNodeIds([nodeId]);
      updateNodeSelection([nodeId]);
      onNodeDoubleClick(nodeId);
    }
  };

  const handleSelectionChange = (args: any) => {
    if (args && args.newValue && args.newValue.length > 0) {
      const selectedNodeIds = args.newValue.map((item: any) => item.id);
      setSelectedNodeIds(selectedNodeIds);
      updateNodeSelection(selectedNodeIds);
    } else {
      // No selection
      setSelectedNodeIds([]);
      updateNodeSelection(null);
    }
  };

  // Update useEffect to handle selection updates when nodes change
  useEffect(() => {
    if (selectedNodeIds.length > 0) {
      setTimeout(() => {
        updateNodeSelection(selectedNodeIds);
      }, 100);
    }
  }, [selectedNodeIds]);

  const handleContextMenuClick = (args: any) => {
    // Add null/undefined checks for args and its properties
    if (!args || typeof args !== 'object' || !args.item || typeof args.item !== 'object') {
      console.warn('Invalid context menu click arguments');
      return;
    }

    const itemId = args.item.id;
    if (!itemId) {
      return;
    }

    switch (itemId) {
      case 'addNode':
        if (onAddNode){
          onAddNode();
        }
        break;
      case 'selectAll':
        if (diagramRef.current) {
          diagramRef.current.selectAll();
        }
        break;
      case 'addSticky':
        if (onAddStickyNote){
          const position = args.event && typeof args.event === 'object' 
            ? {x: args.event.pageX, y: args.event.pageY} : { x: 300, y: 300 };
          onAddStickyNote(position);
        }
        break;
      case 'lockWorkflow':
        console.log('Lock workflow');
        break;
      case 'autoAlign':
        if (onAutoAlignNodes){
          onAutoAlignNodes();
        }
        break;
      default:
        console.warn(`Unknown context menu item: ${itemId}`);
        break;
    }
  };

  const getCommandManagerSettings = () => {
    const commandManager: CommandManagerModel = {
      commands: [
        {
          name: 'spacePan',
          canExecute: () => {
            return diagramRef.current != null && !isPanning;
          },
          execute: () => {
            if (diagramRef.current && !isPanning) {
              setPreviousDiagramTool(diagramRef.current.tool);
              diagramRef.current.tool = DiagramTools.ZoomPan;
              setIsPanning(true);
            }
          },
          gesture: { 
            key: Keys.Space,
            keyModifiers: KeyModifiers.None
          }
        }
      ]
    };
    return commandManager;
  };



  useEffect(() => {
    if (diagramRef.current) {
      diagramRef.current.tool = DiagramTools.Default;
    }
  }, []);

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

  useEffect(() => {
    return () => {
        if (overviewTimeoutRef.current) {
          clearTimeout(overviewTimeoutRef.current);
        }
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
      };
  }, []);

  return (
    <div className="diagram-editor-container">
      <DiagramComponent
        id="workflow-diagram"
        ref={diagramRef}
        width="100%"
        height="100%"
        nodes={[]}
        connectors={[]}
        getNodeDefaults={getNodeDefaults}
        getConnectorDefaults={getConnectorDefaults}
        elementDraw={removeDisConnectedConnectors}
        snapSettings={snapSettings}
        scrollSettings={scrollSettings}
        contextMenuSettings={contextMenuSettings}
        scrollChange={handleScrollChange}
        contextMenuClick={handleContextMenuClick}
        click={handleClick}
        doubleClick={handleDoubleClick}
        selectionChange={handleSelectionChange}
        commandManager={getCommandManagerSettings()}
        selectedItems={{ userHandles: userHandles}}
        onUserHandleMouseDown={ handleUserHandleMouseDown }
        historyChange={onDiagramChange}
      >
        <Inject services={[
          UndoRedo,
          DataBinding,
          HierarchicalTree,
          DiagramContextMenu
        ]} />
      </DiagramComponent>

      {/* Overview Panel with integrated zoom percentage */}
      <div className='diagram-overview-container'
        style={{
          opacity: showOverview ? 1 : 0,
          visibility: showOverview ? 'visible' : 'hidden',
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