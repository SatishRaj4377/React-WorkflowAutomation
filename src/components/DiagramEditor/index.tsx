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
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeDoubleClick,
  onDiagramRef,
  project,
  onDiagramChange,
  onAddStickyNote
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

  // Set the ZIndex of sticky nodes
  function setStickyNodeZIndex(nodeId: string) {
    debugger
    // Find the node-template element
    const nodeTemplate = document.querySelector(`.node-template[data-node-id="${nodeId}"]`);
    if (!nodeTemplate) return;

    // Traverse up to the parent with id ending in '_content_html_element'
    let parent = nodeTemplate.parentElement;
    while (parent && !parent.id.endsWith('_content_html_element')) {
      parent = parent.parentElement;
    }
    if (parent) {
      parent.style.zIndex = String(-100000);
    }
  }

  // HTML Templates for different node types
  const getNodeTemplate = (nodeConfig: NodeConfig, nodeId: string): string => {
    if (!nodeConfig || typeof nodeConfig !== 'object') {
      console.warn('Invalid nodeConfig provided to getNodeTemplate');
      return '<div>Invalid Node</div>';
    }

    const isStickyNode = nodeConfig.type === 'sticky';

    // Ports HTML
    let portsHtml = '';
    if (!isStickyNode) {
      if (nodeConfig.type === 'trigger') {
        portsHtml = `<div class="node-port-right"></div>`;
      } else {
        portsHtml = `
          <div class="node-port-left"></div>
          <div class="node-port-right"></div>
        `;
      }
    }

    // Node content
    let contentHtml = '';
    if (isStickyNode) {
      setTimeout(() => setStickyNodeZIndex(nodeId));
      contentHtml = `<div id="sticky-rte-${nodeId}" class="sticky-node-content"></div>`;
    } else {
      contentHtml = `
        <div class="node-img-content">
          <img src="${nodeConfig.iconUrl}" alt="${nodeConfig.name}" />
        </div>
      `;
    }

    return `
      <div class="node-template-container">
        <div class="node-template" data-node-id="${nodeId}">
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

    if (nodeConfig && typeof nodeConfig === "object") {
      obj.shape = {
        type: "HTML",
        content: getNodeTemplate(nodeConfig, obj.id as string),
      };
      
      let baseConstraints =
        NodeConstraints.Default &
        ~NodeConstraints.Rotate &
        ~NodeConstraints.InConnect &
        ~NodeConstraints.OutConnect;

      if (nodeType === 'sticky') {
        obj.constraints = baseConstraints;
      } else {
        obj.constraints = (baseConstraints & ~NodeConstraints.Resize) | NodeConstraints.HideThumbs | NodeConstraints.ReadOnly;
      }

      obj.width = obj.width || (nodeType === 'sticky' ? 200 : 80);
      obj.height = obj.height || (nodeType === 'sticky' ? 120 : 80);

      if (!obj.offsetX) {
        obj.offsetX = (diagramRef.current as any)?.scrollSettings.viewPortWidth / 2 || 300;
      }
      if (!obj.offsetY) {
        obj.offsetY = (diagramRef.current as any)?.scrollSettings.viewPortHeight / 2 || 200;
      }
    }

    // Set default ports for all nodes except sticky notes
    if (!nodeType || nodeType !== "sticky") {
      if (nodeType === "trigger") {
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
        historyChange={onDiagramChange}
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