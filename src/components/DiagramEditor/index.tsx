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
  ScrollSettingsModel
} from '@syncfusion/ej2-react-diagrams';
import { NodeConfig } from '../../types';
import './DiagramEditor.css';

interface DiagramEditorProps {
  onAddNode?: () => void;
  onNodeSelect: (nodeId: string | null) => void;
  nodes?: NodeModel[];
  connectors?: ConnectorModel[];
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeSelect,
  nodes: nodeFromPalette,
  connectors: connectorsFromPalette
}) => {

  const diagramRef = useRef<DiagramComponent>(null);
  const [previousDiagramTool, setPreviousDiagramTool] = useState<DiagramTools>(DiagramTools.SingleSelect | DiagramTools.MultipleSelect);
  const [isPanning, setIsPanning] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const overviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const getNodeTemplate = (nodeConfig: NodeConfig): string => {
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
    `;

    let gradient = 'linear-gradient(135deg, #ffffff, #f0f0f0)';
    let borderColor = '#d1d1d1';
    
    // Safely access nodeConfig.icon with fallback
    const icon = nodeConfig.icon || '❓';
   
    return `
      <div style="${baseStyle} background: ${gradient}; border-color: ${borderColor};">
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
          content: getNodeTemplate(nodeConfig),
        };
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
            style: { fill: "#d2cfcfff", strokeColor: "#d2cfcfff" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.Draw | PortConstraints.OutConnect,
            margin: { right: -14 },
          },
        ];
      } else {
        obj.ports = [
          {
            id: "left-port",
            offset: { x: 0, y: 0.5 },
            height: 12,
            width: 12,
            style: { fill: "#d2cfcfff", strokeColor: "#d2cfcfff" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.InConnect,
            margin: { left: -12 },
          },
          {
            id: "right-port",
            offset: { x: 1, y: 0.5 },
            shape: "Circle",
            height: 12,
            width: 12,
            style: { fill: "#d2cfcfff", strokeColor: "#d2cfcfff" },
            visibility: PortVisibility.Visible,
            constraints: PortConstraints.OutConnect | PortConstraints.Draw,
            margin: { right: -12 },
          },
        ];
      }
    }
    return obj;
  };

  // Get default styles for connectors
  const getConnectorDefaults = (obj: ConnectorModel): ConnectorModel => {
    debugger
    // Ensure obj exists before modifying it
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    obj.type = 'Bezier';
    obj.style = {
      strokeColor: '#b4b4b4ff',
      strokeWidth: 2,
    };
    obj.targetDecorator = {
      style: {
        fill: '#b4b4b4ff',
        strokeColor: '#b4b4b4ff',
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
  const handleSelectionChange = (args: any) => {
    // Add null/undefined checks for args and its properties
    if (!args || typeof args !== 'object') {
      onNodeSelect(null);
      return;
    }

    if (args.newValue && Array.isArray(args.newValue) && args.newValue.length > 0) {
      const selectedNode = args.newValue[0];
      if (selectedNode && typeof selectedNode === 'object' && selectedNode.id) {
        onNodeSelect(selectedNode.id);
      } else {
        onNodeSelect(null);
      }
    } else {
      onNodeSelect(null);
    }
  };

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
          ? {x: args.event.x, y: args.event.y} : { x: 300, y: 300 };
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
      width: 120,
      height: 120,
      offsetX: position.x,
      offsetY: position.y,
      zIndex: -1,
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
        nodes={nodeFromPalette || []}
        connectors={connectorsFromPalette || []}
        getNodeDefaults={getNodeDefaults}
        getConnectorDefaults={getConnectorDefaults}
        elementDraw={removeDisConnectedConnectors}
        snapSettings={snapSettings}
        scrollSettings={scrollSettings}
        contextMenuSettings={contextMenuSettings}
        selectionChange={handleSelectionChange}
        scrollChange={handleScrollChange}
        contextMenuClick={handleContextMenuClick}
        commandManager={getCommandManagerSettings()}
        backgroundColor="transparent"
        pageSettings={{
          background: {
            color: 'transparent',
          },
          showPageBreaks: false,
        }}
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