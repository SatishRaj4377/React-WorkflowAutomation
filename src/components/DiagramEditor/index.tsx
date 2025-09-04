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
  SelectorConstraints,
  ConnectorConstraints,
  Snapping,
  AnnotationConstraints,
} from '@syncfusion/ej2-react-diagrams';
import { DiagramSettings, NodeConfig } from '../../types';
import './DiagramEditor.css';
import { applyStaggerMetadata, getNextStaggeredOffset } from '../../helper/stagger';

interface DiagramEditorProps {
  onAddNode?: () => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onDiagramRef?: (ref: any) => void;
  project?: any;
  onDiagramChange?: (args: any) => void;
  onAddStickyNote?: (position: { x: number; y: number }) => void;
  onAutoAlignNodes?: () => void;
  onPortClick?: (nodeId: string, portId: string) => void;
  diagramSettings?: DiagramSettings;
}

  let isStickyNoteEditing = false;


const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onAddNode,
  onNodeDoubleClick,
  onDiagramRef,
  project,
  onDiagramChange,
  onAddStickyNote,
  onAutoAlignNodes,
  onPortClick,
  diagramSettings
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
  const [isLoadingDiagram, setIsLoadingDiagram] = useState(false);

  // User handles for Connectors
  let userHandles: UserHandleModel[] =  [
    {
      name: 'deleteConnector',
      pathData:
        'M0.97,3.04 L12.78,3.04 L12.78,12.21 C12.78,12.64,12.59,13,12.2,13.3 C11.82,13.6,11.35,13.75,10.8,13.75 L2.95,13.75 C2.4,13.75,1.93,13.6,1.55,13.3 C1.16,13,0.97,12.64,0.97,12.21 Z M4.43,0 L9.32,0 L10.34,0.75 L13.75,0.75 L13.75,2.29 L0,2.29 L0,0.75 L3.41,0.75 Z ',
      tooltip: { content: 'Delete' },
      offset: 0.5,
      backgroundColor: '#9193a2ff',
      pathColor: '#f8fafc',
      borderColor: '#9193a2ff',
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
        setIsLoadingDiagram(true);
        diagramRef.current.loadDiagram(project.workflowData.diagramString);
        setIsLoaded(true);
        // Small delay to ensure all nodes are processed
        setTimeout(() => setIsLoadingDiagram(false), 100);
      } catch (error) {
        console.error('Failed to load diagram:', error);
        setIsLoaded(true); // Set as loaded even if failed to prevent infinite loop
        setIsLoadingDiagram(false);
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

  // Grid and Snap Settings based on diagramSettings
  const getGridType = () => {
    if (!diagramSettings?.gridStyle || diagramSettings.gridStyle === 'none') return 'Lines';
    return diagramSettings.gridStyle === 'lines' ? 'Lines' : 'Dots';
  };
  const getGridColor = () => {
    if (diagramSettings?.gridStyle === 'none') return 'transparent';
    if (diagramSettings?.gridStyle === 'lines') return 'var(--grid-line-color)';
    return 'var(--grid-dotted-color)';
  };
  const getSnapConstraints = () => {
    if (!diagramSettings?.enableSnapping) return SnapConstraints.ShowLines;
    return SnapConstraints.SnapToObject | SnapConstraints.SnapToLines | SnapConstraints.ShowLines;
  };

  const snapSettings: SnapSettingsModel = {
    constraints: getSnapConstraints(),

    gridType: getGridType(),

    horizontalGridlines: { lineColor: getGridColor() } as GridlinesModel,
    verticalGridlines: { lineColor: getGridColor() } as GridlinesModel,

    snapObjectDistance: 5,
    snapLineColor: 'var(--secondary-color)',
    snapAngle: 5,
  };

    // Grid and Snap Settings
  const scrollSettings: ScrollSettingsModel = {
     scrollLimit: 'Infinity',
  };

  // Set up styles for sticky notes node (only for new nodes)
  const setUpStickyNoteStyles = (stickyNode: NodeModel, isNewNode: boolean = true) => {
    // Set minimum dimensions - always apply these
    stickyNode.minWidth = 160;
    stickyNode.minHeight = 80;
    
    // Preserve existing width/height if they exist (for loaded nodes)
    if (!stickyNode.width || stickyNode.width < 160) {
      stickyNode.width = 200;
    }
    if (!stickyNode.height || stickyNode.height < 80) {
      stickyNode.height = 120;
    }
    
    // Remove annotations for sticky notes since we're using HTML template
    stickyNode.annotations= [{ constraints: AnnotationConstraints.ReadOnly }]

    // render the sticky note behind all the nodes
    setTimeout(()=> {
      if (stickyNode.id){
        setStickyZIndex(stickyNode.id)
      }
    })
  }

  function setStickyZIndex(nodeId: string, zIndex = -10000) {
    const el = document.getElementById(`${nodeId}_content_html_element`);
    if (el) el.style.zIndex = zIndex.toString();
  }

  // Simple markdown to HTML converter
  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  };

  // Get sticky note template
  const getStickyNoteTemplate = (nodeId: string, nodeConfig: NodeConfig): string => {
    // Get stored markdown content from node data
    const node = diagramRef.current?.nodes?.find(n => n.id === nodeId);
    const storedMarkdown = (node?.addInfo as any)?.markdown || 'Double-click to edit\n\nYou can use **bold**, *italic*, `code`, and\n# Headers\n- Lists';
    const markdownHtml = convertMarkdownToHtml(storedMarkdown);
    
    return `
      <div class="sticky-note-container" data-node-id="${nodeId}">
        <div class="sticky-note-content">
          <div class="markdown-preview" id="preview-${nodeId}" style="display: block;">
            ${markdownHtml}
          </div>
          <textarea class="markdown-editor" 
            id="editor-${nodeId}" 
            style="display: none;"
            placeholder="Type your markdown here..."
          />
        </div>
      </div>
    `;
  };

  // HTML Templates for different node types
  const getNodeTemplate = (nodeConfig: NodeConfig, nodeId: string): string => {
    if (!nodeConfig || typeof nodeConfig !== 'object') {
      console.warn('Invalid nodeConfig provided to getNodeTemplate');
      return '<div>Invalid Node</div>';
    }

    // Handle sticky note template
    if (nodeConfig.type === 'sticky') {
      return getStickyNoteTemplate(nodeId, nodeConfig);
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
        <div class="node-name-bar">${nodeConfig.name ? nodeConfig.name : ''}</div>
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
    
    // For sticky notes during loading, treat ALL sticky notes as existing to preserve their data
    const isExistingStickyNote = nodeType === "sticky" && (
      isLoadingDiagram || // If we're loading, preserve all sticky note data
      (obj.annotations && obj.annotations.length > 0 && 
       obj.annotations.some(ann => 
         ann.content && 
         ann.content.trim() !== '' && 
         ann.content !== 'Type your content here...' && 
         ann.content !== 'Note'
       ))
    );
    
    if (nodeConfig && typeof nodeConfig === "object") {
      // Check if the ID contains specific node types
      const isIfCondition = nodeType === 'condition' || nodeId.includes('if-condition');
      const isAiAgent = nodeId.includes('ai-agent');
      
      if (nodeType === "sticky") {
        // For sticky notes, preserve existing content when loading
        setUpStickyNoteStyles(obj, !isExistingStickyNote);
      }
      
      // Set HTML template for all nodes
      obj.shape = {
        type: "HTML",
        content: getNodeTemplate(nodeConfig, obj.id as string),
      };
      
      
      // Set node size based on node type (preserve existing size for loaded nodes)
      if (isAiAgent) {
        if (!obj.width || obj.width === 0) obj.width = 160;  // Larger for AI agent
        if (!obj.height || obj.height === 0) obj.height = 80;
      } else if (isIfCondition) {
        if (!obj.width || obj.width === 0) obj.width = 80;  // Width for condition node
        if (!obj.height || obj.height === 0) obj.height = 80;
      } else if (nodeType === 'sticky') {
        // For sticky notes, preserve existing size or set default
        if (!obj.width || obj.width === 0) obj.width = 200;
        if (!obj.height || obj.height === 0) obj.height = 120;
      } else {
        if (!obj.width || obj.width === 0) obj.width = 80;
        if (!obj.height || obj.height === 0) obj.height = 80;
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

      // Set position if not already set (only for new nodes)
      if (!obj.offsetX || obj.offsetX === 0 || !obj.offsetY || obj.offsetY === 0) {
        const diagram = diagramRef.current as DiagramComponent;
        const baseX =
          diagram?.scrollSettings?.viewPortWidth != null
            ? diagram.scrollSettings.viewPortWidth / 3
            : 300;
        const baseY =
          diagram?.scrollSettings?.viewPortHeight != null
            ? diagram.scrollSettings.viewPortHeight / 4
            : 200;

        // Use stagger helper to compute next offset to avoid overlapping of nodes
        const { x, y, index } = getNextStaggeredOffset(diagram, baseX, baseY, {
          group: 'paletteNode',
          strategy: 'grid',
          stepX: obj.width * 2,
          stepY: obj.height * 2,
          cols: 3,
          usePersistentIndex: true
        });

        obj.offsetX = x;
        obj.offsetY = y;

        // Optional: persist metadata so future calls continue the sequence
        applyStaggerMetadata(obj, 'paletteNode', index);
      }

      // Configure ports based on node type (skip for existing nodes that already have ports)
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

  // on adding the connector, update the stroke dash and make it not able to disconnect
  const handleCollectionChange = (args: any) => {
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
    if (args && args.source && args.source.id) {
      const nodeId = args.source.id;
      const node = args.source;
      const nodeConfig = (node.addInfo as any)?.nodeConfig as NodeConfig;
      
      // Handle sticky note double-click
      if (nodeConfig?.type === 'sticky') {
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

  // Handle sticky note editing
  const handleStickyNoteEdit = (node: NodeModel) => {
    const preview = document.getElementById(`preview-${node.id}`);
    const editor = document.getElementById(`editor-${node.id}`) as HTMLTextAreaElement;
    const storedMarkdown = (node.addInfo as any)?.markdown || "";

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
            ? {x: args.event.pageX, y: args.event.pageY, fromMouse: true} : { x: 300, y: 300, fromMouse: false };
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

  // Update diagram when settings change
  useEffect(() => {
    if (diagramRef.current && diagramSettings) {
      const diagram = diagramRef.current;
      
      // Reuse all existing functions
      const gridType = getGridType();
      const gridColor = getGridColor();
      const constraints = getSnapConstraints();
      
      // Apply all changes at once
      diagram.snapSettings = {
        ...diagram.snapSettings,
        gridType,
        constraints,
        horizontalGridlines: { ...diagram.snapSettings.horizontalGridlines, lineColor: gridColor },
        verticalGridlines: { ...diagram.snapSettings.verticalGridlines, lineColor: gridColor }
      };
    }
  }, [diagramSettings]);

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
        collectionChange={handleCollectionChange}
        snapSettings={snapSettings}
        scrollSettings={scrollSettings}
        contextMenuSettings={contextMenuSettings}
        scrollChange={handleScrollChange}
        contextMenuClick={handleContextMenuClick}
        click={handleClick}
        doubleClick={handleDoubleClick}
        selectionChange={handleSelectionChange}
        commandManager={getCommandManagerSettings()}
        selectedItems={{ userHandles: userHandles, constraints: SelectorConstraints.All & ~SelectorConstraints.ToolTip}}
        onUserHandleMouseDown={ handleUserHandleMouseDown }
        historyChange={onDiagramChange}
      >
        <Inject services={[
          UndoRedo,
          DataBinding,
          HierarchicalTree,
          DiagramContextMenu,
          Snapping
        ]} />
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