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
  AnnotationConstraints,
  UserHandleModel,
  UserHandleEventsArgs,
  ConnectorConstraints
} from '@syncfusion/ej2-react-diagrams';
import { NodeConfig } from '../../types';
import './DiagramEditor.css';

interface DiagramEditorProps {
  onAddNode?: () => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onDiagramRef?: (ref: any) => void;
  project?: any;
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeDoubleClick,
  onDiagramRef,
  project
}) => {

  const diagramRef = useRef<DiagramComponent>(null);
  const [previousDiagramTool, setPreviousDiagramTool] = useState<DiagramTools>(DiagramTools.SingleSelect | DiagramTools.MultipleSelect);
  const [isPanning, setIsPanning] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const overviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const handleScrollChange = () => {
    setShowOverview(true);
    // Clear existing timeout
    if (overviewTimeoutRef.current) {
      clearTimeout(overviewTimeoutRef.current);
    }
    // Hide overview after 2 seconds of no scroll/pan activity
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

  // HTML Templates for different node types
  const getNodeTemplate = (nodeConfig: NodeConfig, nodeId: string): string => {
    // Validate nodeConfig parameter
    if (!nodeConfig || typeof nodeConfig !== 'object') {
      console.warn('Invalid nodeConfig provided to getNodeTemplate');
      return '<div>Invalid Node</div>';
    }

    const baseStyle = `
      width: 100%; 
      height: 100%; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid;
      color: white;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      pointer-events: none;
      user-select: none;
      position: relative;
    `;

    let gradient = 'linear-gradient(135deg, #ffffff, #f0f0f0)';
    let borderColor = '#9193a2ff';
    
    // Safely access nodeConfig.icon with fallback
    const icon = nodeConfig.icon || '❓';

    // Port styles
    const portStyle = `
      position: absolute;
      width: 12px;
      height: 12px;
      background-color: ${borderColor};
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
    `;

    const leftPortStyle = `${portStyle} left: -8px; border-radius: 2px;`;
    const rightPortStyle = `${portStyle} right: -8px; border-radius: 50%;`;

    // Check if it's a trigger node (only right port) or sticky note (no ports)
    const nodeType = nodeConfig.type;
    let portsHtml = '';
    
    if (nodeType !== 'sticky') {
      if (nodeType === 'trigger') {
        // Only right port for trigger nodes
        portsHtml = `<div style="${rightPortStyle}"></div>`;
      } else {
        // Both ports for regular nodes
        portsHtml = `
          <div style="${leftPortStyle}"></div>
          <div style="${rightPortStyle}"></div>
        `;
      }
    }
    
    return `
      <div class="node-template" data-node-id="${nodeId}" style="${baseStyle} background: ${gradient}; border-color: ${borderColor};">
        ${portsHtml}
        <div>
          <div style="font-size: 2.5rem;">${icon}</div>
        </div>
      </div>
    `;
  };

  // Get default styles for nodes
  const getNodeDefaults = (obj: NodeModel): NodeModel => {
    // Ensure obj and addInfo exist before accessing properties
    if (!obj) return obj;

    // Set HTML template based on node configuration
    if (
      obj.addInfo &&
      typeof obj.addInfo === "object" &&
      (obj.addInfo as any).nodeConfig
    ) {
      const nodeConfig = (obj.addInfo as any).nodeConfig as NodeConfig;
      if (nodeConfig && typeof nodeConfig === "object") {
        obj.shape = {
          type: "HTML",
          content: getNodeTemplate(nodeConfig, obj.id as string),
        };
      }
      obj.constraints = (NodeConstraints.Default & ~NodeConstraints.Rotate & ~NodeConstraints.Resize & ~NodeConstraints.InConnect & ~NodeConstraints.OutConnect) | NodeConstraints.HideThumbs;
      if (!obj.width) {
        obj.width = 80;
      }
      if (!obj.height) {
        obj.height = 80;
      }
      
      // Only set default position if not already set
      if (!obj.offsetX) {
        obj.offsetX = (diagramRef.current as any)?.scrollSettings.viewPortWidth / 2 || 300;
      }
      if (!obj.offsetY) {
        obj.offsetY = (diagramRef.current as any)?.scrollSettings.viewPortHeight / 2 || 200;
      }
      if (nodeConfig.type !== 'sticky') {
      obj.annotations = [
        {
          id: `${nodeConfig.id}-label`,
          content: nodeConfig.name,
          style: { color: 'Black', bold: true, textWrapping: 'NoWrap' },
          offset: { x: 0.5, y: 1 },
          margin: { top: 15 },
          constraints: AnnotationConstraints.ReadOnly & ~AnnotationConstraints.Select
        }
      ];
    }
    }

    // Set default ports for all nodes except sticky notes
    const addInfo = obj.addInfo as any;
    const nodeConfig = addInfo?.nodeConfig;
    const nodeType = nodeConfig?.type;
    if (!nodeType || nodeType !== "sticky") {
      if (nodeType == "trigger") {
        obj.ports = [
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 12,
            width: 12,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.Draw | PortConstraints.OutConnect,
          },
        ];
      } else {
        obj.ports = [
          {
            id: "left-port",
            offset: { x: 0, y: 0.5 },
            height: 12,
            width: 12,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.InConnect,
          },
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 12,
            width: 12,
            style: { fill: "transparent", strokeColor: "transparent" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
          },
        ];
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

    obj.type = 'Bezier';
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
        console.log(args);
        const position = args.event && typeof args.event === 'object' 
          ? {x: args.event.pageX, y: args.event.pageY} : { x: 300, y: 300 };
        addStickyNote(position);
        break;
      case 'lockWorkflow':
        console.log('Lock workflow');
        break;
      case 'autoAlign':
        autoAlignNodes();
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

  const addStickyNote = (position: { x: number; y: number }) => {
    // Validate position parameter
    if (!position || typeof position !== 'object' || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      position = { x: 300, y: 300 };
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
          icon: '📝',
          settings: { 
            general: { 
              color: '#fff59d', 
              text: 'Sticky Note' 
            },
            authentication: {},
            advanced: {}
          },
          disabled: false,
          position: position
        } as NodeConfig
      }
    };

    if (diagramRef.current) {
      diagramRef.current.add(stickyNote);
    }
  };

  const autoAlignNodes = () => {
    if (!diagramRef.current) {
      console.warn('Diagram reference is not available');
      return;
    }

    const nodes = diagramRef.current.nodes;
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
      diagramRef.current.dataBind();
    } catch (error) {
      console.error('Error during data binding:', error);
    }
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
        doubleClick={handleDoubleClick}
        selectionChange={handleSelectionChange}
        commandManager={getCommandManagerSettings()}
        selectedItems={{ userHandles: userHandles}}
        onUserHandleMouseDown={ handleUserHandleMouseDown }
        serializationSettings={{ preventDefaults: true }}
      >
        <Inject services={[
          UndoRedo,
          DataBinding,
          HierarchicalTree,
          DiagramContextMenu
        ]} />
      </DiagramComponent>

      {/* Overview Panel */}
      <div className='diagram-overview-container'
        style={{
          opacity: showOverview ? 1 : 0,
          visibility: showOverview ? 'visible' : 'hidden',
        }}
      >
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